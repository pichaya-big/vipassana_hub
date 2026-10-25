import { Router } from "express";
import * as system from "../controllers/system.controller.js";
import { adminRoutes, learnerRoutes } from "./admin.routes.js";
import { authRoutes } from "./auth.routes.js";
import { learningRoutes } from "./learning.routes.js";
import { mediaRoutes } from "./media.routes.js";

// Everything here is mounted under /api. The reverse proxy forwards /api/* unchanged.
export const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/admin", adminRoutes);
apiRouter.use("/learners", learnerRoutes);
apiRouter.use("/", learningRoutes);
apiRouter.use("/media", mediaRoutes);
apiRouter.get("/health", system.health);
apiRouter.get("/hello", system.hello);
