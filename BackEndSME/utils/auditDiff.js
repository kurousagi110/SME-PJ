/**
 * Pure Audit Diff & Severity Helpers (zero external dependencies)
 */

const CRITICAL_ACTIONS = new Set([
  "DELETE",
  "PERIOD_CLOSE",
  "PERIOD_REOPEN",
  "ROLE_CHANGE",
  "PERMISSION_CHANGE",
  "ADMIN_CREATE_USER",
  "APPROVE_ADJUSTMENT",
]);

const WARNING_ACTIONS = new Set([
  "UPDATE",
  "REJECT",
  "APPROVE",
  "PRICE_CHANGE",
  "BOM_CHANGE",
  "CONFIG_UPDATE",
]);

/**
 * Suy luận mức độ rủi ro cho Audit Log.
 * @param {string} action
 * @param {string} module
 * @returns {"info" | "warning" | "critical"}
 */
export function inferAuditSeverity(action = "", module = "") {
  const act = String(action || "").toUpperCase();
  const mod = String(module || "").toLowerCase();
  if (CRITICAL_ACTIONS.has(act) || mod.includes("period") || mod.includes("phan_quyen")) {
    return "critical";
  }
  if (WARNING_ACTIONS.has(act)) {
    return "warning";
  }
  return "info";
}

/**
 * So sánh 2 object before / after và trả về danh sách trường thay đổi.
 * @param {Record<string, unknown>|null} before
 * @param {Record<string, unknown>|null} after
 */
export function computeAuditDiff(before = null, after = null) {
  if (!before && !after) return null;
  const bObj = before && typeof before === "object" ? before : {};
  const aObj = after && typeof after === "object" ? after : {};

  const keys = Array.from(new Set([...Object.keys(bObj), ...Object.keys(aObj)]));
  const fields = [];

  for (const key of keys) {
    const oldVal = bObj[key];
    const newVal = aObj[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      fields.push({
        field: key,
        before: oldVal === undefined ? null : oldVal,
        after: newVal === undefined ? null : newVal,
      });
    }
  }

  return {
    before: before ?? null,
    after: after ?? null,
    fields,
  };
}
