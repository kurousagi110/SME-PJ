// Phase 5 (2026-07-09): wire SanXuatService vào HTTP layer.
// Pattern y hệt controllers/dieuChinhKhoController.js + bomControllers.js:
//   - asyncHandler bọc try/catch
//   - sendSuccess / sendError + ApiError cho error flow đồng nhất
//   - Service nhận mongoClient từ req.app.locals để dùng transaction
//   - Sau khi OK: notify Thủ kho (NL đã bị trừ) + logAction audit
//
// Validation flow:
//   1. requireBody (route) — chắc chắn field có mặt
//   2. Controller-level — kiểm ObjectId, qty > 0
//   3. Service-level — kiểm SP tồn tại, có BOM, đủ NL (transaction-safe)

import { ObjectId } from "mongodb";
import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess, buildPagination } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import SanXuatService from "../service/sanXuatService.js";
import { notifyApprover } from "../utils/socketManager.js";
import { logAction } from "../utils/auditLogger.js";

export default class SanXuatController {
  /* ─── PRODUCE (tạo lệnh sản xuất) ─── */
  static produce = asyncHandler(async (req, res) => {
    const { san_pham_id, so_luong_sx, ghi_chu = "" } = req.body || {};

    // Validation tier 1 — shape cơ bản
    if (!ObjectId.isValid(san_pham_id)) {
      throw ApiError.badRequest("san_pham_id không phải ObjectId hợp lệ", "VALIDATION_ERROR");
    }
    const qty = Number(so_luong_sx);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw ApiError.badRequest("so_luong_sx phải là số dương", "VALIDATION_ERROR");
    }

    // Pass mongoClient để service dùng transaction (preferred).
    // Nếu app chưa inject (test/migration) → service tự fallback compensation.
    const mongoClient = req.app?.locals?.mongoClient || null;

    const result = await SanXuatService.produce({
      san_pham_id,
      so_luong_sx: qty,
      ghi_chu: String(ghi_chu).trim(),
      mongoClient,
    });

    if (result?.error) {
      const msg = result.error.message || "Tạo lệnh sản xuất thất bại";
      // "Không đủ nguyên liệu" kèm `lack` — truyền data đính kèm cho FE xử lý.
      if (msg === "Không đủ nguyên liệu") {
        throw ApiError.badRequest(msg, "INSUFFICIENT_STOCK", result.lack || null);
      }
      // Các lỗi user-facing còn lại (BOM thiếu, SP không tồn tại, ...)
      throw ApiError.badRequest(msg, "VALIDATION_ERROR");
    }

    // Side effects sau khi ghi kho thành công
    const createdBy = {
      tai_khoan: req.user.tai_khoan,
      ho_ten:    req.user.ho_ten,
    };

    notifyApprover({
      type: "SX_CREATED",
      id:   result.logId,
      san_pham_id,
      so_luong_sx: qty,
      unit_cost:   result.unitCost,
      total_cost:  result.totalCost,
      ghi_chu:     String(ghi_chu).trim(),
      created_by:  createdBy,
    });

    logAction(
      "CREATE",
      "san_xuat",
      result.logId?.toString(),
      `Sản xuất ${qty} SP (san_pham_id=${san_pham_id}) — tổng chi phí ${result.totalCost}`,
      createdBy,
      req.ip
    );

    return sendSuccess(res, result, "Tạo lệnh sản xuất thành công", 201);
  });

  /* ─── GET LOGS (lịch sử lô sản xuất) ─── */
  static getLogs = asyncHandler(async (req, res) => {
    const { san_pham_id, page = 1, limit = 20 } = req.query;

    if (san_pham_id && !ObjectId.isValid(san_pham_id)) {
      throw ApiError.badRequest("san_pham_id không phải ObjectId hợp lệ", "VALIDATION_ERROR");
    }

    const result = await SanXuatService.getLogs({
      san_pham_id: san_pham_id || undefined,
      page:  Number(page)  || 1,
      limit: Number(limit) || 20,
    });

    const pagination = buildPagination(result.page, result.limit, result.total);
    return sendSuccess(res, result.items, "Lấy lịch sử sản xuất thành công", 200, pagination);
  });
}