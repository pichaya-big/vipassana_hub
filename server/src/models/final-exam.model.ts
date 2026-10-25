// Stored attempts at the course-wide final exam. The answer keys stay here, never in a response.
import { ObjectId, type Collection, type WithId } from "mongodb";
import { getDB } from "../config/database.js";

export interface FinalExamQuestion {
  lessonId: ObjectId;
  stem: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface FinalExamAttempt {
  userId: ObjectId;
  questions: FinalExamQuestion[];
  answers: number[] | null;
  score: number | null; // percent, set when submitted
  passed: boolean;
  createdAt: Date;
  submittedAt: Date | null;
}

export type StoredAttempt = WithId<FinalExamAttempt>;

const ATTEMPTS = "final_exam_attempts";

function attempts(): Collection<FinalExamAttempt> {
  return getDB().collection<FinalExamAttempt>(ATTEMPTS);
}

export async function ensureFinalExamIndexes(): Promise<void> {
  await attempts().createIndex({ userId: 1, createdAt: -1 }, { name: "attempts_by_user" });
}

export async function insertAttempt(doc: FinalExamAttempt): Promise<ObjectId> {
  const result = await attempts().insertOne(doc);
  return result.insertedId;
}

export function findAttempt(userId: ObjectId, id: string): Promise<StoredAttempt | null> {
  if (!ObjectId.isValid(id)) return Promise.resolve(null);
  return attempts().findOne({ _id: new ObjectId(id), userId });
}

export function findAttemptsForUser(userId: ObjectId): Promise<StoredAttempt[]> {
  return attempts().find({ userId }).toArray();
}

export async function markSubmitted(id: ObjectId, answers: number[], score: number, passed: boolean): Promise<void> {
  await attempts().updateOne({ _id: id }, { $set: { answers, score, passed, submittedAt: new Date() } });
}
