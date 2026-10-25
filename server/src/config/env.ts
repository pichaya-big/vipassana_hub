import path from "node:path";

const DEFAULT_PORT = 4000;

export const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

// Unknown values fall back to "info" instead of crashing, so a typo in .env does not stop the server
function readLogLevel(raw: string | undefined): LogLevel {
  const value = raw?.trim().toLowerCase() as LogLevel | undefined;
  return value && (LOG_LEVELS as readonly string[]).includes(value) ? value : "info";
}

// Read once at startup. Values come from the process environment (see .env via --env-file).
export const config = {
  port: Number(process.env.PORT) || DEFAULT_PORT,
  corsOrigins: process.env.CORS_ORIGIN?.split(",") ?? true,
  cookieSecure: process.env.COOKIE_SECURE === "true",
  logLevel: readLogLevel(process.env.LOG_LEVEL),
  // Where uploaded lesson videos are stored. Mount a Docker volume here so uploads survive restarts.
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? "uploads"),
  maxVideoMb: Number(process.env.MAX_VIDEO_MB) || 50,
};

// Fails fast at startup if the secret is missing or too short for HS256
export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters long");
  }
  return new TextEncoder().encode(secret);
}
