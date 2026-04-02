// Refactored: 2026-04-02 | Issues fixed: G2, W2, C4 | Phase 1 – Foundation
// Phase 4 update: replaced console.error with winston logger

import ApiError from "../utils/ApiError.js";
import logger from "../utils/logger.js";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Global Express error handler – must be registered LAST in server.js.
 *
 * Handles:
 *   1. ApiError instances  → structured error response (operational errors)
 *   2. JWT errors          → 401
 *   3. MongoDB errors      → 400 / 409 / 500
 *   4. Unknown errors      → 500 with safe message (no stack trace leak in prod)
 */
export default function errorHandler(err, req, res, _next) {
  /* ── Log the error with context ── */
  const logMeta = {
    method:  req.method,
    url:     req.originalUrl,
    status:  err.statusCode || 500,
    ...(isDev && err.stack ? { stack: err.stack } : {}),
  };
  if (err instanceof ApiError && err.isOperational) {
    logger.warn(`[errorHandler] ${err.message}`, logMeta);
  } else {
    logger.error(`[errorHandler] ${err.message || err}`, logMeta);
  }

  /* ── ApiError (operational) ── */
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode,
      statusCode: err.statusCode,
    });
  }

  /* ── JWT errors ── */
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token đã hết hạn",
      errorCode: "TOKEN_EXPIRED",
      statusCode: 401,
    });
  }
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Token không hợp lệ",
      errorCode: "TOKEN_INVALID",
      statusCode: 401,
    });
  }

  /* ── MongoDB duplicate key (E11000) ── */
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {}).join(", ") || "field";
    return res.status(409).json({
      success: false,
      message: `Dữ liệu đã tồn tại: ${field}`,
      errorCode: "DUPLICATE_KEY",
      statusCode: 409,
    });
  }

  /* ── MongoDB validation error ── */
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: err.message,
      errorCode: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }

  /* ── Unknown / unexpected error ── */
  const message = isDev ? err.message : "Lỗi máy chủ nội bộ";
  return res.status(500).json({
    success: false,
    message,
    errorCode: "INTERNAL_ERROR",
    statusCode: 500,
  });
}
