import type { Request, Response } from "express";
import type { ObjectId } from "mongodb";
import type { PublicUser } from "../models/user.model.js";
import * as course from "../services/course.service.js";

const userIdOf = (res: Response): ObjectId => (res.locals.currentUser as PublicUser)._id;

export async function progress(_req: Request, res: Response): Promise<void> {
  res.json(await course.getCourseProgress(userIdOf(res)));
}

export async function startExam(_req: Request, res: Response): Promise<void> {
  res.status(201).json(await course.startFinalExam(userIdOf(res)));
}

export async function submitExam(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as { answers?: unknown };
  res.json(await course.submitFinalExam(userIdOf(res), req.params.attemptId as string, body.answers));
}
