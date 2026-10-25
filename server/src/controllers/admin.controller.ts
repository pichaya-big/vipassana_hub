import type { Request, Response } from "express";
import type { PublicUser } from "../models/user.model.js";
import * as adminService from "../services/admin.service.js";

export async function listUsers(_req: Request, res: Response): Promise<void> {
  res.json({ users: await adminService.listUsers() });
}

export async function changeRole(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as { role?: unknown };
  await adminService.changeUserRole(res.locals.currentUser as PublicUser, req.params.id as string, body.role);
  res.status(204).end();
}

export async function learnerProgress(req: Request, res: Response): Promise<void> {
  res.json(await adminService.getLearnerProgress(req.params.id as string));
}

export async function listLearners(_req: Request, res: Response): Promise<void> {
  res.json({ learners: await adminService.listLearners() });
}
