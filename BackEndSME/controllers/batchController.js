import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import BatchDAO from "../models/batchDAO.js";
import { logAction } from "../utils/auditLogger.js";

export default class BatchController {
  /**
   * Lấy danh sách lô hàng & cảnh báo cận hạn
   * GET /api/v1/batches
   */
  static list = asyncHandler(async (req, res) => {
    const { item_id, item_type, search, can_date_days, page, limit } = req.query;

    const result = await BatchDAO.listBatches({
      item_id,
      item_type,
      search,
      can_date_days,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });

    if (result.error) {
      throw ApiError.internal("Không thể lấy danh sách lô: " + result.error.message);
    }

    return sendSuccess(res, result, "Lấy danh sách lô thành công");
  });

  /**
   * Tạo số lô mới
   * POST /api/v1/batches
   */
  static create = asyncHandler(async (req, res) => {
    const {
      so_lo,
      item_type,
      item_id,
      ma_hang,
      ten_hang,
      so_luong_nhap,
      ngay_san_xuat,
      han_su_dung,
      nha_san_xuat,
      ghi_chu,
    } = req.body;

    if (!ma_hang || !ten_hang || !so_luong_nhap) {
      throw ApiError.badRequest("Vui lòng cung cấp mã hàng, tên hàng và số lượng nhập");
    }

    const result = await BatchDAO.taoLo({
      so_lo,
      item_type,
      item_id,
      ma_hang,
      ten_hang,
      so_luong_nhap,
      ngay_san_xuat,
      han_su_dung,
      nha_san_xuat,
      ghi_chu,
      user: req.user,
    });

    if (result.error) {
      throw ApiError.internal("Lỗi tạo lô sản xuất: " + result.error.message);
    }

    logAction({
      req,
      action: "CREATE_BATCH",
      target: "BATCH",
      targetId: String(result.data._id),
      details: { so_lo: result.data.so_lo, ma_hang, so_luong: so_luong_nhap },
      status: "SUCCESS",
    });

    return sendSuccess(res, result.data, "Tạo lô hàng thành công", 201);
  });

  /**
   * Gợi ý xuất kho theo FEFO
   * GET /api/v1/batches/fefo-suggest?item_id=xxx&requestedQty=10
   */
  static fefoSuggest = asyncHandler(async (req, res) => {
    const { item_id, requestedQty } = req.query;

    if (!item_id || !requestedQty) {
      throw ApiError.badRequest("Thiếu item_id hoặc requestedQty");
    }

    const result = await BatchDAO.suggestFEFO(item_id, Number(requestedQty));
    if (result.error) {
      throw ApiError.internal("Lỗi tính toán FEFO: " + result.error.message);
    }

    return sendSuccess(res, result, "Gợi ý phân bổ xuất kho FEFO thành công");
  });
}
