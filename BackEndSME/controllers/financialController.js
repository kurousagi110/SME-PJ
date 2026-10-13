import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import FinancialReportDAO from "../models/financialReportDAO.js";
import DoiTacDAO from "../models/doiTacDAO.js";
import ApiError from "../utils/ApiError.js";

export default class FinancialController {
  /**
   * Báo cáo Kết quả Kinh doanh Lãi - Lỗ (P&L)
   * GET /api/v1/financial/pnl?date_from=...&date_to=...&year=2026&month=10
   */
  static getPNL = asyncHandler(async (req, res) => {
    const { date_from, date_to, year, month } = req.query;
    const report = await FinancialReportDAO.getProfitAndLoss({
      date_from,
      date_to,
      year,
      month,
    });

    if (report?.error) {
      throw ApiError.badRequest(report.error);
    }

    return sendSuccess(res, report, "Lấy báo cáo Lãi - Lỗ (P&L) thành công");
  });

  /**
   * Hiệu quả Sinh lời theo từng Sản phẩm
   * GET /api/v1/financial/product-profitability?date_from=...&date_to=...&limit=20
   */
  static getProductProfitability = asyncHandler(async (req, res) => {
    const { date_from, date_to, limit } = req.query;
    const result = await FinancialReportDAO.getProductProfitability({
      date_from,
      date_to,
      limit,
    });

    if (result?.error) {
      throw ApiError.badRequest(result.error);
    }

    return sendSuccess(res, result, "Lấy phân tích hiệu quả sản phẩm thành công");
  });

  /**
   * Phân tích Tuổi Nợ (Aging Debt)
   * GET /api/v1/financial/aging-debt?type=customer|supplier&partner_id=...
   */
  static getAgingDebt = asyncHandler(async (req, res) => {
    const { type = "customer", partner_id } = req.query;
    const result = await FinancialReportDAO.getAgingDebtReport({
      type,
      partner_id,
    });

    if (result?.error) {
      throw ApiError.badRequest(result.error);
    }

    return sendSuccess(res, result, "Lấy báo cáo phân tích tuổi nợ thành công");
  });

  /**
   * Tra cứu hạn mức công nợ của đối tác
   * GET /api/v1/financial/credit-limit/:partnerId?orderAmount=10000000
   */
  static checkCreditLimit = asyncHandler(async (req, res) => {
    const { partnerId } = req.params;
    const { orderAmount = 0 } = req.query;

    const result = await DoiTacDAO.checkCreditLimit(partnerId, Number(orderAmount));
    return sendSuccess(res, result, "Kiểm tra hạn mức công nợ thành công");
  });

  /**
   * Chạy quét và cập nhật lại COGS lịch sử
   * POST /api/v1/financial/recalculate-cogs
   */
  static recalculateCOGS = asyncHandler(async (req, res) => {
    const result = await FinancialReportDAO.recalculateHistoricalCOGS();
    return sendSuccess(res, result, "Đã tính toán lại giá vốn cho các đơn hàng");
  });
}
