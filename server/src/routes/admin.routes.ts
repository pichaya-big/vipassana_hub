import { Router } from "express";
import * as admin from "../controllers/admin.controller.js";
import * as lessons from "../controllers/lesson.controller.js";
import * as video from "../controllers/video.controller.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { uploadVideoField } from "../middleware/upload-video.js";

// Every route here needs a logged-in account, and each one also checks its permission
export const adminRoutes = Router();

adminRoutes.use(requireAuth);
adminRoutes.get("/users", requirePermission("users:read"), admin.listUsers);
adminRoutes.patch("/users/:id/role", requirePermission("users:manage"), admin.changeRole);

// Lesson management: teachers and admins write drafts; publishing is limited further in the service
adminRoutes.get("/lessons", requirePermission("content:write"), lessons.list);
adminRoutes.post("/lessons", requirePermission("content:write"), lessons.create);
adminRoutes.get("/lessons/:id", requirePermission("content:write"), lessons.get);
adminRoutes.patch("/lessons/:id", requirePermission("content:write"), lessons.update);
adminRoutes.post("/lessons/:id/video", requirePermission("content:write"), uploadVideoField, video.upload);
adminRoutes.post("/lessons/:id/publish", requirePermission("content:publish"), lessons.publish);
adminRoutes.post("/lessons/:id/unpublish", requirePermission("content:publish"), lessons.unpublish);

// Teachers and admins can read learner progress
export const learnerRoutes = Router();

learnerRoutes.use(requireAuth);
learnerRoutes.get("/", requirePermission("learners:read"), admin.listLearners);
learnerRoutes.get("/:id/progress", requirePermission("learners:read"), admin.learnerProgress);
