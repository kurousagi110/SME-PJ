// Refactored: 2026-04-02 | Issues fixed: C3, R5, W3 | Phase 1 – Foundation

import ApiError from "../utils/ApiError.js";

/**
 * validate.js – lightweight request validation middleware factory.
 * No external dependency (no Joi/Zod) – uses manual checks + ApiError.
 *
 * Usage in routes:
 *   router.post("/", validate.body(["ma_sp", "ten_sp"]), Controller.create);
 *   router.get("/", validate.query(["page", "limit"], { coerce: true }), Controller.list);
 */

/* ─── Body field presence check ─── */
export function requireBody(...fields) {
  return (req, _res, next) => {
    const missing = fields.filter((f) => {
      const v = req.body?.[f];
      return v === undefined || v === null || v === "";
    });
    if (missing.length) {
      return next(ApiError.badRequest(`Thiếu trường bắt buộc: ${missing.join(", ")}`, "VALIDATION_ERROR"));
    }
    next();
  };
}

/* ─── Query param coercion middleware ─── */
export function parseQuery(req, _res, next) {
  const q = req.query;
  if (q.page !== undefined)  q.page  = Number(q.page)  || 1;
  if (q.limit !== undefined) q.limit = Number(q.limit) || 20;
  if (q.includeDeleted !== undefined) q.includeDeleted = q.includeDeleted === "true";
  if (q.lowStockOnly !== undefined)   q.lowStockOnly   = q.lowStockOnly   === "true";
  if (q.includeCancelled !== undefined) q.includeCancelled = q.includeCancelled !== "false";
  if (q.min_qty !== undefined && q.min_qty !== "") q.min_qty = Number(q.min_qty);
  if (q.max_qty !== undefined && q.max_qty !== "") q.max_qty = Number(q.max_qty);
  if (q.minPrice !== undefined && q.minPrice !== "") q.minPrice = Number(q.minPrice);
  if (q.maxPrice !== undefined && q.maxPrice !== "") q.maxPrice = Number(q.maxPrice);
  if (q.lowStockThreshold !== undefined) q.lowStockThreshold = Number(q.lowStockThreshold) || 5;
  if (q.threshold !== undefined) q.threshold = Number(q.threshold);
  next();
}

/* ─── Param ObjectId check ─── */
export function requireParam(...params) {
  return (req, _res, next) => {
    const missing = params.filter((p) => !req.params?.[p]);
    if (missing.length) {
      return next(ApiError.badRequest(`Thiếu tham số: ${missing.join(", ")}`, "VALIDATION_ERROR"));
    }
    next();
  };
}

/* ─── Composite: body validation shorthand ─── */
export const validate = {
  body: requireBody,
  query: parseQuery,
  param: requireParam,
};

export default validate;
