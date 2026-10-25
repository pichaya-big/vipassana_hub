import { randomUUID } from "node:crypto";
import { pinoHttp } from "pino-http";
import { logger } from "../config/logger.js";

// One log line per request, with status and timing. The request body is never logged.
// Each request gets an id, sent back in X-Request-Id, so a support report can be matched to the log.
export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers["x-request-id"];
    const id = typeof existing === "string" && existing.length <= 100 ? existing : randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  // Successful requests are info, client errors are warn, server errors are error
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  // Health checks run every few seconds and would drown out real traffic
  autoLogging: {
    ignore: (req) => req.url === "/api/health",
  },
  // error is set by the error handler for expected failures: code, message and the fields that were wrong.
  // It never includes what the user typed, so passwords and emails stay out of the log.
  customProps: (_req, res) => {
    const info = (res as unknown as { locals?: { errorInfo?: unknown } }).locals?.errorInfo;
    return info ? { error: info } : {};
  },
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
