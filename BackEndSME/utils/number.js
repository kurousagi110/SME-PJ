// Shared utility: sanitize user-supplied numbers before they reach MongoDB
// or arithmetic code. Without this a request like { so_luong: "abc" } would
// either throw TypeError (Number("abc")) or persist NaN which silently
// corrupts pricing / stock math downstream.
//
// Keep this in lock-step with any new numeric input fields in DAOs.

/**
 * Coerce a value to a finite number, falling back to `def` if the result
 * is not finite. Handles null/undefined/strings/numbers without throwing.
 *
 * @param {unknown} v   — the value to coerce
 * @param {number}  def — fallback when v is not finite
 * @returns {number}
 */
export function sanitizeNumber(v, def = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : def;
}

/**
 * Sanitize and clamp to [min, max]. Useful for stock quantities that must
 * never go negative or exceed a documented ceiling.
 *
 * @param {unknown} v
 * @param {number}  min
 * @param {number}  max
 * @param {number}  def — fallback when v is not finite
 */
export function clampNumber(v, min, max, def = 0) {
  const x = sanitizeNumber(v, def);
  return Math.min(Math.max(x, min), max);
}

export default sanitizeNumber;
