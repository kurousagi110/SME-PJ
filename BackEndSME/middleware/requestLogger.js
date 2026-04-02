// Phase 4 – Request Logger Middleware | 2026-04-02
// Logs every HTTP request: [Method] [URL] [Status] [IP] [ResponseTime]
// Attached in server.js immediately after trust-proxy / CORS setup.

import logger from "../utils/logger.js";

/**
 * Express middleware that logs a structured entry for every completed request.
 * Uses the 'finish' event so status code and response time are accurate.
 */
export default function requestLogger(req, res, next) {
  const startHrTime = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startHrTime) / 1_000_000;

    const ip =
      req.headers["x-real-ip"] ||
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      "-";

    const level = res.statusCode >= 500 ? "error"
                : res.statusCode >= 400 ? "warn"
                : "info";

    logger[level]("HTTP", {
      method:   req.method,
      url:      req.originalUrl,
      status:   res.statusCode,
      ip,
      duration: `${durationMs.toFixed(1)}ms`,
    });
  });

  next();
}
