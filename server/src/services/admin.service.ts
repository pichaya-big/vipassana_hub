// Admin and teacher features: listing accounts and learners, changing roles.
import { ObjectId } from "mongodb";
import { logger } from "../config/logger.js";
import { isRole, type Role } from "../authz/roles.js";
import { NotFoundError, ForbiddenError, ValidationError } from "../errors/app-errors.js";
import * as userModel from "../models/user.model.js";
import * as lessonModel from "../models/lesson.model.js";
import * as examModel from "../models/final-exam.model.js";
import { lessonProgress, type LessonProgressSummary } from "./progress-summary.js";
import type { PublicUser, StoredUser } from "../models/user.model.js";

const USER_LIST_LIMIT = 200;

// What an admin sees about an account (no password hash)
export interface AdminUserView {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  createdAt: Date;
}

// What a teacher sees about a learner. Contact details are left out on purpose.
export interface LearnerView {
  id: string;
  firstName: string;
  lastName: string;
  educationLevel: string;
  hasPracticed: boolean;
  createdAt: Date;
  lessonsPassed: number;
  lessonsTotal: number;
  percent: number; // average over all published lessons
  lastActiveAt: string | null;
}

function toAdminView(user: StoredUser): AdminUserView {
  const pub = userModel.toPublicUser(user);
  return {
    id: pub._id.toString(),
    firstName: pub.firstName,
    lastName: pub.lastName,
    email: pub.email,
    phone: pub.phone,
    role: pub.role,
    createdAt: pub.createdAt,
  };
}

type LearnerBase = Omit<LearnerView, "lessonsPassed" | "lessonsTotal" | "percent" | "lastActiveAt">;

function toLearnerView(user: StoredUser): LearnerBase {
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    educationLevel: user.educationLevel,
    hasPracticed: user.meditation.hasPracticed,
    createdAt: user.createdAt,
  };
}

export async function listUsers(): Promise<AdminUserView[]> {
  const users = await userModel.findUsers(USER_LIST_LIMIT);
  return users.map(toAdminView);
}

export async function listLearners(): Promise<LearnerView[]> {
  const [learners, lessons] = await Promise.all([userModel.findUsersByRole("student"), lessonModel.findPublishedLessons()]);
  const progresses = await lessonModel.findProgressForUsers(learners.map((l) => l._id));

  return learners.map((learner) => {
    const mine = progresses.filter((p) => p.userId.equals(learner._id));
    const summaries = lessons.map((lesson) => lessonProgress(lesson, mine.find((p) => p.lessonId.equals(lesson._id)) ?? null));
    const lessonsPassed = summaries.filter((s) => s.passed).length;
    const percent = summaries.length ? Math.round(summaries.reduce((sum, s) => sum + s.percent, 0) / summaries.length) : 0;
    const lastActive = mine.reduce<Date | null>((latest, p) => (!latest || p.updatedAt > latest ? p.updatedAt : latest), null);
    return {
      ...toLearnerView(learner),
      lessonsPassed,
      lessonsTotal: lessons.length,
      percent,
      lastActiveAt: lastActive ? lastActive.toISOString() : null,
    };
  });
}

// Everything a teacher needs for one learner. Contact details are not included.
export async function getLearnerProgress(learnerId: string) {
  const learner = await userModel.findUserById(learnerId);
  if (!learner || learner.role !== "student") throw new NotFoundError("ไม่พบผู้เรียนนี้");

  const [lessons, progresses, attempts] = await Promise.all([
    lessonModel.findPublishedLessons(),
    lessonModel.findProgressForUser(learner._id),
    examModel.findAttemptsForUser(learner._id),
  ]);

  const summaryOf = (lesson: (typeof lessons)[number]): LessonProgressSummary =>
    lessonProgress(lesson, progresses.find((p) => p.lessonId.equals(lesson._id)) ?? null);

  const byTrack = (track: "reading" | "video") =>
    lessons
      .filter((l) => l.track === track)
      .sort((a, b) => a.order - b.order)
      .map(summaryOf);

  const all = lessons.map(summaryOf);
  const percent = all.length ? Math.round(all.reduce((sum, s) => sum + s.percent, 0) / all.length) : 0;
  const scored = attempts.filter((a) => a.score !== null);
  const lastActive = progresses.reduce<Date | null>((latest, p) => (!latest || p.updatedAt > latest ? p.updatedAt : latest), null);

  return {
    learner: {
      id: learner._id.toString(),
      firstName: learner.firstName,
      lastName: learner.lastName,
      educationLevel: learner.educationLevel,
      hasPracticed: learner.meditation.hasPracticed,
      createdAt: learner.createdAt,
      lastActiveAt: lastActive ? lastActive.toISOString() : null,
    },
    summary: {
      lessonsPassed: all.filter((s) => s.passed).length,
      lessonsTotal: all.length,
      percent,
    },
    tracks: { reading: byTrack("reading"), video: byTrack("video") },
    finalExam: {
      attempts: scored.length,
      bestScore: scored.length ? Math.max(...scored.map((a) => a.score as number)) : null,
      passed: attempts.some((a) => a.passed),
    },
  };
}

export async function changeUserRole(actor: PublicUser, targetId: string, role: unknown): Promise<void> {
  if (!isRole(role)) throw new ValidationError({ role: "บทบาทไม่ถูกต้อง" });
  if (!ObjectId.isValid(targetId)) throw new NotFoundError("ไม่พบผู้ใช้นี้");
  // Stops an admin from locking themselves out by removing their own admin role
  if (actor._id.toString() === targetId) {
    throw new ForbiddenError("ไม่สามารถเปลี่ยนบทบาทของตัวเองได้");
  }

  const updated = await userModel.updateUserRole(targetId, role);
  if (!updated) throw new NotFoundError("ไม่พบผู้ใช้นี้");
  // Audit trail: who changed whose role, and to what
  logger.info({ actorId: actor._id.toString(), targetId, newRole: role }, "user role changed");
}
