// Express app setup: middleware and routes. Does not connect to the database or start listening,
// so it can be imported by tests as well as by server.ts.
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import { apiRouter } from "./routes/index.js";

export function createApp() {
  const app = express();

  // Trust the reverse proxy (X-Forwarded-For / X-Forwarded-Proto)
  app.set("trust proxy", 1);

  app.use(requestLogger);
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use("/api", apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
