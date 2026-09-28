import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import QuotationDAO from "../models/quotationDAO.js";
import { logAction } from "../utils/auditLogger.js";
import { performedByOf } from "../utils/auditIdentity.js";
import { sendWebhookNotification } from "../utils/webhookNotifier.js";

export default class QuotationController {
  /* ─── 1. Danh sách báo giá ─── */
  static list = asyncHandler(async (req, res) => {
    const { trang_thai, search, page = 1, limit = 20 } = req.query;
    const result = await QuotationDAO.list({ trang_thai, search, page, limit });
    if (result.error) throw ApiError.internal(result.error.message);
    return sendSuccess(res, result, "Lấy danh sách báo giá thành công");
  });

  /* ─── 2. Chi tiết 1 báo giá ─── */
  static getByCode = asyncHandler(async (req, res) => {
    const { ma_bao_gia } = req.params;
    const doc = await QuotationDAO.getByCode(ma_bao_gia);
    if (!doc) throw ApiError.notFound("Không tìm thấy báo giá");
    return sendSuccess(res, doc, "Lấy chi tiết báo giá thành công");
  });

  /* ─── 3. Tạo báo giá mới ─── */
  static create = asyncHandler(async (req, res) => {
    const { khach_hang, ngay_het_han, items, thue_vat, dieu_khoan, ghi_chu } = req.body || {};
    if (!khach_hang || !khach_hang.ten) {
      throw ApiError.badRequest("Cần cung cấp thông tin tên khách hàng");
    }
    if (!Array.isArray(items) || !items.length) {
      throw ApiError.badRequest("Báo giá cần có ít nhất 1 sản phẩm");
    }

    const user = req.user || performedByOf(req) || {};
    const result = await QuotationDAO.create({
      khach_hang,
      ngay_het_han,
      items,
      thue_vat,
      dieu_khoan,
      ghi_chu,
      user,
    });

    if (result.error) throw ApiError.badRequest(result.error.message);

    logAction("CREATE_QUOTATION", "bao_gia", result.doc?.ma_bao_gia, `Tạo báo giá ${result.doc?.ma_bao_gia} cho ${khach_hang.ten}`, user, req.ip);

    sendWebhookNotification({
      event: "QUOTATION_CREATED",
      title: "Báo Giá B2B Mới",
      message: `Báo giá ${result.doc?.ma_bao_gia} gửi khách hàng ${khach_hang.ten} trị giá ${(result.doc?.tong_thanh_toan || 0).toLocaleString()} VNĐ đã được tạo.`,
      data: { ma_bao_gia: result.doc?.ma_bao_gia },
    }).catch(() => {});

    return sendSuccess(res, result.doc, "Tạo báo giá thành công", 201);
  });

  /* ─── 4. Cập nhật trạng thái báo giá ─── */
  static updateStatus = asyncHandler(async (req, res) => {
    const { ma_bao_gia } = req.params;
    const { trang_thai } = req.body || {};
    if (!trang_thai) throw ApiError.badRequest("Thiếu trạng thái cập nhật");

    const user = req.user || performedByOf(req) || {};
    const result = await QuotationDAO.updateStatus(ma_bao_gia, trang_thai, user);
    if (result.error) throw ApiError.badRequest(result.error.message);

    logAction("UPDATE_STATUS_QUOTATION", "bao_gia", ma_bao_gia, `Cập nhật trạng thái báo giá ${ma_bao_gia} -> ${trang_thai}`, user, req.ip);
    return sendSuccess(res, result, "Cập nhật trạng thái báo giá thành công");
  });

  /* ─── 5. Chuyển Báo Giá thành Đơn Hàng (Quote-to-Order) ─── */
  static convertToOrder = asyncHandler(async (req, res) => {
    const { ma_bao_gia } = req.params;
    const user = req.user || performedByOf(req) || {};

    const result = await QuotationDAO.convertToOrder(ma_bao_gia, user);
    if (result.error) throw ApiError.badRequest(result.error.message);

    logAction("CONVERT_QUOTATION_TO_ORDER", "bao_gia", ma_bao_gia, `Chuyển đổi báo giá ${ma_bao_gia} thành Đơn hàng ${result.ma_dh}`, user, req.ip);

    sendWebhookNotification({
      event: "QUOTATION_CONVERTED",
      title: "Báo Giá Đã Chốt & Chuyển Thành Đơn Hàng",
      message: `Báo giá ${ma_bao_gia} đã được khách hàng đồng ý và tự động chuyển đổi thành Đơn Hàng ${result.ma_dh}.`,
      data: { ma_bao_gia, ma_dh: result.ma_dh },
    }).catch(() => {});

    return sendSuccess(res, result, `Chuyển đổi thành Đơn hàng ${result.ma_dh} thành công!`);
  });

  /* ─── 6. Xóa báo giá ─── */
  static delete = asyncHandler(async (req, res) => {
    const { ma_bao_gia } = req.params;
    const result = await QuotationDAO.delete(ma_bao_gia);
    if (result.error) throw ApiError.badRequest(result.error.message);
    return sendSuccess(res, result, "Xóa báo giá thành công");
  });
}
