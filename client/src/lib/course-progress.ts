// Course-wide progress from GET /api/course (see server/src/services/course.service.ts)

export interface TrackProgress {
  track: "reading" | "video";
  total: number;
  passed: number;
}

export interface CourseProgress {
  tracks: TrackProgress[];
  completed: boolean;
  finalExam: {
    unlocked: boolean;
    passed: boolean;
    bestScore: number | null;
    attempts: number;
    passingScore: number;
  };
}

// Lessons still to pass across both tracks
export function remainingLessons(progress: CourseProgress): number {
  return progress.tracks.reduce((sum, t) => sum + (t.total - t.passed), 0);
}

export const TRACK_NAME: Record<TrackProgress["track"], string> = {
  reading: "เนื้อหา",
  video: "วิดีโอ",
};
