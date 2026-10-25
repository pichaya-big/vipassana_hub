// HTTP layer only: reads the request, calls a service, shapes the response and sets cookies.
import type { Request, Response } from "express";
import type { PublicUser } from "../models/user.model.js";
import * as authService from "../services/auth.service.js";
import { clearSessionCookie, setSessionCookie, signSession } from "../services/session.service.js";
import type { RegisterInput } from "../validators/registration.validator.js";

// Browser-facing shape: _id becomes id
function toUserResponse(user: PublicUser) {
  const { _id, ...rest } = user;
  return { id: _id.toString(), ...rest };
}

export async function register(req: Request, res: Response): Promise<void> {
  const user = await authService.registerUser((req.body ?? {}) as RegisterInput);
  setSessionCookie(res, await signSession(user._id.toString()));
  res.status(201).json({ user: toUserResponse(user) });
}

export async function login(req: Request, res: Response): Promise<void> {
  const user = await authService.loginUser((req.body ?? {}) as { identifier?: unknown; password?: unknown });
  setSessionCookie(res, await signSession(user._id.toString()));
  res.json({ user: toUserResponse(user) });
}

export function logout(_req: Request, res: Response): void {
  clearSessionCookie(res);
  res.status(204).end();
}

// requireAuth has already loaded the current account
export function me(_req: Request, res: Response): void {
  res.json({ user: toUserResponse(res.locals.currentUser as PublicUser) });
}
