import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import EcommerceSyncDAO from "../models/ecommerceSyncDAO.js";
import { EInvoiceService } from "../services/einvoiceService.js";
import { LogisticsService } from "../services/logisticsService.js";
import { logAction } from "../utils/auditLogger.js";
import { performedByOf } from "../utils/auditIdentity.js";

export default class EcommerceSyncController {
  /** GET /api/v1/ecommerce-sync/overview */
  static getOverview = asyncHandler(async (req, res) => {
    const data = await EcommerceSyncDAO.listChannels();
    if (data?.error) throw ApiError.internal(data.error.message);
    return sendSuccess(res, {
      ...data,
      adapters: {
        einvoice: EInvoiceService.getAdapterStatus(),
        logistics: LogisticsService.getAdapterStatus(),
      },
    }, "Lấy dữ liệu đồng bộ đa kênh TMĐT thành công");
  });

  /** POST /api/v1/ecommerce-sync/channels */
  static upsertChannel = asyncHandler(async (req, res) => {
    const result = await EcommerceSyncDAO.upsertChannel(req.body || {}, req.user);
    if (result?.error) throw ApiError.badRequest(result.error.message);
    logAction("UPSERT_ECOMMERCE_CHANNEL", "ecommerce", String(result.doc._id || ""), `Cấu hình shop ${result.doc.shop_name}`, performedByOf(req), req.ip);
    return sendSuccess(res, result.doc, "Đã lưu cấu hình gian hàng TMĐT", 201);
  });

  /** POST /api/v1/ecommerce-sync/mappings */
  static upsertMapping = asyncHandler(async (req, res) => {
    const result = await EcommerceSyncDAO.upsertSkuMapping(req.body || {});
    if (result?.error) throw ApiError.badRequest(result.error.message);
    return sendSuccess(res, result.doc, "Đã lưu ánh xạ SKU sàn TMĐT");
  });

  /** POST /api/v1/ecommerce-sync/channels/:id/sync-inventory */
  static syncInventory = asyncHandler(async (req, res) => {
    const result = await EcommerceSyncDAO.syncInventory(req.params.id, req.user);
    if (result?.error) throw ApiError.badRequest(result.error.message);
    return sendSuccess(res, result, `Đã đồng bộ tồn kho an toàn cho ${result.syncedItems.length} SKU`);
  });

  /** POST /api/v1/ecommerce-sync/channels/:id/import-order */
  static importOrder = asyncHandler(async (req, res) => {
    const result = await EcommerceSyncDAO.importOrder(req.params.id, req.body || {}, req.user);
    if (result?.error) throw ApiError.badRequest(result.error.message);
    return sendSuccess(res, result, "Đã kéo đơn hàng sàn về hệ thống SME thành công", 201);
  });

  /** POST /api/v1/ecommerce-sync/channels/:id/settle-payout */
  static settlePayout = asyncHandler(async (req, res) => {
    const result = await EcommerceSyncDAO.settlePayout(req.params.id, req.body || {}, req.user);
    if (result?.error) throw ApiError.badRequest(result.error.message);
    logAction(
      "SETTLE_ECOMMERCE_PAYOUT",
      "ecommerce",
      String(req.params.id),
      `Quyết toán tiền sàn TMĐT: ${result.settlement.net_payout.toLocaleString("vi-VN")} đ`,
      performedByOf(req),
      req.ip
    );
    return sendSuccess(res, result, "Đã quyết toán tiền sàn & ghi nhận Phiếu Thu vào Sổ Quỹ");
  });
}
