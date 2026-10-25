// Course progress for a learner, and the course-wide final exam.
// Rules:
//   - The course is complete when every published lesson in BOTH tracks is passed,
//     and each track has at least one lesson.
//   - The final exam opens only after the course is complete.
//   - It draws up to FINAL_EXAM_QUESTIONS questions at random from all published post-tests.
//   - Passing score: FINAL_EXAM_PASS percent. Retakes are allowed until the learner passes.
import { ObjectId } from "mongodb";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../errors/app-errors.js";
import * as examModel from "../models/final-exam.model.js";
import * as lessonModel from "../models/lesson.model.js";
import { TRACKS, type Track } from "../models/lesson.model.js";
import { validateAnswers } from "../validators/lesson.validator.js";

export const FINAL_EXAM_QUESTIONS = 20;
export const FINAL_EXAM_PASS = 70;

export interface TrackProgress {
  track: Track;
  total: number;
  passed: number;
}

export interface CourseProgress {
  tracks: TrackProgress[];
  completed: boolean;
  finalExam: { unlocked: boolean; passed: boolean; bestScore: number | null; attempts: number; passingScore: number };
}

export async function getCourseProgress(userId: ObjectId): Promise<CourseProgress> {
  const [lessons, progresses, attempts] = await Promise.all([
    lessonModel.findPublishedLessons(),
    lessonModel.findProgressForUser(userId),
    examModel.findAttemptsForUser(userId),
  ]);
  const passedLessons = new Set(progresses.filter((p) => p.passed).map((p) => p.lessonId.toString()));

  const tracks: TrackProgress[] = TRACKS.map((track) => {
    const units = lessons.filter((l) => l.track === track);
    return { track, total: units.length, passed: units.filter((u) => passedLessons.has(u._id.toString())).length };
  });
  const completed = tracks.every((t) => t.total > 0 && t.passed === t.total);

  const scored = attempts.filter((a) => a.score !== null).map((a) => a.score as number);
  const bestScore = scored.length ? Math.max(...scored) : null;
  const passed = attempts.some((a) => a.passed);

  return {
    tracks,
    completed,
    finalExam: { unlocked: completed, passed, bestScore, attempts: scored.length, passingScore: FINAL_EXAM_PASS },
  };
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Starts a new attempt. The answer keys are stored with the attempt and are not returned.
export async function startFinalExam(userId: ObjectId): Promise<{ attemptId: string; questions: { stem: string; options: string[] }[] }> {
  const progress = await getCourseProgress(userId);
  if (!progress.completed) throw new ForbiddenError("ต้องเรียนให้ครบทุกบทในทั้งสองรูปแบบก่อน จึงจะทำแบบทดสอบรวมได้");
  if (progress.finalExam.passed) throw new ConflictError("คุณสอบแบบทดสอบรวมผ่านแล้ว");

  const lessons = await lessonModel.findPublishedLessons();
  const pool = lessons.flatMap((l) =>
    l.posttest.map((q) => ({
      lessonId: l._id,
      stem: q.stem,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    })),
  );
  if (pool.length === 0) throw new ConflictError("ยังไม่มีข้อสอบในระบบ");

  const picked = shuffle(pool).slice(0, FINAL_EXAM_QUESTIONS);
  const id = await examModel.insertAttempt({
    userId,
    questions: picked,
    answers: null,
    score: null,
    passed: false,
    createdAt: new Date(),
    submittedAt: null,
  });
  return {
    attemptId: id.toString(),
    questions: picked.map((q) => ({ stem: q.stem, options: q.options })),
  };
}

export async function submitFinalExam(userId: ObjectId, attemptId: string, rawAnswers: unknown) {
  const attempt = await examModel.findAttempt(userId, attemptId);
  if (!attempt) throw new NotFoundError("ไม่พบการทำแบบทดสอบนี้");
  if (attempt.submittedAt) throw new ConflictError("ส่งคำตอบของการทำนี้ไปแล้ว");

  const { errors, answers } = validateAnswers(rawAnswers, attempt.questions.length);
  if (!answers) throw new ValidationError(errors);

  const results = attempt.questions.map((q, i) => answers[i] === q.correctIndex);
  const correct = results.filter(Boolean).length;
  const total = attempt.questions.length;
  const score = total === 0 ? 0 : Math.round((correct / total) * 100);
  const passed = score >= FINAL_EXAM_PASS;

  await examModel.markSubmitted(attempt._id, answers, score, passed);

  return {
    score,
    correct,
    total,
    passed,
    passingScore: FINAL_EXAM_PASS,
    results: attempt.questions.map((q, i) => ({
      correct: results[i],
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    })),
  };
}
