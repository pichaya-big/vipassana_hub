import type { Request, Response } from "express";
import type { PublicUser } from "../models/user.model.js";
import * as lessonService from "../services/lesson.service.js";
import * as videoService from "../services/video.service.js";

// Replies with the updated lesson, so the editor can show the new video straight away
export async function upload(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  await videoService.attachVideo(res.locals.currentUser as PublicUser, id, req.file);
  res.json({ lesson: await lessonService.getLesson(id) });
}

// Streams one uploaded video. Only logged-in users get here; the route checks that.
export function serve(req: Request, res: Response, next: (err?: unknown) => void): void {
  try {
    res.sendFile(
      videoService.videoPath(req.params.name as string),
      { acceptRanges: true, headers: { "Cache-Control": "private, no-cache" } },
      (err) => {
        if (err && !res.headersSent) next(err);
      },
    );
  } catch (err) {
    next(err);
  }
}
