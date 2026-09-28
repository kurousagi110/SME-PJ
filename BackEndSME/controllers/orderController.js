// Refactored: 2026-04-02 | Issues fixed: C1, C2, C3, C4, C5 | Original: donHangControllers.js
// C5: MongoDB session/transaction logic REMOVED from here → moved to DonHangService

import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess, buildPagination } from "../utils/response.js";
import DonHangService from "../services/donHangService.js";
import { notifyAdmin, notifyApprover, notifyDepartment, notifyUser } from "../utils/socketManager.js";
import { logAction } from "../utils/auditLogger.js";
import { performedByOf } from "../utils/auditIdentity.js";
import ApiError from "../utils/ApiError.js";
import logger from "../utils/logger.js";
import SoQuyDAO from "../models/soQuyDAO.js";
import DoiTacDAO from "../models/doiTacDAO.js";
import VanChuyenDAO from "../models/vanChuyenDAO.js";
import { getDB } from "../config/database.js";
import { ObjectId } from "mongodb";

export class OrderController {
  /* ─── CREATE POS ORDER (Bán lẻ tại quầy) ─── */
  static createPOS = asyncHandler(async (req, res) => {
    const performedBy = performedByOf(req);
    const userId = performedBy?.user_id || req.user?._id;
    const body = req.body || {};

    const khach_hang_ten = body.customer_name || body.customerName || body.khach_hang_ten || "Khách lẻ tại quầy";
    const san_pham = body.items || body.products || body.san_pham || [];
    const giam_gia = body.discount ?? body.giam_gia ?? 0;
    const thue_rate = body.tax_rate ?? body.taxRate ?? body.thue_rate ?? 0;
    const phi_vc = body.shipping_fee ?? body.shippingFee ?? body.phi_vc ?? 0;
    const phuong_thuc_tt = body.payment_method ?? body.paymentMethod ?? body.phuong_thuc_tt ?? "tien_mat";
    const tien_khach_dua = body.amount_paid ?? body.amountPaid ?? body.tien_khach_dua ?? 0;
    const ghi_chu = body.note ?? body.notes ?? body.ghi_chu ?? "Bán lẻ tại quầy (POS)";
    const so_dien_thoai = body.phone ?? body.phone_number ?? body.so_dien_thoai ?? "";

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

    // 4. Automatically create receipt in so_quy (Closed-Loop)
    const receiptRes = await SoQuyDAO.taoPhieu({
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
    if (receiptRes?.error) {
      logger.error("Auto create POS receipt in so_quy failed", { error: receiptRes.error.message });
      throw ApiError.badRequest(`Không thể ghi nhận phiếu thu sổ quỹ cho đơn POS: ${receiptRes.error.message}`);
    }

    // 4.1 Auto-link or create customer in Mini CRM if phone provided
    if (so_dien_thoai && so_dien_thoai.trim()) {
      try {
        const cleanPhone = so_dien_thoai.trim();
        const existingPartner = await DoiTacDAO.timTheoSDT(cleanPhone);
        if (!existingPartner) {
          await DoiTacDAO.taoDoiTac({
            ten: khach_hang_ten || "Khách lẻ tại quầy",
            so_dien_thoai: cleanPhone,
            loai_doi_tac: "khach_hang",
            nhom: "khach_le",
            dia_chi: "",
            ghi_chu: `Khách hàng tự động tạo từ quầy POS (${ma_dh})`,
            user: req.user,
          });
        }
      } catch (crmErr) {
        logger.warn("Auto create CRM partner in POS warning", { error: crmErr.message });
      }
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
    const orderCode = data.ma_dh || data.insertedId?.toString();
    const payload = {
      type: `${loai.toUpperCase()}_CREATED`,
      id: data._id || data.insertedId,
      ma_dh: orderCode,
      loai,
      created_by: performedBy,
    };
    notifyAdmin(payload);
    notifyApprover(payload);
    logAction("CREATE", loai, data._id?.toString() || data.insertedId?.toString(), `Tạo đơn hàng loại: ${loai} (${orderCode})`, performedBy, req.ip);

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
    let rawRate = Number(req.body?.thue_rate ?? req.body?.tax_rate ?? 0);
    const normalizedRate = rawRate > 1 ? rawRate / 100 : rawRate;
    const data = await DonHangService.applyTax(req.params.id, normalizedRate);
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

  /* ─── THANH TOÁN ĐƠN MUA HÀNG & TỰ ĐỘNG TẠO PHIẾU CHI (Closed-loop) ─── */
  static thanhToanDonMua = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { phuong_thuc = "chuyen_khoan", ghi_chu = "", so_tien } = req.body || {};

    const order = await DonHangService.getById(id);
    if (!order) throw ApiError.notFound("Không tìm thấy đơn mua hàng");

    const payAmount = Number(so_tien) || order.tong_tien || 0;
    if (payAmount <= 0) {
      throw ApiError.badRequest("Số tiền thanh toán phải > 0");
    }

    const nccTen = order.nha_cung_cap_ten || order.nha_cung_cap?.ten || "Nhà cung cấp";
    const ma_dh = order.ma_dh || id;

    // 1. Tạo Phiếu Chi trong sổ quỹ
    let phieuChi = null;
    try {
      phieuChi = await SoQuyDAO.taoPhieu({
        loai_phieu: "chi",
        hang_muc: "chi_tien_mua_hang",
        so_tien: payAmount,
        phuong_thuc: phuong_thuc === "tien_mat" ? "tien_mat" : "chuyen_khoan",
        doi_tuong: {
          loai: "nha_cung_cap",
          ten: nccTen,
          so_dien_thoai: order.nha_cung_cap?.so_dien_thoai || "",
          dia_chi: order.nha_cung_cap?.dia_chi || "",
        },
        ma_chung_tu: ma_dh,
        ghi_chu: ghi_chu || `Thanh toán tiền mua hàng đơn ${ma_dh}`,
        user: req.user,
      });
    } catch (e) {
      logger.error("Tao phieu chi so_quy loi", { error: e.message });
      throw ApiError.internal("Không thể tạo phiếu chi sổ quỹ: " + e.message);
    }

    // 2. Cập nhật trạng thái thanh toán trên đơn mua hàng
    await DonHangService.updatePayment(id, {
      status: "paid",
      phuong_thuc,
      so_tien_da_tra: payAmount,
      ngay_thanh_toan: new Date(),
      ma_phieu_chi: phieuChi?.doc?.ma_phieu || "",
    });

    const performedBy = performedByOf(req);
    logAction("PAYMENT", "purchase_receipt", id, `Thanh toán đơn mua ${ma_dh}: ${payAmount} đ`, performedBy, req.ip);

    return sendSuccess(res, {
      order_id: id,
      ma_dh,
      so_tien_da_tra: payAmount,
      phieu_chi: phieuChi?.doc,
    }, "Thanh toán đơn mua hàng và tạo phiếu chi thành công");
  });

  static updateNote = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { ghi_chu } = req.body || {};
    const data = await DonHangService.updateNote(id, ghi_chu);
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
    const orderCode = data.ma_dh || id;

    // ─── CLOSED-LOOP: Auto-Posting Sổ quỹ & Công nợ ───
    // Khi đơn bán hàng (sale) sang trạng thái 'paid' hoặc 'completed', hoặc đơn mua hàng (purchase_receipt) sang 'paid'
    try {
      const orderDoc = await DonHangService.getById(id);
      if (orderDoc && !orderDoc.error) {
        const orderTotal = Number(orderDoc.tong_tien) || 0;
        const code = orderDoc.ma_dh || orderCode;

        if (orderDoc.loai_don === "sale" && (trang_thai === "paid" || trang_thai === "completed")) {
          // Kiểm tra xem đã có phiếu thu cho chứng từ này chưa (tránh trùng lặp)
          const existingVoucher = await SoQuyDAO.getByMaChungTu(code, { loai_phieu: "thu" });
          if (!existingVoucher && orderTotal > 0) {
            await SoQuyDAO.taoPhieu({
              loai_phieu: "thu",
              hang_muc: "thu_tien_ban_hang",
              so_tien: orderTotal,
              phuong_thuc: orderDoc.thanh_toan?.phuong_thuc === "chuyen_khoan" ? "chuyen_khoan" : "tien_mat",
              doi_tuong: {
                loai: "khach_hang",
                ten: orderDoc.khach_hang?.ten || orderDoc.khach_hang_ten || "Khách hàng",
                so_dien_thoai: orderDoc.khach_hang?.so_dien_thoai || "",
                dia_chi: orderDoc.khach_hang?.dia_chi || "",
              },
              ma_chung_tu: code,
              ghi_chu: `Tự động tạo phiếu thu khi đơn hàng ${code} chuyển trạng thái ${trang_thai}`,
              user: req.user,
            });
            logger.info("Auto-posted receipt voucher for order", { orderCode: code, amount: orderTotal });
          }
        } else if (orderDoc.loai_don === "purchase_receipt" && trang_thai === "paid") {
          const existingVoucher = await SoQuyDAO.getByMaChungTu(code, { loai_phieu: "chi" });
          if (!existingVoucher && orderTotal > 0) {
            await SoQuyDAO.taoPhieu({
              loai_phieu: "chi",
              hang_muc: "chi_tien_mua_hang",
              so_tien: orderTotal,
              phuong_thuc: orderDoc.thanh_toan?.phuong_thuc === "tien_mat" ? "tien_mat" : "chuyen_khoan",
              doi_tuong: {
                loai: "nha_cung_cap",
                ten: orderDoc.nha_cung_cap?.ten || orderDoc.nha_cung_cap_ten || "Nhà cung cấp",
                so_dien_thoai: orderDoc.nha_cung_cap?.so_dien_thoai || "",
                dia_chi: orderDoc.nha_cung_cap?.dia_chi || "",
              },
              ma_chung_tu: code,
              ghi_chu: `Tự động tạo phiếu chi khi đơn mua ${code} thanh toán`,
              user: req.user,
            });
            logger.info("Auto-posted payment voucher for purchase order", { orderCode: code, amount: orderTotal });
          }
        }
      }
    } catch (ledgerErr) {
      logger.warn("Auto-posting ledger failed in updateStatus", { error: ledgerErr.message, id });
    }

    const isApprove = ["da_duyet", "hoan_thanh", "completed"].includes(trang_thai);
    const payload = {
      type: `${loai.toUpperCase()}_STATUS_UPDATED`,
      id,
      ma_dh: orderCode,
      loai,
      trang_thai,
      updated_by: performedBy,
    };
    if (isApprove) notifyApprover(payload); else notifyAdmin(payload);
    logAction("UPDATE_STATUS", loai, id, `Cập nhật trạng thái đơn hàng (${orderCode}) → ${trang_thai}`, performedBy, req.ip);

    return sendSuccess(res, data, "Cập nhật trạng thái đơn hàng thành công");
  });

  /* ─── DELETE / RESTORE ─── */
  static softDelete = asyncHandler(async (req, res) => {
    const data = await DonHangService.softDelete(req.params.id);

    const performedBy = performedByOf(req);
    const loai = data.loai_don || "don_hang";
    const orderCode = data.ma_dh || req.params.id;
    notifyAdmin({
      type: `${loai.toUpperCase()}_DELETED`,
      id: req.params.id,
      ma_dh: orderCode,
      loai,
      deleted_by: performedBy,
    });
    logAction("SOFT_DELETE", loai, req.params.id, `Xóa mềm đơn hàng loại: ${loai} (${orderCode})`, performedBy, req.ip);

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

  /* ─── HANDOVER: SALES -> PRODUCTION ORDER ─── */
  static chuyenSangSanXuat = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    const result = await DonHangService.chuyenSangSanXuat(id, user);

    notifyDepartment("san_xuat", {
      type: "DON_SAN_XUAT_CREATED",
      title: "Lệnh sản xuất mới từ phòng Kinh Doanh",
      message: `Đơn bán ${result.order.ma_dh} vừa chuyển sang Lệnh SX ${result.ma_sx} (${result.workOrder.so_luong_tong} sản phẩm)`,
      lien_ket: `/product/orders`,
      created_by: user,
    });

    return sendSuccess(res, { ma_sx: result.ma_sx, id: result.id }, "Đã chuyển giao sang Phòng Sản Xuất thành công");
  });

  /* ─── HANDOVER: PRODUCTION -> FINISHED GOODS RECEIPT ─── */
  static banGiaoNhapKho = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    const result = await DonHangService.banGiaoNhapKho(id, user);

    notifyDepartment("kho", {
      type: "PROD_RECEIPT_CREATED",
      title: "Thành phẩm hoàn tất chờ nhập kho",
      message: `Lệnh SX ${result.prodOrder.ma_dh} đã bàn giao lô hàng ${result.ma_tp} chờ thủ kho kiểm đếm`,
      lien_ket: `/product/orders`,
      created_by: user,
    });

    return sendSuccess(res, { ma_tp: result.ma_tp, id: result.id }, "Đã bàn giao nhập kho thành phẩm");
  });

  /* ─── HANDOVER: WAREHOUSE -> LOGISTICS WAYBILL ─── */
  static chuyenSangVanChuyen = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    const result = await DonHangService.chuyenSangVanChuyen(id, user, req.body || {});

    notifyDepartment("kho", {
      type: "SYSTEM_NOTIFICATION",
      title: "Đã tạo vận đơn giao hàng",
      message: `Đơn hàng ${result.order.ma_dh} đã được tạo vận đơn ${result.waybill.ma_van_don} (${result.donViVC})`,
      lien_ket: `/shipping`,
      created_by: user,
    });

    return sendSuccess(res, result.waybill, "Đã chuyển giao vận chuyển thành công");
  });

  /* ─── INTERNAL COMMENTS & MENTIONS ─── */
  static themBinhLuan = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    const { noi_dung } = req.body;

    if (!noi_dung || !noi_dung.trim()) {
      throw ApiError.badRequest("Nội dung trao đổi không được để trống");
    }

    const db = getDB();
    const now = new Date();
    const commentId = new ObjectId().toString();

    // Scan for @username mentions
    const mentions = (noi_dung.match(/@(\w+)/g) || []).map((m) => m.slice(1));

    const commentDoc = {
      id: commentId,
      user_id: user._id,
      tai_khoan: user.tai_khoan,
      ho_ten: user.ho_ten || user.tai_khoan,
      phong_ban: user.phong_ban?.ten || user.ten_phong_ban || "",
      noi_dung: noi_dung.trim(),
      mentions,
      created_at: now,
    };

    await db.collection("don_hang").updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { trao_doi: commentDoc },
        $set: { updated_at: now },
      }
    );

    // Notify mentioned users
    for (const username of mentions) {
      notifyUser(username, {
        type: "SYSTEM_NOTIFICATION",
        title: "Bạn được nhắc đến trong một đơn hàng",
        message: `${user.ho_ten || user.tai_khoan} đã tag bạn trong thảo luận: "${noi_dung.trim().slice(0, 80)}..."`,
        lien_ket: `/sales`,
        created_by: user,
      });
    }

    return sendSuccess(res, commentDoc, "Đã gửi bình luận");
  });
}

export const DonHangController = OrderController;
export default OrderController;

