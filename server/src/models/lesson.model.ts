// Database access for lessons and learner progress. No validation or rules here.
import { ObjectId, type Collection, type Filter, type UpdateFilter, type WithId } from "mongodb";
import { getDB } from "../config/database.js";

// Two learning formats run side by side. Each track is numbered from 1 with no upper limit.
export const TRACKS = ["reading", "video"] as const;
export type Track = (typeof TRACKS)[number];

export type LessonStatus = "draft" | "published" | "archived";

export interface Question {
  stem: string;
  options: string[]; // always 4
  correctIndex: number; // 0 to 3. Never sent to learners before they answer.
  explanation: string;
}

export interface LessonDocument {
  track: Track;
  order: number; // 1, 2, 3 ... within a track
  title: string;
  summary: string;
  body: string; // reading content
  videoUrl: string; // video track content
  pretest: Question[];
  posttest: Question[];
  passingScore: number; // percent, 0 to 100
  watchThreshold: number; // video track only: percent of the video the learner must watch, 1 to 100
  status: LessonStatus;
  version: number; // bumped on every save, used to detect concurrent edits
  createdBy: ObjectId;
  updatedBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}

export type StoredLesson = WithId<LessonDocument>;

export interface PretestResult {
  correct: number;
  total: number;
  takenAt: Date;
}

export interface PosttestAttempt {
  score: number; // percent
  correct: number;
  total: number;
  passed: boolean;
  takenAt: Date;
}

// One document per learner per lesson
export interface ProgressDocument {
  userId: ObjectId;
  lessonId: ObjectId;
  pretest: PretestResult | null;
  contentCompleted: boolean;
  watchedPercent: number; // highest share of the video reported as watched
  lastPositionSec: number; // where the learner last stopped, in seconds, so playback can resume there
  posttestAttempts: PosttestAttempt[];
  passed: boolean;
  passedAt: Date | null;
  updatedAt: Date;
}

export type StoredProgress = WithId<ProgressDocument>;

const LESSONS = "lessons";
const PROGRESS = "lesson_progress";

function lessons(): Collection<LessonDocument> {
  return getDB().collection<LessonDocument>(LESSONS);
}

function progress(): Collection<ProgressDocument> {
  return getDB().collection<ProgressDocument>(PROGRESS);
}

const SORT_ORDER = { track: 1, order: 1 } as const;

export async function ensureLessonIndexes(): Promise<void> {
  // One lesson per slot (track, order). A plain unique index is used because MongoDB
  // partial indexes do not support $ne. When "archived" is added, this needs a separate slot field.
  await lessons().createIndex({ track: 1, order: 1 }, { name: "unit_slot_unique", unique: true });
  await progress().createIndex({ userId: 1, lessonId: 1 }, { name: "progress_unique", unique: true });
}

export async function insertLesson(doc: LessonDocument): Promise<ObjectId> {
  const result = await lessons().insertOne(doc);
  return result.insertedId;
}

export async function findLessonById(id: string): Promise<StoredLesson | null> {
  if (!ObjectId.isValid(id)) return null;
  return lessons().findOne({ _id: new ObjectId(id) });
}

export function findAllLessons(): Promise<StoredLesson[]> {
  return lessons().find({ status: { $ne: "archived" } }).sort(SORT_ORDER).toArray();
}

export function findPublishedLessons(): Promise<StoredLesson[]> {
  return lessons().find({ status: "published" }).sort(SORT_ORDER).toArray();
}

// The active (not archived) lesson in one slot, if there is one
export function findActiveUnit(track: Track, order: number, excludeId?: ObjectId): Promise<StoredLesson | null> {
  const filter: Filter<LessonDocument> = { track, order, status: { $ne: "archived" } };
  if (excludeId) filter._id = { $ne: excludeId };
  return lessons().findOne(filter);
}

export function findPublishedUnit(track: Track, order: number): Promise<StoredLesson | null> {
  return lessons().findOne({ track, order, status: "published" });
}

// Stores the uploaded video's address. Uploads do not change the version, so an open editor stays valid.
export async function setLessonVideo(id: ObjectId, videoUrl: string, updatedBy: ObjectId): Promise<void> {
  await lessons().updateOne({ _id: id }, { $set: { videoUrl, updatedBy, updatedAt: new Date() } });
}

// Writes only if the version still matches, so two editors cannot silently overwrite each other
export async function updateLessonIfVersion(
  id: ObjectId,
  expectedVersion: number,
  set: Partial<LessonDocument>,
): Promise<boolean> {
  const result = await lessons().updateOne(
    { _id: id, version: expectedVersion },
    { $set: { ...set, updatedAt: new Date() }, $inc: { version: 1 } },
  );
  return result.matchedCount === 1;
}

export function findProgress(userId: ObjectId, lessonId: ObjectId): Promise<StoredProgress | null> {
  return progress().findOne({ userId, lessonId });
}

export function findProgressForUsers(userIds: ObjectId[]): Promise<StoredProgress[]> {
  return progress().find({ userId: { $in: userIds } }).toArray();
}

export function findProgressForUser(userId: ObjectId): Promise<StoredProgress[]> {
  return progress().find({ userId }).toArray();
}

// Creates the progress document on first use, then applies the change
export async function updateProgress(
  userId: ObjectId,
  lessonId: ObjectId,
  update: UpdateFilter<ProgressDocument>,
): Promise<void> {
  await progress().updateOne({ userId, lessonId }, update, { upsert: true });
}
