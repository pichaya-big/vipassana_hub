// Entry point: check config, connect to the database, then start listening.
import { createApp } from "./app.js";
import { closeDB, connectDB } from "./config/database.js";
import { config, getJwtSecret } from "./config/env.js";
import { logger } from "./config/logger.js";
import { ensureFinalExamIndexes } from "./models/final-exam.model.js";
import { ensureLessonIndexes } from "./models/lesson.model.js";
import { backfillMissingRoles, ensureUserIndexes } from "./models/user.model.js";

async function start(): Promise<void> {
  getJwtSecret(); // throws if JWT_SECRET is missing or too short
  await connectDB();
  await ensureUserIndexes();
  await ensureLessonIndexes();
  await ensureFinalExamIndexes();
  const migrated = await backfillMissingRoles();
  logger.info({ migratedAccounts: migrated }, "MongoDB connected, user indexes ready");

  const server = createApp().listen(config.port, "0.0.0.0", () => {
    logger.info({ port: config.port, logLevel: config.logLevel }, "API listening");
  });

  // Close the DB pool cleanly on Ctrl+C or docker stop
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      logger.info({ signal }, "shutting down");
      server.close(async () => {
        await closeDB();
        process.exit(0);
      });
    });
  }
}

start().catch((err: unknown) => {
  logger.fatal({ err }, "startup failed");
  process.exit(1);
});
