// Staff endpoints for lessons. Permissions are checked in the routes; ownership rules are in the service.
import type { Request, Response } from "express";
import type { PublicUser } from "../models/user.model.js";
import * as lessonService from "../services/lesson.service.js";

const actorOf = (res: Response) => res.locals.currentUser as PublicUser;

export async function list(_req: Request, res: Response): Promise<void> {
  res.json({ lessons: await lessonService.listLessons() });
}

export async function get(req: Request, res: Response): Promise<void> {
  res.json({ lesson: await lessonService.getLesson(req.params.id as string) });
}

export async function create(req: Request, res: Response): Promise<void> {
  const lesson = await lessonService.createLesson(actorOf(res), (req.body ?? {}) as Record<string, unknown>);
  res.status(201).json({ lesson });
}

export async function update(req: Request, res: Response): Promise<void> {
  const lesson = await lessonService.updateLesson(actorOf(res), req.params.id as string, (req.body ?? {}) as Record<string, unknown>);
  res.json({ lesson });
}

export async function publish(req: Request, res: Response): Promise<void> {
  res.json({ lesson: await lessonService.publishLesson(actorOf(res), req.params.id as string) });
}

export async function unpublish(req: Request, res: Response): Promise<void> {
  res.json({ lesson: await lessonService.unpublishLesson(actorOf(res), req.params.id as string) });
}
