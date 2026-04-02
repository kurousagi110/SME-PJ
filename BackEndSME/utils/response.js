// Refactored: 2026-04-02 | Issues fixed: G2, C1 | Phase 1 – Foundation

/**
 * Unified response helpers.
 * ALL responses across the entire API must go through these functions.
 *
 * Success shape:
 *   { success: true, message, data, pagination? }
 *
 * Error shape:
 *   { success: false, message, errorCode, statusCode }
 */

/**
 * Send a successful response.
 *
 * @param {import('express').Response} res
 * @param {any}    data        Payload (object, array, or null)
 * @param {string} message     Human-readable success message
 * @param {number} statusCode  HTTP status (default 200)
 * @param {object|null} pagination  { page, limit, total } – only for list endpoints
 */
export function sendSuccess(res, data = null, message = "Thành công", statusCode = 200, pagination = null) {
  const body = { success: true, message, data };
  if (pagination) body.pagination = pagination;
  return res.status(statusCode).json(body);
}

/**
 * Send an error response from an ApiError instance or raw values.
 *
 * @param {import('express').Response} res
 * @param {string} message
 * @param {string} errorCode   SNAKE_CASE identifier
 * @param {number} statusCode
 */
export function sendError(res, message = "Lỗi máy chủ", errorCode = "INTERNAL_ERROR", statusCode = 500) {
  return res.status(statusCode).json({ success: false, message, errorCode, statusCode });
}

/**
 * Build a pagination meta object (helper for list endpoints).
 *
 * @param {number} page
 * @param {number} limit
 * @param {number} total
 */
export function buildPagination(page, limit, total) {
  return {
    page: Number(page),
    limit: Number(limit),
    total: Number(total),
    totalPages: Math.ceil(Number(total) / Number(limit)) || 1,
  };
}
