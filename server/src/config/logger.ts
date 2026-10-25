// Application logger. Levels (least to most verbose): fatal, error, warn, info, debug, trace.
// Set LOG_LEVEL in .env to choose the minimum level that gets written. Default is info.
//
// Output format:
//   - production (NODE_ENV=production): one JSON object per line, for log collectors
//   - anything else: colored, human-readable lines for local development
import pino from "pino";
import { config } from "./env.js";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: config.logLevel,
  base: { service: "vh-server" },
  // Secrets must never reach the log. Redaction runs before the line is written.
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "password",
      "passwordHash",
      "*.password",
      "*.passwordHash",
      "*.JWT_SECRET",
      "*.MONGODB_URI",
    ],
    censor: "[REDACTED]",
  },
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname,service" },
      },
});
