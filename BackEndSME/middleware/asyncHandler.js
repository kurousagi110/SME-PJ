// Refactored: 2026-04-02 | Issues fixed: C4 | Phase 1 – Foundation

/**
 * asyncHandler – eliminates the repetitive try/catch blocks in every controller.
 *
 * Wraps an async route handler so any thrown error (including ApiError)
 * is automatically forwarded to the global errorHandler via next(err).
 *
 * Usage:
 *   static create = asyncHandler(async (req, res) => {
 *     const data = await SomeService.create(req.body);
 *     return sendSuccess(res, data, "Tạo thành công", 201);
 *   });
 *
 * @param {Function} fn  Async (req, res, next) handler
 * @returns {Function}   Express middleware
 */
export default function asyncHandler(fn) {
  return function asyncRouteHandler(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
