import { Router } from "express";
import * as course from "../controllers/course.controller.js";
import * as learning from "../controllers/learning.controller.js";
import { requireAuth } from "../middleware/require-auth.js";

// Learner routes. Each one checks login, and the service checks unlocking rules.
export const learningRoutes = Router();

learningRoutes.get("/courses", requireAuth, learning.courses);
learningRoutes.get("/lessons/:id", requireAuth, learning.lesson);
learningRoutes.post("/lessons/:id/pretest", requireAuth, learning.pretest);
learningRoutes.post("/lessons/:id/content-complete", requireAuth, learning.completeContent);
learningRoutes.post("/lessons/:id/watch-progress", requireAuth, learning.watchProgress);
learningRoutes.post("/lessons/:id/posttest", requireAuth, learning.posttest);
learningRoutes.get("/course", requireAuth, course.progress);
learningRoutes.post("/final-exam", requireAuth, course.startExam);
learningRoutes.post("/final-exam/:attemptId/submit", requireAuth, course.submitExam);
