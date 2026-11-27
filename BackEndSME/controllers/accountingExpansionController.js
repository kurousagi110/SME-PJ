import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import FixedAssetDAO from "../models/fixedAssetDAO.js";
import { logAction } from "../utils/auditLogger.js";
import { performedByOf } from "../utils/auditIdentity.js";

export default class AccountingExpansionController {
  /** GET /api/v1/accounting/vat-report */
  static getVatReport = asyncHandler(async (req, res) => {
    const { year, month, quarter } = req.query;
    const data = await FixedAssetDAO.getVatReport({
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : null,
      quarter: quarter ? Number(quarter) : null,
    });
    if (data?.error) throw ApiError.internal(data.error.message);
    return sendSuccess(res, data, "Tổng hợp bảng kê thuế GTGT thành công");
  });

  /** GET /api/v1/accounting/assets */
  static listAssets = asyncHandler(async (req, res) => {
    const data = await FixedAssetDAO.listAssets();
    if (data?.error) throw ApiError.internal(data.error.message);
    return sendSuccess(res, data, "Lấy danh mục tài sản cố định thành công");
  });

  /** POST /api/v1/accounting/assets */
  static createAsset = asyncHandler(async (req, res) => {
    const result = await FixedAssetDAO.createAsset(req.body || {}, req.user);
    if (result?.error) throw ApiError.badRequest(result.error.message);
    logAction("CREATE_FIXED_ASSET", "fixed_asset", String(result.doc._id), `Thêm TSCĐ ${result.doc.ma_tai_san}`, performedByOf(req), req.ip);
    return sendSuccess(res, result.doc, `Đã thêm tài sản cố định ${result.doc.ma_tai_san}`, 201);
  });

  /** POST /api/v1/accounting/assets/:id/maintenance */
  static addMaintenance = asyncHandler(async (req, res) => {
    const result = await FixedAssetDAO.addMaintenanceLog(req.params.id, req.body || {}, req.user);
    if (result?.error) throw ApiError.badRequest(result.error.message);
    return sendSuccess(res, result.doc, "Đã ghi nhận nhật ký bảo trì máy móc/thiết bị");
  });

  /** POST /api/v1/accounting/assets/depreciate */
  static runDepreciation = asyncHandler(async (req, res) => {
    const { month, year, post_to_cashbook = false } = req.body || {};
    const result = await FixedAssetDAO.runMonthlyDepreciation({
      month,
      year,
      postToCashbook: Boolean(post_to_cashbook),
      user: req.user,
    });
    if (result?.error) throw ApiError.badRequest(result.error.message);
    logAction(
      "RUN_DEPRECIATION",
      "fixed_asset",
      result.doc.period_key,
      `Trích khấu hao TSCĐ kỳ ${result.doc.period_key}: ${result.doc.total_depreciation.toLocaleString("vi-VN")} đ`,
      performedByOf(req),
      req.ip
    );
    return sendSuccess(res, result.doc, `Đã trích khấu hao kỳ ${result.doc.period_key} thành công`);
  });

  /** GET /api/v1/accounting/budgets */
  static getBudgetVsActual = asyncHandler(async (req, res) => {
    const { year, month } = req.query;
    const data = await FixedAssetDAO.getBudgetVsActual({
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
    });
    if (data?.error) throw ApiError.internal(data.error.message);
    return sendSuccess(res, data, "Lấy báo cáo Dự toán Ngân sách thành công");
  });

  /** POST /api/v1/accounting/budgets */
  static upsertBudget = asyncHandler(async (req, res) => {
    const result = await FixedAssetDAO.upsertBudget({ ...(req.body || {}), user: req.user });
    if (result?.error) throw ApiError.badRequest(result.error.message);
    logAction("UPSERT_BUDGET", "budget", String(result.doc._id || ""), `Thiết lập ngân sách phòng ${result.doc.department}`, performedByOf(req), req.ip);
    return sendSuccess(res, result.doc, "Đã lưu hạn mức ngân sách phòng ban");
  });
}
