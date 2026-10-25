import { TRACKS, type Question, type Track } from "../models/lesson.model.js";
import type { FieldErrors } from "./registration.validator.js";

export const MAX_TITLE = 200;
export const MAX_SUMMARY = 1000;
export const MAX_BODY = 50000;
export const MAX_QUESTIONS = 50;
export const DEFAULT_PASSING_SCORE = 70;
// Address of an uploaded video, e.g. /api/media/videos/<uuid>.mp4
export const UPLOADED_VIDEO_PATH = /^\/api\/media\/videos\/[0-9a-f-]{36}\.mp4$/;
export const DEFAULT_WATCH_THRESHOLD = 80;

export interface LessonFields {
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
}

function readText(raw: Record<string, unknown>, key: keyof LessonFields, max: number, errors: FieldErrors, required: boolean) {
  const value = raw[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    errors[key] = "ต้องเป็นข้อความ";
    return undefined;
  }
  const text = value.trim();
  if (required && !text) errors[key] = "กรุณากรอกข้อมูลนี้";
  else if (text.length > max) errors[key] = `ไม่เกิน ${max} ตัวอักษร`;
  return text;
}

// Checks each question: a stem, exactly 4 non-empty options, and a correct answer between 0 and 3
export function validateQuestions(raw: unknown, field: string, errors: FieldErrors): Question[] | undefined {
  if (!Array.isArray(raw)) {
    errors[field] = "ต้องเป็นรายการคำถาม";
    return undefined;
  }
  if (raw.length > MAX_QUESTIONS) {
    errors[field] = `ไม่เกิน ${MAX_QUESTIONS} ข้อ`;
    return undefined;
  }

  return raw.map((item, i) => {
    const q = (item ?? {}) as Record<string, unknown>;
    const stem = typeof q.stem === "string" ? q.stem.trim() : "";
    const options = Array.isArray(q.options) ? q.options.map((o) => (typeof o === "string" ? o.trim() : "")) : [];
    const correctIndex = q.correctIndex;
    const explanation = typeof q.explanation === "string" ? q.explanation.trim() : "";

    if (!stem) errors[`${field}[${i}].stem`] = "กรุณากรอกคำถาม";
    if (options.length !== 4 || options.some((o) => !o)) {
      errors[`${field}[${i}].options`] = "ต้องมีตัวเลือก 4 ข้อ และทุกข้อต้องไม่ว่าง";
    }
    if (!Number.isInteger(correctIndex) || (correctIndex as number) < 0 || (correctIndex as number) > 3) {
      errors[`${field}[${i}].correctIndex`] = "เฉลยต้องเป็น 0 ถึง 3";
    }
    return { stem, options, correctIndex: correctIndex as number, explanation };
  });
}

// mode "create" requires every core field. mode "update" validates only the fields that were sent.
export function validateLessonInput(
  raw: Record<string, unknown>,
  mode: "create" | "update",
): { errors: FieldErrors; value: Partial<LessonFields> } {
  const errors: FieldErrors = {};
  const value: Partial<LessonFields> = {};
  const required = mode === "create";

  if (required || raw.track !== undefined) {
    if ((TRACKS as readonly unknown[]).includes(raw.track)) value.track = raw.track as Track;
    else errors.track = "รูปแบบการเรียนต้องเป็น reading หรือ video";
  }
  if (required || raw.order !== undefined) {
    if (Number.isInteger(raw.order) && (raw.order as number) >= 1) value.order = raw.order as number;
    else errors.order = "ลำดับต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป";
  }

  const title = readText(raw, "title", MAX_TITLE, errors, required);
  if (title !== undefined) value.title = title;
  const summary = readText(raw, "summary", MAX_SUMMARY, errors, false);
  if (summary !== undefined) value.summary = summary;
  const body = readText(raw, "body", MAX_BODY, errors, false);
  if (body !== undefined) value.body = body;

  const videoUrl = readText(raw, "videoUrl", 2000, errors, false);
  if (videoUrl !== undefined) {
    if (videoUrl && !/^https?:\/\//.test(videoUrl) && !UPLOADED_VIDEO_PATH.test(videoUrl)) {
      errors.videoUrl = "ลิงก์วิดีโอต้องขึ้นต้นด้วย http:// หรือ https:// หรืออัปโหลดไฟล์ MP4";
    }
    value.videoUrl = videoUrl;
  }

  if (required || raw.pretest !== undefined) {
    const pretest = validateQuestions(raw.pretest ?? [], "pretest", errors);
    if (pretest) value.pretest = pretest;
  }
  if (required || raw.posttest !== undefined) {
    const posttest = validateQuestions(raw.posttest ?? [], "posttest", errors);
    if (posttest) value.posttest = posttest;
  }

  if (required || raw.passingScore !== undefined) {
    const score = raw.passingScore ?? DEFAULT_PASSING_SCORE;
    if (Number.isInteger(score) && (score as number) >= 0 && (score as number) <= 100) value.passingScore = score as number;
    else errors.passingScore = "คะแนนผ่านต้องเป็นจำนวนเต็ม 0 ถึง 100";
  }

  if (required || raw.watchThreshold !== undefined) {
    const threshold = raw.watchThreshold ?? DEFAULT_WATCH_THRESHOLD;
    if (Number.isInteger(threshold) && (threshold as number) >= 1 && (threshold as number) <= 100) value.watchThreshold = threshold as number;
    else errors.watchThreshold = "เกณฑ์การดูวิดีโอต้องเป็นจำนวนเต็ม 1 ถึง 100";
  }

  return { errors, value };
}

// Learner answers: one number per question, each between 0 and 3
export function validateAnswers(raw: unknown, questionCount: number): { errors: FieldErrors; answers?: number[] } {
  if (!Array.isArray(raw) || raw.length !== questionCount) {
    return { errors: { answers: `ต้องตอบให้ครบ ${questionCount} ข้อ` } };
  }
  if (raw.some((a) => !Number.isInteger(a) || (a as number) < 0 || (a as number) > 3)) {
    return { errors: { answers: "คำตอบแต่ละข้อต้องเป็น 0 ถึง 3" } };
  }
  return { errors: {}, answers: raw as number[] };
}
