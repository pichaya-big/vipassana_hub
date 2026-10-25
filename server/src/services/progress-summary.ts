// Turns one learner's progress on one lesson into numbers and a status a teacher can read.
// Weights: pre-test 20%, content 40%, post-test 40%. Pure functions, so they are easy to test.
import type { StoredLesson, StoredProgress } from "../models/lesson.model.js";

export const WEIGHT = { pretest: 20, content: 40, posttest: 40 } as const;

export type LessonStatus = "ยังไม่เริ่ม" | "ทำก่อนเรียนแล้ว" | "กำลังเรียน" | "รอสอบหลังเรียน" | "ผ่านแล้ว";

export interface LessonProgressSummary {
  lessonId: string;
  track: StoredLesson["track"];
  order: number;
  title: string;
  percent: number;
  status: LessonStatus;
  pretest: { correct: number; total: number } | null;
  watchedPercent: number | null; // video track only
  watchThreshold: number | null; // video track only
  contentCompleted: boolean;
  posttest: { attempts: number; best: number | null; last: number | null };
  passed: boolean;
  updatedAt: string | null;
}

export function lessonProgress(lesson: StoredLesson, progress: StoredProgress | null): LessonProgressSummary {
  const pretestDone = !!progress?.pretest;
  const contentCompleted = progress?.contentCompleted ?? false;
  const passed = progress?.passed ?? false;
  const isVideo = lesson.track === "video";
  const watched = progress?.watchedPercent ?? 0;

  // Video: the share of the required watch reached, capped at 100%, until the lesson is finished
  let contentShare = 0;
  if (contentCompleted) contentShare = 1;
  else if (isVideo && lesson.watchThreshold > 0) contentShare = Math.min(watched / lesson.watchThreshold, 1);

  const attempts = progress?.posttestAttempts ?? [];
  const scores = attempts.map((a) => a.score);

  const percent = Math.round(
    (pretestDone ? WEIGHT.pretest : 0) + contentShare * WEIGHT.content + (passed ? WEIGHT.posttest : 0),
  );

  let status: LessonStatus;
  if (passed) status = "ผ่านแล้ว";
  else if (contentCompleted) status = "รอสอบหลังเรียน";
  else if (pretestDone && (!isVideo || watched > 0)) status = "กำลังเรียน";
  else if (pretestDone) status = "ทำก่อนเรียนแล้ว";
  else status = "ยังไม่เริ่ม";

  return {
    lessonId: lesson._id.toString(),
    track: lesson.track,
    order: lesson.order,
    title: lesson.title,
    percent,
    status,
    pretest: progress?.pretest ? { correct: progress.pretest.correct, total: progress.pretest.total } : null,
    watchedPercent: isVideo ? watched : null,
    watchThreshold: isVideo ? lesson.watchThreshold : null,
    contentCompleted,
    posttest: {
      attempts: attempts.length,
      best: scores.length ? Math.max(...scores) : null,
      last: scores.length ? scores[scores.length - 1] : null,
    },
    passed,
    updatedAt: progress?.updatedAt ? progress.updatedAt.toISOString() : null,
  };
}
