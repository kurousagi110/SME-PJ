import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess, buildPagination } from "../utils/response.js";

let col = null;

/**
 * Called once after MongoDB connects (in index.js).
 */
export function injectAuditLogControllerDB(conn) {
  if (col) return;
  const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
  col = conn.db(dbName).collection("audit_log");
}

export default class AuditLogController {
  /**
   * GET /api/v1/audit-log
   * Query params: action, module, tai_khoan, page, limit
   * Access: verifyAdmin only
   */
  static list = asyncHandler(async (req, res) => {
    const { action, module, tai_khoan, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (action)     filter.action             = action;
    if (module)     filter.module             = module;
    if (tai_khoan)  filter["performed_by.tai_khoan"] = tai_khoan;

    const pageNum  = Math.max(1, Number(page)  || 1);
    const limitNum = Math.max(1, Math.min(Number(limit) || 20, 100));
    const skip     = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      col.find(filter).sort({ created_at: -1 }).skip(skip).limit(limitNum).toArray(),
      col.countDocuments(filter),
    ]);

    const pagination = buildPagination(pageNum, limitNum, total);
    return sendSuccess(res, items, "Lấy audit log thành công", 200, pagination);
  });
}
