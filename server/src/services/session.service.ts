import type { Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { config, getJwtSecret } from "../config/env.js";

export const SESSION_COOKIE = "vh_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(getJwtSecret());
}

// Returns the user id if the token is valid and not expired, otherwise null
export async function verifySession(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

function cookieOptions() {
  return {
    httpOnly: true, // page scripts cannot read the token
    sameSite: "lax" as const,
    secure: config.cookieSecure, // set COOKIE_SECURE=true when served over HTTPS
    path: "/",
  };
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: SESSION_SECONDS * 1000 });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}
