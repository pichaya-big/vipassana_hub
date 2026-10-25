// Types for what learners get from the API (see server/src/services/learning.service.ts).
// Learner questions never include the answer key.
import type { Track } from "@/lib/lessons";

export interface UnitProgress {
  preDone: boolean;
  contentCompleted: boolean;
  passed: boolean;
}


export interface Unit {
  id: string;
  order: number;
  title: string;
  summary: string;
  unlocked: boolean;
  progress: UnitProgress;
}

// Both tracks, each numbered from 1 with no upper limit
export interface Courses {
  tracks: Record<Track, Unit[]>;
}

export interface LearnerQuestion {
  stem: string;
  options: string[];
}

export interface LearnerLesson {
  id: string;
  track: Track;
  order: number;
  title: string;
  summary: string;
  passingScore: number;
  progress: UnitProgress & { bestPosttestScore: number | null; watchedPercent: number; lastPositionSec: number };
  watchThreshold: number;
  pretest: LearnerQuestion[] | null;
  content: { body: string; videoUrl: string } | null;
  posttest: LearnerQuestion[] | null;
}

export interface PosttestResult {
  score: number;
  correct: number;
  total: number;
  passed: boolean;
  passingScore: number;
  results: { correct: boolean; correctIndex: number; explanation: string }[];
}

export function allUnits(courses: Courses): Unit[] {
  return [...courses.tracks.reading, ...courses.tracks.video];
}

// The unit to continue with: the first unlocked unit that is not passed yet
export function nextUnit(courses: Courses): Unit | null {
  return allUnits(courses).find((u) => u.unlocked && !u.progress.passed) ?? null;
}

export function unitStatus(unit: Unit): { label: string; tone: "muted" | "active" | "done" } {
  if (!unit.unlocked) return { label: "ยังไม่เปิด", tone: "muted" };
  if (unit.progress.passed) return { label: "ผ่านแล้ว", tone: "done" };
  if (unit.progress.preDone) return { label: "กำลังเรียน", tone: "active" };
  return { label: "เริ่มเรียน", tone: "active" };
}
