import type { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger.js";
import { AppError } from "../errors/app-errors.js";

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: "not_found", message: "ไม่พบ endpoint ที่เรียก" });
}

// Converts every thrown error into a JSON response. Unknown errors are logged and hidden from the client.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  // Expected errors (validation, auth, not found) are business outcomes, not server faults
  if (err instanceof AppError) {
    res.locals.errorInfo = { code: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}) };
    if (err.status >= 500) logger.error({ err, reqId: req.id }, err.message);
    res.status(err.status).json({
      error: err.code,
      message: err.message,
      ...(err.fields ? { fields: err.fields } : {}),
    });
    return;
  }

  // Malformed JSON and similar client errors come from body-parser with a 4xx status
  const status = typeof err === "object" && err !== null && "status" in err ? (err as { status: unknown }).status : undefined;
  if (typeof status === "number" && status >= 400 && status < 500) {
    res.locals.errorInfo = { code: "bad_request", message: err instanceof Error ? err.message : "client error" };
    res.status(status).json({ error: "bad_request", message: "รูปแบบข้อมูลที่ส่งมาไม่ถูกต้อง" });
    return;
  }

  logger.error({ err, reqId: req.id }, "unhandled error");
  res.status(500).json({ error: "internal_error", message: "เกิดข้อผิดพลาดภายในระบบ" });
}
