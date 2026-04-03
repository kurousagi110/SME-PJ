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
 * @param {string|null} ip      — client IP (req.ip)
 */
export async function logAction(action, module, targetId, description, performedBy, ip = null) {
  if (!col) return; // silently skip if DB not injected (e.g. during tests)
  try {
    await col.insertOne({
      action,
      module,
      target_id:    targetId   ?? null,
      description,
      performed_by: performedBy ?? null,
      ip:           ip          ?? null,
      created_at:   new Date(),
    });
  } catch {
    // Audit log failures must never crash the main request
  }
}
