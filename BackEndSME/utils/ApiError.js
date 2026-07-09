// Refactored: 2026-04-02 | Issues fixed: G1, C3, W2 | Phase 1 – Foundation
// Phase 5 (2026-07-09): added optional `data` field — for sending structured
// error payloads (e.g. `{ lack: [...] }`) so FE can render targeted UI.

/**
 * Custom operational error class.
 * Controllers and services throw ApiError instead of raw Error,
 * so the global errorHandler can distinguish operational from unexpected errors.
 */
export default class ApiError extends Error {
  /**
   * @param {string}  message       Human-readable description (Vietnamese OK)
   * @param {number}  statusCode    HTTP status code
   * @param {string}  errorCode     SNAKE_CASE machine-readable code
   * @param {boolean} isOperational true = expected business error, false = crash
   * @param {any}     data          Optional structured payload (e.g. validation details)
   */
  constructor(message, statusCode = 500, errorCode = "INTERNAL_ERROR", isOperational = true, data = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.data = data;
    Error.captureStackTrace(this, this.constructor);
  }

  /* ─── Static factory methods ─── */

  static badRequest(message = "Dữ liệu không hợp lệ", errorCode = "BAD_REQUEST", data = null) {
    return new ApiError(message, 400, errorCode, true, data);
  }

  static unauthorized(message = "Chưa xác thực", errorCode = "UNAUTHORIZED") {
    return new ApiError(message, 401, errorCode);
  }

  static forbidden(message = "Không có quyền truy cập", errorCode = "FORBIDDEN") {
    return new ApiError(message, 403, errorCode);
  }

  static notFound(message = "Không tìm thấy", errorCode = "NOT_FOUND") {
    return new ApiError(message, 404, errorCode);
  }

  static conflict(message = "Dữ liệu đã tồn tại", errorCode = "CONFLICT") {
    return new ApiError(message, 409, errorCode);
  }

  static internal(message = "Lỗi máy chủ nội bộ", errorCode = "INTERNAL_ERROR") {
    return new ApiError(message, 500, errorCode, false);
  }

  static validationError(message, errorCode = "VALIDATION_ERROR", data = null) {
    return new ApiError(message, 400, errorCode, true, data);
  }
}
