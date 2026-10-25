import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import multer from "multer";
import { config } from "../config/env.js";
import { ValidationError } from "../errors/app-errors.js";
import type { NextFunction, Request, Response } from "express";

mkdirSync(config.uploadDir, { recursive: true });

// Files are stored under random names, never the name the user chose
const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (_req, _file, cb) => cb(null, `${randomUUID()}.mp4`),
  }),
  limits: { fileSize: config.maxVideoMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const isMp4 = file.mimetype === "video/mp4" || file.originalname.toLowerCase().endsWith(".mp4");
    if (isMp4) cb(null, true);
    else cb(new ValidationError({ video: "ไฟล์ต้องเป็น MP4" }));
  },
});

// Reads one file from the "video" field. Upload errors become the same JSON errors as the rest of the API.
export function uploadVideoField(req: Request, res: Response, next: NextFunction): void {
  upload.single("video")(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return next(new ValidationError({ video: `ไฟล์ใหญ่เกิน ${config.maxVideoMb} MB` }));
    }
    next(err);
  });
}
