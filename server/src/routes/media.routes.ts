import { Router } from "express";
import * as video from "../controllers/video.controller.js";
import { requireAuth } from "../middleware/require-auth.js";

// Uploaded lesson files. Requires login; the file names are random, so they cannot be guessed.
export const mediaRoutes = Router();

mediaRoutes.get("/videos/:name", requireAuth, video.serve);
