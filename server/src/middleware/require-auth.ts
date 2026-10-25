import type { NextFunction, Request, Response } from "express";
import { can, type Permission } from "../authz/roles.js";
import { ForbiddenError, UnauthorizedError } from "../errors/app-errors.js";
import { findUserById, toPublicUser, type PublicUser } from "../models/user.model.js";
import { SESSION_COOKIE, verifySession } from "../services/session.service.js";

// Checks the session cookie, loads the account from the database, and stores it in
// res.locals.currentUser. Loading from the database means a deleted account or a changed role
// takes effect on the next request, not when the cookie expires.
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  const userId = token ? await verifySession(token) : null;
  if (!userId) throw new UnauthorizedError();

  const user = await findUserById(userId);
  if (!user) throw new UnauthorizedError();

  res.locals.currentUser = toPublicUser(user);
  next();
}

// Must run after requireAuth
export function requirePermission(permission: Permission) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const user = res.locals.currentUser as PublicUser;
    if (!can(user.role, permission)) throw new ForbiddenError();
    next();
  };
}
