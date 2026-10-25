// Stores uploaded lesson videos (MP4) on disk and links them to a video lesson.
import { promises as fs } from "node:fs";
import path from "node:path";
import { config } from "../config/env.js";
import { NotFoundError, ValidationError } from "../errors/app-errors.js";
import * as lessonModel from "../models/lesson.model.js";
import type { PublicUser } from "../models/user.model.js";

const VIDEO_FILE = /^[0-9a-f-]{36}\.mp4$/;
const UPLOAD_ADDRESS = /\/api\/media\/videos\/([0-9a-f-]{36}\.mp4)$/;

export function videoUrlFor(fileName: string): string {
  return `/api/media/videos/${fileName}`;
}

// Turns a file name from a URL into a path inside the upload folder. Anything else is rejected,
// so a request cannot reach files outside that folder.
export function videoPath(fileName: string): string {
  if (!VIDEO_FILE.test(fileName)) throw new NotFoundError("ไม่พบไฟล์วิดีโอ");
  return path.join(config.uploadDir, fileName);
}

async function removeQuietly(filePath: string): Promise<void> {
  await fs.rm(filePath, { force: true }).catch(() => undefined);
}

// MP4 files carry "ftyp" at byte 4. Checking the bytes rejects other files renamed to .mp4.
async function looksLikeMp4(filePath: string): Promise<boolean> {
  const handle = await fs.open(filePath, "r");
  try {
    const head = Buffer.alloc(12);
    const { bytesRead } = await handle.read(head, 0, 12, 0);
    return bytesRead === 12 && head.subarray(4, 8).toString("ascii") === "ftyp";
  } finally {
    await handle.close();
  }
}

export async function attachVideo(actor: PublicUser, lessonId: string, file: Express.Multer.File | undefined): Promise<void> {
  if (!file) throw new ValidationError({ video: "กรุณาเลือกไฟล์วิดีโอ" });

  const lesson = await lessonModel.findLessonById(lessonId);
  if (!lesson) {
    await removeQuietly(file.path);
    throw new NotFoundError("ไม่พบบทเรียนนี้");
  }
  if (lesson.track !== "video") {
    await removeQuietly(file.path);
    throw new ValidationError({ video: "อัปโหลดวิดีโอได้เฉพาะบทเรียนรูปแบบวิดีโอ" });
  }
  if (!(await looksLikeMp4(file.path))) {
    await removeQuietly(file.path);
    throw new ValidationError({ video: "ไฟล์ต้องเป็น MP4" });
  }

  const fileName = path.basename(file.path);
  await lessonModel.setLessonVideo(lesson._id, videoUrlFor(fileName), actor._id);

  // Replacing a video removes the old file, so uploads do not pile up on disk
  const previous = UPLOAD_ADDRESS.exec(lesson.videoUrl);
  if (previous && previous[1] !== fileName) await removeQuietly(videoPath(previous[1]));
}
