// What learners see and do: unit unlocking, pre-test, content, post-test.
// Rules (agreed with the product owner):
//   - Two tracks run side by side: "reading" and "video". Progress is separate for each.
//   - Each track is numbered from 1 with no upper limit. Unit 1 is open from the start; unit n opens when unit n-1 is passed.
//   - Pre-test is required before the content. It has no pass mark.
//   - Post-test must reach the lesson's passing score. Retakes are unlimited and every attempt is kept.
import { ObjectId } from "mongodb";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../errors/app-errors.js";
import { TRACKS, type Question, type StoredLesson, type Track } from "../models/lesson.model.js";
import * as lessonModel from "../models/lesson.model.js";
import { validateAnswers } from "../validators/lesson.validator.js";

interface LessonProgressView {
  preDone: boolean;
  contentCompleted: boolean;
  passed: boolean;
}

// Questions without answer keys
function questionsForLearner(questions: Question[]) {
  return questions.map((q) => ({ stem: q.stem, options: q.options }));
}

function gradeAnswers(questions: Question[], answers: number[]): { correct: number; total: number; results: boolean[] } {
  const results = questions.map((q, i) => answers[i] === q.correctIndex);
  return { correct: results.filter(Boolean).length, total: questions.length, results };
}

// A unit is open when it is order 1, or when the unit before it has been passed
async function isUnlocked(userId: ObjectId, lesson: StoredLesson): Promise<boolean> {
  if (lesson.order === 1) return true;
  const previous = await lessonModel.findPublishedUnit(lesson.track, lesson.order - 1);
  if (!previous) return false;
  const prev = await lessonModel.findProgress(userId, previous._id);
  return prev?.passed === true;
}

// Loads a published lesson the learner is allowed to open
async function loadOpenLesson(userId: ObjectId, id: string): Promise<StoredLesson> {
  const lesson = await lessonModel.findLessonById(id);
  if (!lesson || lesson.status !== "published") throw new NotFoundError("ไม่พบบทเรียนนี้");
  if (!(await isUnlocked(userId, lesson))) throw new ForbiddenError("ต้องผ่านบทก่อนหน้าในรูปแบบนี้ก่อน");
  return lesson;
}

export interface CourseUnitView {
  id: string;
  order: number;
  title: string;
  summary: string;
  unlocked: boolean;
  progress: LessonProgressView;
}

// Both tracks with their published units, each ordered from 1.
export async function getCourses(userId: ObjectId) {
  const [published, progresses] = await Promise.all([
    lessonModel.findPublishedLessons(),
    lessonModel.findProgressForUser(userId),
  ]);
  const progressByLesson = new Map(progresses.map((p) => [p.lessonId.toString(), p]));
  const byKey = new Map(published.map((l) => [`${l.track}-${l.order}`, l]));

  const unitView = (lesson: StoredLesson): CourseUnitView => {
    const prog = progressByLesson.get(lesson._id.toString());
    const prev = byKey.get(`${lesson.track}-${lesson.order - 1}`);
    const previousPassed = prev ? progressByLesson.get(prev._id.toString())?.passed === true : false;
    return {
      id: lesson._id.toString(),
      order: lesson.order,
      title: lesson.title,
      summary: lesson.summary,
      unlocked: lesson.order === 1 || previousPassed,
      progress: {
        preDone: !!prog?.pretest,
        contentCompleted: prog?.contentCompleted ?? false,
        passed: prog?.passed ?? false,
      },
    };
  };

  const tracks = Object.fromEntries(
    TRACKS.map((track: Track) => [
      track,
      published
        .filter((l) => l.track === track)
        .sort((a, b) => a.order - b.order)
        .map(unitView),
    ]),
  ) as Record<Track, CourseUnitView[]>;
  return { tracks };
}

// The lesson page. Content stays hidden until the pre-test is done, and the post-test stays
// hidden until the content is finished.
export async function getLessonForLearner(userId: ObjectId, id: string) {
  const lesson = await loadOpenLesson(userId, id);
  const prog = await lessonModel.findProgress(userId, lesson._id);
  const preDone = !!prog?.pretest;
  const contentCompleted = prog?.contentCompleted ?? false;
  // Progress documents are created by the pre-test, so older fields may be missing until the first post-test
  const attempts = prog?.posttestAttempts ?? [];
  const bestScore = attempts.reduce((best, a) => Math.max(best, a.score), -1);

  return {
    id: lesson._id.toString(),
    track: lesson.track,
    order: lesson.order,
    title: lesson.title,
    summary: lesson.summary,
    passingScore: lesson.passingScore,
    watchThreshold: lesson.watchThreshold,
    progress: {
      preDone,
      contentCompleted,
      passed: prog?.passed ?? false,
      bestPosttestScore: bestScore < 0 ? null : bestScore,
      watchedPercent: prog?.watchedPercent ?? 0,
      lastPositionSec: prog?.lastPositionSec ?? 0,
    },
    pretest: preDone ? null : questionsForLearner(lesson.pretest),
    content: preDone ? { body: lesson.body, videoUrl: lesson.videoUrl } : null,
    posttest: preDone && contentCompleted ? questionsForLearner(lesson.posttest) : null,
  };
}

export async function submitPretest(userId: ObjectId, id: string, rawAnswers: unknown) {
  const lesson = await loadOpenLesson(userId, id);
  const prog = await lessonModel.findProgress(userId, lesson._id);
  if (prog?.pretest) throw new ConflictError("ทำแบบทดสอบก่อนเรียนไปแล้ว");

  const { errors, answers } = validateAnswers(rawAnswers, lesson.pretest.length);
  if (!answers) throw new ValidationError(errors);

  const { correct, total } = gradeAnswers(lesson.pretest, answers);
  const now = new Date();
  await lessonModel.updateProgress(userId, lesson._id, {
    $set: { pretest: { correct, total, takenAt: now }, updatedAt: now },
  });
  // The answers are not revealed here. The pre-test only sets a baseline.
  return { correct, total };
}

export async function completeContent(userId: ObjectId, id: string) {
  const lesson = await loadOpenLesson(userId, id);
  const prog = await lessonModel.findProgress(userId, lesson._id);
  if (!prog?.pretest) throw new ForbiddenError("ต้องทำแบบทดสอบก่อนเรียนก่อน");

  // Video lessons count as finished only after the learner has watched enough of the video
  if (lesson.track === "video" && (prog.watchedPercent ?? 0) < lesson.watchThreshold) {
    throw new ForbiddenError(`ต้องดูวิดีโอให้ถึง ${lesson.watchThreshold}% ก่อนจึงจะเรียนจบได้`);
  }

  await lessonModel.updateProgress(userId, lesson._id, {
    $set: { contentCompleted: true, updatedAt: new Date() },
  });
  return { contentCompleted: true };
}

export async function submitPosttest(userId: ObjectId, id: string, rawAnswers: unknown) {
  const lesson = await loadOpenLesson(userId, id);
  const prog = await lessonModel.findProgress(userId, lesson._id);
  if (!prog?.pretest) throw new ForbiddenError("ต้องทำแบบทดสอบก่อนเรียนก่อน");
  if (!prog.contentCompleted) throw new ForbiddenError("ต้องเรียนเนื้อหาให้จบก่อนทำแบบทดสอบหลังเรียน");

  const { errors, answers } = validateAnswers(rawAnswers, lesson.posttest.length);
  if (!answers) throw new ValidationError(errors);

  const { correct, total, results } = gradeAnswers(lesson.posttest, answers);
  const score = total === 0 ? 0 : Math.round((correct / total) * 100);
  const passed = score >= lesson.passingScore;
  const now = new Date();

  const update: Parameters<typeof lessonModel.updateProgress>[2] = {
    $push: { posttestAttempts: { score, correct, total, passed, takenAt: now } },
    $set: { updatedAt: now },
  };
  if (passed && !prog.passed) {
    update.$set = { ...update.$set, passed: true, passedAt: now };
  }
  await lessonModel.updateProgress(userId, lesson._id, update);

  // Results with explanations, so the learner can see what to review
  return {
    score,
    correct,
    total,
    passed,
    passingScore: lesson.passingScore,
    results: lesson.posttest.map((q, i) => ({
      correct: results[i],
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    })),
  };
}

// Records how much of a video the learner has watched and where they stopped. The watched share only goes up,
// so seeking back does not lower it. The position is replaced each time, so the learner resumes where they left off.
// The browser reports both, so this is a convenience check, not proof of watching.
export async function reportWatch(userId: ObjectId, id: string, rawPercent: unknown, rawPosition?: unknown) {
  const lesson = await loadOpenLesson(userId, id);
  if (lesson.track !== "video") throw new ValidationError({ track: "เฉพาะบทเรียนแบบวิดีโอที่มีความคืบหน้าการดู" });
  if (!Number.isInteger(rawPercent) || (rawPercent as number) < 0 || (rawPercent as number) > 100) {
    throw new ValidationError({ percent: "ค่าต้องเป็นจำนวนเต็ม 0 ถึง 100" });
  }
  const hasPosition = rawPosition !== undefined;
  if (hasPosition && (!Number.isInteger(rawPosition) || (rawPosition as number) < 0 || (rawPosition as number) > 86400)) {
    throw new ValidationError({ position: "ตำแหน่งต้องเป็นจำนวนวินาทีตั้งแต่ 0 ขึ้นไป" });
  }

  await lessonModel.updateProgress(userId, lesson._id, {
    $max: { watchedPercent: rawPercent as number },
    $set: { updatedAt: new Date(), ...(hasPosition ? { lastPositionSec: rawPosition as number } : {}) },
  });
  const prog = await lessonModel.findProgress(userId, lesson._id);
  return {
    watchedPercent: prog?.watchedPercent ?? 0,
    lastPositionSec: prog?.lastPositionSec ?? 0,
    watchThreshold: lesson.watchThreshold,
  };
}
