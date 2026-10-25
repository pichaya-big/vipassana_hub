// Types and labels for lesson management. Field names match the API responses in server/src/services/lesson.service.ts.

export type Track = "reading" | "video";
export type LessonStatus = "draft" | "published" | "archived";

// Answer keys are included here because only teachers and admins call the admin endpoints
export interface Question {
  stem: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LessonAdmin {
  id: string;
  track: Track;
  order: number;
  title: string;
  summary: string;
  body: string;
  videoUrl: string;
  pretest: Question[];
  posttest: Question[];
  passingScore: number;
  watchThreshold: number;
  status: LessonStatus;
  version: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

// What the editor form holds. The id and status come from the server.
export interface LessonForm {
  track: Track;
  order: number;
  title: string;
  summary: string;
  body: string;
  videoUrl: string;
  passingScore: number;
  watchThreshold: number;
  pretest: Question[];
  posttest: Question[];
}

export const TRACK_LABELS: Record<Track, string> = {
  reading: "เนื้อหา (บทที่)",
  video: "วิดีโอ (ตอนที่)",
};

export const STATUS_LABELS: Record<LessonStatus, string> = {
  draft: "ร่าง",
  published: "เผยแพร่แล้ว",
  archived: "เก็บถาวร",
};

export const CHOICE_LABELS = ["ก", "ข", "ค", "ง"];

export const MAX_QUESTIONS = 50;

// Must match MAX_VIDEO_MB on the server
export const MAX_VIDEO_MB = 50;

export function emptyQuestion(): Question {
  return { stem: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" };
}

export const EMPTY_FORM: LessonForm = {
  track: "reading",
  order: 1,
  title: "",
  summary: "",
  body: "",
  videoUrl: "",
  passingScore: 70,
  watchThreshold: 80,
  pretest: [],
  posttest: [],
};

export function formFrom(lesson: LessonAdmin): LessonForm {
  return {
    track: lesson.track,
    order: lesson.order,
    title: lesson.title,
    summary: lesson.summary,
    body: lesson.body,
    videoUrl: lesson.videoUrl,
    passingScore: lesson.passingScore,
    watchThreshold: lesson.watchThreshold,
    pretest: lesson.pretest,
    posttest: lesson.posttest,
  };
}
