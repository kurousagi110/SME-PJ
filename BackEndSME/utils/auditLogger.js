import logger from "./logger.js";
import { computeAuditDiff, inferAuditSeverity } from "./auditDiff.js";

let col = null;

/**
 * Called once after MongoDB connects (in index.js).
 */
export function injectAuditDB(conn) {
  if (col) return;
  const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
  col = conn.db(dbName).collection("audit_log");
}

/**
 * logAction — insert one audit record.
 *
 * @param {string} action       — 'CREATE' | 'APPROVE' | 'REJECT' | 'UPDATE' | 'DELETE' …
 * @param {string} module       — e.g. 'dieu_chinh_kho'
 * @param {string|null} targetId — MongoDB ObjectId string of the affected document
 * @param {string} description  — human-readable summary
 * @param {{ tai_khoan: string, ho_ten: string }} performedBy
 * @param {string|null} ip      — client IP (req.ip or req.headers['x-forwarded-for'])
 * @param {{ before?: any, after?: any, severity?: "info" | "warning" | "critical" }|null} options
 */
export async function logAction(actionOrObj, module, targetId, description, performedBy, ip = null, options = null) {
  if (!col) {
    logger.warn("auditLogger skipped: DB not injected", {
      action: typeof actionOrObj === "object" ? actionOrObj?.action : actionOrObj,
      module,
    });
    return;
  }
  try {
    let act = actionOrObj;
    let mod = module;
    let tid = targetId;
    let desc = description;
    let actor = performedBy;
    let clientIp = ip;
    let opts = options;

    if (actionOrObj && typeof actionOrObj === "object") {
      act = actionOrObj.action;
      mod = actionOrObj.module;
      tid = actionOrObj.targetId ?? actionOrObj.target_id ?? null;
      desc = actionOrObj.description ?? "";
      actor = actionOrObj.performedBy ?? actionOrObj.user ?? null;
      clientIp = actionOrObj.ip ?? actionOrObj.ip_address ?? null;
      opts = {
        before: actionOrObj.before,
        after: actionOrObj.after,
        severity: actionOrObj.severity,
      };
    }

    const hasDiff = opts && (opts.before !== undefined || opts.after !== undefined);
    const changes = hasDiff ? computeAuditDiff(opts.before ?? null, opts.after ?? null) : null;
    const severity = opts?.severity || inferAuditSeverity(act, mod);

    await col.insertOne({
      action: act,
      module: mod,
      target_id:  tid ?? null,
      description: desc,
      severity,
      changes,
      user:       actor ?? null,   // { tai_khoan, ho_ten } — matched to frontend field log.user
      ip_address: clientIp ?? null,   // matched to frontend field log.ip_address
      created_at: new Date(),
    });
  } catch (e) {
    // SECURITY: Audit log failures must NEVER crash the main request, but they
    // MUST be logged so an admin can see the gap. Otherwise during incidents
    // we silently lose the audit trail (compliance + forensics).
    logger.error("auditLogger insert failed", {
      action: typeof actionOrObj === "object" ? actionOrObj?.action : actionOrObj,
      module,
      target_id: targetId,
      error: e.message,
    });
  }
}
