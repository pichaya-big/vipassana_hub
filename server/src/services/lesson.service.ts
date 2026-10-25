// Creating, editing and publishing lessons (admin and teacher side).
import { ObjectId } from "mongodb";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../errors/app-errors.js";
import * as lessonModel from "../models/lesson.model.js";
import type { LessonDocument, StoredLesson, Track } from "../models/lesson.model.js";
import type { PublicUser } from "../models/user.model.js";
import { validateLessonInput, type LessonFields } from "../validators/lesson.validator.js";
import type { FieldErrors } from "../validators/registration.validator.js";

export interface LessonAdminView {
  id: string;
  track: Track;
  order: number;
  title: string;
  summary: string;
  body: string;
  videoUrl: string;
  pretest: LessonDocument["pretest"];
  posttest: LessonDocument["posttest"];
  passingScore: number;
  status: string;
  version: number;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}

// Full view including answer keys. Only used by staff, never by learners.
function toAdminView(lesson: StoredLesson): LessonAdminView {
  const { _id, createdBy, updatedBy, ...rest } = lesson;
  return { id: _id.toString(), createdBy: createdBy.toString(), updatedBy: updatedBy.toString(), ...rest };
}

// Publishing needs more than saving. A draft can be incomplete; a published lesson cannot.
export function publishProblems(
  lesson: Pick<LessonDocument, "track" | "body" | "videoUrl" | "pretest" | "posttest" | "title">,
): FieldErrors {
  const errors: FieldErrors = {};
  if (!lesson.title.trim()) errors.title = "ต้องมีชื่อบทเรียน";
  if (lesson.track === "reading" && !lesson.body.trim()) errors.body = "บทเรียนแบบเนื้อหาต้องมีเนื้อหา";
  if (lesson.track === "video" && !lesson.videoUrl.trim()) errors.videoUrl = "บทเรียนแบบวิดีโอต้องมีลิงก์วิดีโอ";
  if (lesson.pretest.length === 0) errors.pretest = "ต้องมีแบบทดสอบก่อนเรียนอย่างน้อยหนึ่งข้อ";
  if (lesson.posttest.length === 0) errors.posttest = "ต้องมีแบบทดสอบหลังเรียนอย่างน้อยหนึ่งข้อ";
  return errors;
}

// Teachers may publish only what they created. Admins may publish anything.
function assertCanPublish(actor: PublicUser, lesson: StoredLesson): void {
  if (actor.role === "admin") return;
  if (lesson.createdBy.equals(actor._id)) return;
  throw new ForbiddenError("ผู้สอนเผยแพร่ได้เฉพาะบทเรียนที่ตัวเองสร้าง");
}

async function loadOrThrow(id: string): Promise<StoredLesson> {
  const lesson = await lessonModel.findLessonById(id);
  if (!lesson) throw new NotFoundError("ไม่พบบทเรียนนี้");
  return lesson;
}

// A track and order can hold one active lesson at a time
async function assertSlotFree(fields: Pick<LessonFields, "track" | "order">, selfId?: ObjectId): Promise<void> {
  const clash = await lessonModel.findActiveUnit(fields.track, fields.order, selfId);
  if (clash) throw new ConflictError(`ลำดับที่ ${fields.order} ของ${fields.track === "reading" ? "เนื้อหา" : "วิดีโอ"} มีบทเรียนแล้ว`);
}

export async function listLessons(): Promise<LessonAdminView[]> {
  const lessons = await lessonModel.findAllLessons();
  return lessons.map(toAdminView);
}

export async function getLesson(id: string): Promise<LessonAdminView> {
  return toAdminView(await loadOrThrow(id));
}

export async function createLesson(actor: PublicUser, raw: Record<string, unknown>): Promise<LessonAdminView> {
  const { errors, value } = validateLessonInput(raw, "create");
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
  const fields = value as LessonFields;

  await assertSlotFree(fields);

  const now = new Date();
  const id = await lessonModel.insertLesson({
    ...fields,
    summary: fields.summary ?? "",
    body: fields.body ?? "",
    videoUrl: fields.videoUrl ?? "",
    status: "draft",
    version: 1,
    createdBy: actor._id,
    updatedBy: actor._id,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  });
  return getLesson(id.toString());
}

// Edits need the version the editor loaded. If someone else saved in between, the save is refused.
// Editing a published lesson applies at once. The learners' pass state is kept.
export async function updateLesson(actor: PublicUser, id: string, raw: Record<string, unknown>): Promise<LessonAdminView> {
  const lesson = await loadOrThrow(id);

  if (typeof raw.version !== "number") throw new ValidationError({ version: "ต้องส่งเวอร์ชันที่โหลดมาด้วย" });
  const { errors, value } = validateLessonInput(raw, "update");
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);

  const merged = { ...lesson, ...value };
  if (value.track !== undefined || value.order !== undefined) {
    await assertSlotFree(merged, lesson._id);
  }
  // A published lesson must still pass the publish checks after the edit
  if (lesson.status === "published") {
    const problems = publishProblems(merged);
    if (Object.keys(problems).length > 0) throw new ValidationError(problems, "การแก้ไขทำให้บทเรียนไม่ผ่านเงื่อนไขการเผยแพร่");
  }

  const saved = await lessonModel.updateLessonIfVersion(lesson._id, raw.version, { ...value, updatedBy: actor._id });
  if (!saved) throw new ConflictError("มีการแก้ไขจากผู้อื่นแล้ว กรุณาโหลดบทเรียนใหม่");
  return getLesson(id);
}

export async function publishLesson(actor: PublicUser, id: string): Promise<LessonAdminView> {
  const lesson = await loadOrThrow(id);
  assertCanPublish(actor, lesson);

  const problems = publishProblems(lesson);
  // Learners can only reach lesson N after lesson N-1 is published and passed, so N-1 must be published
  if (lesson.order > 1 && !(await lessonModel.findPublishedUnit(lesson.track, lesson.order - 1))) {
    problems.order = `ต้องเผยแพร่บทที่ ${lesson.order - 1} ก่อน`;
  }
  if (Object.keys(problems).length > 0) throw new ValidationError(problems, "บทเรียนยังไม่พร้อมเผยแพร่");

  const saved = await lessonModel.updateLessonIfVersion(lesson._id, lesson.version, {
    status: "published",
    publishedAt: new Date(),
    updatedBy: actor._id,
  });
  if (!saved) throw new ConflictError("มีการแก้ไขจากผู้อื่นแล้ว กรุณาโหลดบทเรียนใหม่");
  return getLesson(id);
}

export async function unpublishLesson(actor: PublicUser, id: string): Promise<LessonAdminView> {
  const lesson = await loadOrThrow(id);
  assertCanPublish(actor, lesson);

  const saved = await lessonModel.updateLessonIfVersion(lesson._id, lesson.version, {
    status: "draft",
    updatedBy: actor._id,
  });
  if (!saved) throw new ConflictError("มีการแก้ไขจากผู้อื่นแล้ว กรุณาโหลดบทเรียนใหม่");
  return getLesson(id);
}
