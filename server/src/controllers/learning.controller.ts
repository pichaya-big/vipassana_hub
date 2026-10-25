// Learner endpoints. The logged-in account comes from requireAuth.
import type { Request, Response } from "express";
import type { ObjectId } from "mongodb";
import type { PublicUser } from "../models/user.model.js";
import * as learning from "../services/learning.service.js";

const userIdOf = (res: Response): ObjectId => (res.locals.currentUser as PublicUser)._id;

export async function courses(_req: Request, res: Response): Promise<void> {
  res.json(await learning.getCourses(userIdOf(res)));
}

export async function lesson(req: Request, res: Response): Promise<void> {
  res.json({ lesson: await learning.getLessonForLearner(userIdOf(res), req.params.id as string) });
}

export async function pretest(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as { answers?: unknown };
  res.json(await learning.submitPretest(userIdOf(res), req.params.id as string, body.answers));
}

export async function completeContent(req: Request, res: Response): Promise<void> {
  res.json(await learning.completeContent(userIdOf(res), req.params.id as string));
}

export async function watchProgress(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as { percent?: unknown; position?: unknown };
  res.json(await learning.reportWatch(userIdOf(res), req.params.id as string, body.percent, body.position));
}

export async function posttest(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as { answers?: unknown };
  res.json(await learning.submitPosttest(userIdOf(res), req.params.id as string, body.answers));
}
