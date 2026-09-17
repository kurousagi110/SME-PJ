// Refactored: 2026-04-02 | Issues fixed: C1, C2, C3, C4, C5 | Original: donHangControllers.js
// C5: MongoDB session/transaction logic REMOVED from here → moved to DonHangService

import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess, buildPagination } from "../utils/response.js";
import DonHangService from "../services/donHangService.js";
import { notifyAdmin, notifyApprover } from "../utils/socketManager.js";
import { logAction } from "../utils/auditLogger.js";
import { performedByOf } from "../utils/auditIdentity.js";
import ApiError from "../utils/ApiError.js";
import logger from "../utils/logger.js";
import SoQuyDAO from "../models/soQuyDAO.js";

export default class DonHangController {
  /* ─── CREATE POS ORDER (Bán lẻ tại quầy) ─── */
  static createPOS = asyncHandler(async (req, res) => {
    const performedBy = performedByOf(req);
    const userId = performedBy?.user_id || req.user?._id;
    const body = req.body || {};

    const {
      khach_hang_ten = "Khách lẻ tại quầy",
      san_pham = [],
      giam_gia = 0,
      thue_rate = 0,
      phi_vc = 0,
      phuong_thuc_tt = "tien_mat",
      tien_khach_dua = 0,
      ghi_chu = "Bán lẻ tại quầy (POS)",
      so_dien_thoai = "",
    } = body;

    if (!san_pham || !san_pham.length) {
      throw ApiError.badRequest("Giỏ hàng POS cần ít nhất 1 sản phẩm", "EMPTY_CART");
    }

    // 1. Create order with confirmed status
    const createResult = await DonHangService.create({
      loai_don: "sale",
      khach_hang_ten,
      san_pham,
      giam_gia: Number(giam_gia) || 0,
      thue_rate: Number(thue_rate) || 0,
      phi_vc: Number(phi_vc) || 0,
      ghi_chu,
      trang_thai: "confirmed",
    }, userId);

    const orderId = createResult.insertedId || createResult.id;
    const ma_dh = createResult.ma_dh;

    // 2. Transition to completed (this automatically checks stock and deducts inventory!)
    const statusResult = await DonHangService.updateStatus(orderId, "completed", {
      mongoClient: req.app?.locals?.mongoClient,
      nguoi_thao_tac_id: userId,
    });
    if (statusResult?.error) {
      throw ApiError.badRequest(statusResult.error.message || "Không thể xuất kho sản phẩm");
    }

    // 3. Fetch full completed order to get final totals
    const orderDoc = await DonHangService.getById(orderId);

    // 4. Automatically create receipt in so_quy
    try {
      await SoQuyDAO.taoPhieu({
        loai_phieu: "thu",
        hang_muc: "thu_tien_ban_hang",
        so_tien: orderDoc.tong_tien || 0,
        phuong_thuc: phuong_thuc_tt === "chuyen_khoan" ? "chuyen_khoan" : "tien_mat",
        doi_tuong: {
          loai: "khach_hang",
          ten: khach_hang_ten,
          so_dien_thoai,
          dia_chi: "",
        },
        ma_chung_tu: ma_dh,
        ghi_chu: `Thu tiền đơn POS ${ma_dh}`,
        user: req.user,
      });
    } catch (e) {
      logger.warn("Auto create POS receipt in so_quy warning", { error: e.message });
    }

    const payload = { type: "SALE_COMPLETED", id: orderId, loai: "sale", created_by: performedBy };
    notifyAdmin(payload);
    notifyApprover(payload);
    logAction("CREATE_POS", "sale", orderId.toString(), `Bán lẻ POS: ${ma_dh}`, performedBy, req.ip);

    return sendSuccess(res, {
      order: orderDoc,
      ma_dh,
      tien_khach_dua: Number(tien_khach_dua) || orderDoc.tong_tien,
      tien_thoi: Math.max(0, (Number(tien_khach_dua) || orderDoc.tong_tien) - (orderDoc.tong_tien || 0)),
    }, "Thanh toán đơn hàng POS thành công", 201);
  });

  /* ─── CREATE ─── */
  static create = asyncHandler(async (req, res) => {
    const body = { ...(req.body || {}) };
    const nguoi_lap_id = req.user?._id || req.user?.id || null;
    const data = await DonHangService.create(body, nguoi_lap_id);

    const loai = body.loai_don || "don_hang";
    const performedBy = performedByOf(req);
    const payload = { type: `${loai.toUpperCase()}_CREATED`, id: data._id || data.insertedId, loai, created_by: performedBy };
    notifyAdmin(payload);
    notifyApprover(payload);
    logAction("CREATE", loai, data._id?.toString() || data.insertedId?.toString(), `Tạo đơn hàng loại: ${loai}`, performedBy, req.ip);

    return sendSuccess(res, data, "Tạo chứng từ thành công", 201);
  });

  /* ─── GET BY ID ─── */
  static getById = asyncHandler(async (req, res) => {
    const doc = await DonHangService.getById(req.params.id);
    return sendSuccess(res, doc, "Lấy chứng từ thành công");
  });

  /* ─── GET BY CODE ─── */
  static getByCode = asyncHandler(async (req, res) => {
    const doc = await DonHangService.getByCode(req.params.ma_dh);
    return sendSuccess(res, doc, "Lấy chứng từ theo mã thành công");
  });

  /* ─── LIST ─── */
  static list = asyncHandler(async (req, res) => {
    const { q = "", loai_don, khach_hang_ten, nha_cung_cap_ten, nguoi_lap_id,
            trang_thai, date_from, date_to, page = 1, limit = 20,
            sortBy = "created_at", order = "desc", includeDeleted } = req.query;

    const result = await DonHangService.list({
      q, loai_don, khach_hang_ten, nha_cung_cap_ten, nguoi_lap_id,
      trang_thai, date_from, date_to,
      page: Number(page), limit: Number(limit), sortBy, order,
      includeDeleted: includeDeleted === "true" || includeDeleted === true,
    });
    const pagination = buildPagination(result.page ?? page, result.limit ?? limit, result.total ?? 0);
    return sendSuccess(res, result.don_hang ?? result.items ?? result, "Lấy danh sách thành công", 200, pagination);
  });

  /* ─── PRODUCTION NEEDS ─── */
  static productionNeeds = asyncHandler(async (req, res) => {
    const data = await DonHangService.productionNeeds(req.params.id);
    return sendSuccess(res, data, "Lấy nhu cầu nguyên liệu thành công");
  });

  /* ─── ITEMS ─── */
  static updateItems = asyncHandler(async (req, res) => {
    const { san_pham } = req.body || {};
    const data = await DonHangService.updateItems(req.params.id, san_pham);
    return sendSuccess(res, data, "Cập nhật sản phẩm trong đơn thành công");
  });

  static addItem = asyncHandler(async (req, res) => {
    const data = await DonHangService.addItem(req.params.id, req.body || {});
    return sendSuccess(res, data, "Thêm sản phẩm vào đơn thành công");
  });

  static removeItem = asyncHandler(async (req, res) => {
    const { idx, code } = req.body || {};
    const data = await DonHangService.removeItem(req.params.id, { idx, code });
    return sendSuccess(res, data, "Xóa sản phẩm khỏi đơn thành công");
  });

  /* ─── PRICING ─── */
  static applyDiscount = asyncHandler(async (req, res) => {
    const data = await DonHangService.applyDiscount(req.params.id, req.body?.giam_gia);
    return sendSuccess(res, data, "Áp dụng giảm giá thành công");
  });

  static applyTax = asyncHandler(async (req, res) => {
    const data = await DonHangService.applyTax(req.params.id, req.body?.thue_rate);
    return sendSuccess(res, data, "Áp dụng thuế thành công");
  });

  static setShippingFee = asyncHandler(async (req, res) => {
    const data = await DonHangService.setShippingFee(req.params.id, req.body?.phi_vc);
    return sendSuccess(res, data, "Cập nhật phí vận chuyển thành công");
  });

  /* ─── PAYMENT / NOTE ─── */
  static updatePayment = asyncHandler(async (req, res) => {
    const data = await DonHangService.updatePayment(req.params.id, req.body || {});
    return sendSuccess(res, data, "Cập nhật thanh toán thành công");
  });

  static updateNote = asyncHandler(async (req, res) => {
    const data = await DonHangService.updateNote(req.params.id, req.body?.ghi_chu);
    return sendSuccess(res, data, "Cập nhật ghi chú thành công");
  });

  /* ─── UPDATE STATUS (transaction managed in service) ─── */
  static updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { trang_thai } = req.body || {};
    const mongoClient = req.app?.locals?.mongoClient;
    const nguoi_thao_tac_id = req.user?._id || req.user?.id || null;
    const data = await DonHangService.updateStatus(id, trang_thai, { mongoClient, nguoi_thao_tac_id });

    const performedBy = performedByOf(req);
    const loai = data.loai_don || "don_hang";
    const isApprove = ["da_duyet", "hoan_thanh"].includes(trang_thai);
    const payload = { type: `${loai.toUpperCase()}_STATUS_UPDATED`, id, trang_thai, updated_by: performedBy };
    if (isApprove) notifyApprover(payload); else notifyAdmin(payload);
    logAction("UPDATE_STATUS", loai, id, `Cập nhật trạng thái đơn hàng → ${trang_thai}`, performedBy, req.ip);

    return sendSuccess(res, data, "Cập nhật trạng thái đơn hàng thành công");
  });

  /* ─── DELETE / RESTORE ─── */
  static softDelete = asyncHandler(async (req, res) => {
    const data = await DonHangService.softDelete(req.params.id);

    const performedBy = performedByOf(req);
    const loai = data.loai_don || "don_hang";
    notifyAdmin({ type: `${loai.toUpperCase()}_DELETED`, id: req.params.id, deleted_by: performedBy });
    logAction("SOFT_DELETE", loai, req.params.id, `Xóa mềm đơn hàng loại: ${loai}`, performedBy, req.ip);

    return sendSuccess(res, data, "Xóa mềm chứng từ thành công");
  });

  static restore = asyncHandler(async (req, res) => {
    const data = await DonHangService.restore(req.params.id);

    const performedBy = performedByOf(req);
    const loai = data.loai_don || "don_hang";
    logAction("RESTORE", loai, req.params.id, `Khôi phục đơn hàng loại: ${loai}`, performedBy, req.ip);

    return sendSuccess(res, data, "Khôi phục chứng từ thành công");
  });

  static hardDelete = asyncHandler(async (req, res) => {
    const data = await DonHangService.hardDelete(req.params.id);

    const performedBy = performedByOf(req);
    notifyAdmin({ type: "DON_HANG_HARD_DELETED", id: req.params.id, deleted_by: performedBy });
    logAction("HARD_DELETE", "don_hang", req.params.id, `Xóa vĩnh viễn đơn hàng`, performedBy, req.ip);

    return sendSuccess(res, data, "Xóa vĩnh viễn chứng từ thành công");
  });

  /* ─── REVENUE STATS ─── */
  static revenueStats = asyncHandler(async (req, res) => {
    const { date_from, date_to } = req.query;
    const data = await DonHangService.revenueStats({ date_from, date_to });
    return sendSuccess(res, data, "Thống kê doanh thu thành công");
  });
}
