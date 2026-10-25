// Database access only. No validation, hashing or business rules here.
import { ObjectId, type Collection, type WithId } from "mongodb";
import { getDB } from "../config/database.js";
import { DEFAULT_ROLE, normalizeRole, type Role } from "../authz/roles.js";
import type { EducationLevel } from "../validators/registration.validator.js";

export interface UserDocument {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  educationLevel: EducationLevel;
  role: Role;
  meditation: {
    hasPracticed: boolean;
    experienceDetail: string;
  };
  pdpa: {
    accepted: true;
    acceptedAt: Date;
    version: string;
  };
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export type StoredUser = WithId<UserDocument>;

// Safe to send to the browser: no password hash
export type PublicUser = Omit<StoredUser, "passwordHash">;

const COLLECTION = "users";

function users(): Collection<UserDocument> {
  return getDB().collection<UserDocument>(COLLECTION);
}

export function toPublicUser(doc: StoredUser): PublicUser {
  const { passwordHash: _omit, ...rest } = doc;
  return { ...rest, role: normalizeRole(rest.role) };
}

// Unique indexes stop the same email or phone from being stored twice, even under concurrent requests
export async function ensureUserIndexes(): Promise<void> {
  await users().createIndexes([
    { key: { email: 1 }, name: "email_unique", unique: true },
    { key: { phone: 1 }, name: "phone_unique", unique: true },
  ]);
}

// Gives older accounts (created before roles existed) the default role. Safe to run on every start.
export async function backfillMissingRoles(): Promise<number> {
  const result = await users().updateMany({ role: { $exists: false } }, { $set: { role: DEFAULT_ROLE } });
  return result.modifiedCount;
}

export async function insertUser(doc: UserDocument): Promise<ObjectId> {
  const result = await users().insertOne(doc);
  return result.insertedId;
}

export function findUserByEmail(email: string): Promise<StoredUser | null> {
  return users().findOne({ email });
}

export function findUserByPhone(phone: string): Promise<StoredUser | null> {
  return users().findOne({ phone });
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  if (!ObjectId.isValid(id)) return null;
  return users().findOne({ _id: new ObjectId(id) });
}

export function findUsers(limit: number): Promise<StoredUser[]> {
  return users().find({}).sort({ createdAt: -1 }).limit(limit).toArray();
}

export function findUsersByRole(role: Role): Promise<StoredUser[]> {
  return users().find({ role }).sort({ createdAt: -1 }).toArray();
}

// Returns true if a user matched (even when the role did not change)
export async function updateUserRole(id: string, role: Role): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const result = await users().updateOne({ _id: new ObjectId(id) }, { $set: { role, updatedAt: new Date() } });
  return result.matchedCount === 1;
}

export async function updateRoleByEmail(email: string, role: Role): Promise<boolean> {
  const result = await users().updateOne({ email: email.toLowerCase() }, { $set: { role, updatedAt: new Date() } });
  return result.matchedCount === 1;
}
