// Shapes returned by the teacher endpoints (see server/src/services/progress-summary.ts and admin.service.ts)

export type LessonStatus = "ยังไม่เริ่ม" | "ทำก่อนเรียนแล้ว" | "กำลังเรียน" | "รอสอบหลังเรียน" | "ผ่านแล้ว";

export interface LessonProgressRow {
  lessonId: string;
  track: "reading" | "video";
  order: number;
  title: string;
  percent: number;
  status: LessonStatus;
  pretest: { correct: number; total: number } | null;
  watchedPercent: number | null;
  watchThreshold: number | null;
  contentCompleted: boolean;
  posttest: { attempts: number; best: number | null; last: number | null };
  passed: boolean;
  updatedAt: string | null;
}

// One row in the learner list on the admin page
export interface LearnerRow {
  id: string;
  firstName: string;
  lastName: string;
  educationLevel: string;
  hasPracticed: boolean;
  createdAt: string;
  lessonsPassed: number;
  lessonsTotal: number;
  percent: number;
  lastActiveAt: string | null;
}

export interface LearnerProgressDetail {
  learner: {
    id: string;
    firstName: string;
    lastName: string;
    educationLevel: string;
    hasPracticed: boolean;
    createdAt: string;
    lastActiveAt: string | null;
  };
  summary: { lessonsPassed: number; lessonsTotal: number; percent: number };
  tracks: { reading: LessonProgressRow[]; video: LessonProgressRow[] };
  finalExam: { attempts: number; bestScore: number | null; passed: boolean };
}

// One line describing a lesson's numbers, in Thai
export function describeLesson(row: LessonProgressRow): string {
  const parts: string[] = [];
  if (row.pretest) parts.push(`ก่อนเรียน ${row.pretest.correct}/${row.pretest.total}`);
  else parts.push("ยังไม่ทำก่อนเรียน");
  if (row.track === "video") {
    parts.push(`ดูวิดีโอ ${row.watchedPercent ?? 0}% (เกณฑ์ ${row.watchThreshold ?? 0}%)`);
  }
  if (row.contentCompleted) parts.push("เรียนจบแล้ว");
  if (row.posttest.attempts > 0) {
    parts.push(`หลังเรียนสูงสุด ${row.posttest.best ?? 0}% (${row.posttest.attempts} ครั้ง)`);
  }
  return parts.join(" · ");
}

export function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "ยังไม่เคยเรียน";
}
