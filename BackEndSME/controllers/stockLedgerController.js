import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import StockLedgerDAO from "../models/stockLedgerDAO.js";

export default class StockLedgerController {
  /* ─── 1. Thẻ Kho Chi Tiết Mặt Hàng ─── */
  static getStockCard = asyncHandler(async (req, res) => {
    const { itemId, itemType = "product", tu_ngay, den_ngay } = req.query;

    if (!itemId) {
      throw ApiError.badRequest("Cần cung cấp mã hoặc ID mặt hàng (itemId)");
    }

    const result = await StockLedgerDAO.getStockCard({
      itemId,
      itemType,
      tu_ngay,
      den_ngay,
    });

    if (result.error) throw ApiError.badRequest(result.error.message);

    return sendSuccess(res, result, "Lấy dữ liệu thẻ kho thành công");
  });

  /* ─── 2. Báo Cáo Xuất - Nhập - Tồn ─── */
  static getInOutBalanceReport = asyncHandler(async (req, res) => {
    const { itemType = "all", tu_ngay, den_ngay, search } = req.query;

    const result = await StockLedgerDAO.getInOutBalanceReport({
      itemType,
      tu_ngay,
      den_ngay,
      search,
    });

    if (result.error) throw ApiError.badRequest(result.error.message);

    return sendSuccess(res, result, "Lấy báo cáo xuất - nhập - tồn thành công");
  });
}
