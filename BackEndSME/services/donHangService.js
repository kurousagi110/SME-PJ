// Refactored: 2026-04-02 | Issues fixed: S1, S2, C3, C5 | Phase 3 – Service Layer
// C5: MongoDB session/transaction logic moved here FROM donHangController.

import DonHangDAO from "../models/donHangDAO.js";
import ApiError from "../utils/ApiError.js";
import { state } from "../models/donHangState.js";
import { toObjectId } from "../models/donHangConstants.js";

/**
 * DonHangService – business logic for order (chứng từ) management.
 *
 * The transaction / session management that was previously inside the controller
 * (issue C5) now lives here, keeping controllers clean.
 */
export default class DonHangService {
  static _daoError(result, fallback, errorCode = "OPERATION_FAILED") {
    if (result?.error) throw ApiError.badRequest(result.error.message || fallback, errorCode);
    return result;
  }

  static _getUserId(req) {
    return (
      req.user?._id ||
      req.user?.id  ||
      req.userId    ||
      req.user_id   ||
      req.auth?.userId ||
      null
    );
  }

  /* ─── CREATE ─── */
  static async create(body, nguoi_lap_id = null) {
    if (!body.loai_don) body.loai_don = "sale";
    if (!body.nguoi_lap_id) body.nguoi_lap_id = nguoi_lap_id;
    const result = await DonHangDAO.taoDonHang(body);
    this._daoError(result, "Tạo chứng từ thất bại", "CREATE_FAILED");
    return { insertedId: result.insertedId, ma_dh: result.ma_dh };
  }

  /* ─── GET BY ID ─── */
  static async getById(id) {
    if (!id) throw ApiError.badRequest("Thiếu id", "VALIDATION_ERROR");
    const doc = await DonHangDAO.getDonHangById(id);
    if (doc?.error) throw ApiError.notFound(doc.error.message, "ORDER_NOT_FOUND");
    return doc;
  }

  /* ─── GET BY CODE ─── */
  static async getByCode(ma_dh) {
    if (!ma_dh) throw ApiError.badRequest("Thiếu ma_dh", "VALIDATION_ERROR");
    const doc = await DonHangDAO.getByCode(ma_dh);
    if (doc?.error) throw ApiError.notFound(doc.error.message, "ORDER_NOT_FOUND");
    return doc;
  }

  /* ─── LIST ─── */
  static async list(params) {
    const result = await DonHangDAO.listDonHang(params);
    this._daoError(result, "Lấy danh sách thất bại", "LIST_FAILED");
    return result;
  }

  /* ─── PRODUCTION NEEDS ─── */
  static async productionNeeds(id) {
    if (!id) throw ApiError.badRequest("Thiếu id", "VALIDATION_ERROR");
    const result = await DonHangDAO.getProductionNeeds(id);
    this._daoError(result, "Không lấy được needs", "NEEDS_FAILED");
    return { items: result.items || [] };
  }

  /* ─── ITEMS ─── */
  static async updateItems(id, san_pham) {
    if (!Array.isArray(san_pham) || san_pham.length === 0) {
      throw ApiError.badRequest("san_pham phải là mảng và có ít nhất 1 phần tử", "VALIDATION_ERROR");
    }
    const result = await DonHangDAO.capNhatSanPham(id, san_pham);
    this._daoError(result, "Cập nhật thất bại", "UPDATE_FAILED");
    return { modifiedCount: result.modifiedCount };
  }

  static async addItem(id, item) {
    if (!item || (!item.san_pham_id && !item.ma_sp && !item.nguyen_lieu_id && !item.ma_nl)) {
      throw ApiError.badRequest("Thiếu san_pham_id/ma_sp hoặc nguyen_lieu_id/ma_nl", "VALIDATION_ERROR");
    }
    const result = await DonHangDAO.themSanPham(id, item);
    this._daoError(result, "Thêm thất bại", "ADD_ITEM_FAILED");
    return { modifiedCount: result.modifiedCount };
  }

  static async removeItem(id, { idx, code } = {}) {
    if (idx === undefined && !code) {
      throw ApiError.badRequest("Cần idx hoặc code (ma_sp/ma_nl) để xóa", "VALIDATION_ERROR");
    }
    const key = idx !== undefined ? Number(idx) : code;
    const result = await DonHangDAO.xoaSanPham(id, key);
    this._daoError(result, "Xóa thất bại", "REMOVE_ITEM_FAILED");
    return { modifiedCount: result.modifiedCount };
  }

  /* ─── PRICING ─── */
  static async applyDiscount(id, giam_gia) {
    const result = await DonHangDAO.apDungGiamGia(id, giam_gia);
    this._daoError(result, "Áp dụng giảm giá thất bại", "DISCOUNT_FAILED");
    return { modifiedCount: result.modifiedCount };
  }

  static async applyTax(id, thue_rate) {
    const result = await DonHangDAO.apDungThue(id, thue_rate);
    this._daoError(result, "Áp dụng thuế thất bại", "TAX_FAILED");
    return { modifiedCount: result.modifiedCount };
  }

  static async setShippingFee(id, phi_vc) {
    const result = await DonHangDAO.setPhiVanChuyen(id, phi_vc);
    this._daoError(result, "Cập nhật phí vận chuyển thất bại", "SHIPPING_FAILED");
    return { modifiedCount: result.modifiedCount };
  }

  /* ─── PAYMENT / NOTE ─── */
  static async updatePayment(id, thanh_toan) {
    const result = await DonHangDAO.capNhatThanhToan(id, thanh_toan);
    this._daoError(result, "Cập nhật thanh toán thất bại", "PAYMENT_FAILED");
    return { modifiedCount: result.modifiedCount };
  }

  static async updateNote(id, ghi_chu) {
    const result = await DonHangDAO.capNhatGhiChu(id, ghi_chu);
    this._daoError(result, "Cập nhật ghi chú thất bại", "NOTE_FAILED");
    return { modifiedCount: result.modifiedCount };
  }

  /* ─── UPDATE STATUS (with inventory + transaction) ─── */
  // C5 fix: transaction/session management moved from controller into here.
  static async updateStatus(id, trang_thai, { mongoClient, nguoi_thao_tac_id } = {}) {
    if (!trang_thai) throw ApiError.badRequest("Thiếu trang_thai", "VALIDATION_ERROR");

    if (mongoClient?.startSession) {
      const session = mongoClient.startSession();
      try {
        let outcome = {};
        await session.withTransaction(async () => {
          const r = await DonHangDAO.capNhatTrangThaiVaTonKho(id, trang_thai, {
            session,
            nguoi_thao_tac_id,
          });
          if (r?.error) throw r.error;
          outcome = r;
        });
        return { modifiedCount: outcome?.modifiedCount || 0 };
      } catch (e) {
        // MongoDB standalone (non-replica-set) does not support transactions.
        // Fall through to the non-transactional path below.
        if (!e?.message?.includes("Transaction numbers are only allowed")) throw e;
      } finally {
        await session.endSession();
      }
    }

    // Fallback: no transaction support (standalone MongoDB)
    const result = await DonHangDAO.capNhatTrangThaiVaTonKho(id, trang_thai, { nguoi_thao_tac_id });
    this._daoError(result, "Cập nhật trạng thái thất bại", "STATUS_UPDATE_FAILED");
    return { modifiedCount: result.modifiedCount };
  }

  /* ─── DELETE / RESTORE ─── */
  static async softDelete(id) {
    const result = await DonHangDAO.softDeleteDonHang(id);
    this._daoError(result, "Xóa mềm thất bại", "DELETE_FAILED");
    return { modifiedCount: result.modifiedCount };
  }

  static async restore(id) {
    const result = await DonHangDAO.restoreDonHang(id);
    this._daoError(result, "Khôi phục thất bại", "RESTORE_FAILED");
    return { modifiedCount: result.modifiedCount };
  }

  static async hardDelete(id) {
    const result = await DonHangDAO.hardDeleteDonHang(id);
    this._daoError(result, "Xóa vĩnh viễn thất bại", "HARD_DELETE_FAILED");
    return { deletedCount: result.deletedCount };
  }

  /* ─── REVENUE STATS ─── */
  static async revenueStats({ date_from, date_to } = {}) {
    const result = await DonHangDAO.thongKeDoanhThu({ date_from, date_to });
    this._daoError(result, "Thống kê thất bại", "STATS_FAILED");
    return result;
  }

  /* ─── HANDOVER: SALES -> PRODUCTION ORDER ─── */
  static async chuyenSangSanXuat(id, user = {}) {
    const order = await this.getById(id);
    if (!order) throw ApiError.notFound("Không tìm thấy đơn hàng");
    if (order.loai_don !== "sale") {
      throw ApiError.badRequest("Chỉ có thể chuyển đơn bán hàng sang sản xuất");
    }
    if (order.co_lenh_san_xuat) {
      throw ApiError.badRequest(`Đơn bán ${order.ma_dh} đã được chuyển sang Lệnh SX trước đó (Mã: ${order.ma_lenh_sx || "Đang xử lý"})`);
    }

    const itemsToProduce = (order.san_pham || []).map((sp) => ({
      san_pham_id: sp.san_pham_id || sp._id,
      ma_sp: sp.ma_sp,
      ten_sp: sp.ten_sp,
      so_luong: Number(sp.so_luong) || 1,
      don_gia: Number(sp.don_gia) || 0,
    }));

    if (itemsToProduce.length === 0) {
      throw ApiError.badRequest("Đơn hàng không có sản phẩm để sản xuất");
    }

    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const randCode = Math.random().toString(36).slice(2, 6).toUpperCase();
    const ma_sx = `LSX-${ymd}-${randCode}`;

    const workOrder = {
      ma_dh: ma_sx,
      ma_dh_goc: order.ma_dh,
      don_hang_goc_id: order._id,
      loai_don: "production_order",
      trang_thai: "confirmed",
      san_pham: itemsToProduce,
      so_luong_tong: itemsToProduce.reduce((s, it) => s + it.so_luong, 0),
      ghi_chu: `Lệnh sản xuất chuyển giao từ Đơn bán hàng ${order.ma_dh}`,
      nguoi_lap_id: user._id,
      nguoi_lap_ten: user.ho_ten || user.tai_khoan,
      created_at: now,
      updated_at: now,
      lich_su: [
        {
          hanh_dong: "handover_from_sales",
          at: now,
          by: user._id,
          note: `Khởi tạo lệnh sản xuất tự động từ đơn bán ${order.ma_dh}`,
        },
      ],
    };

    const insertRes = await state.don_hang.insertOne(workOrder);

    await state.don_hang.updateOne(
      { _id: toObjectId(id) },
      {
        $set: {
          co_lenh_san_xuat: true,
          ma_lenh_sx: ma_sx,
          updated_at: now,
        },
        $push: {
          lich_su: {
            hanh_dong: "chuyen_san_xuat",
            at: now,
            by: user._id,
            note: `Đã chuyển giao sang Phòng Sản Xuất (Lệnh: ${ma_sx})`,
          },
        },
      }
    );

    return { ma_sx, id: insertRes.insertedId, order, workOrder };
  }

  /* ─── HANDOVER: PRODUCTION -> FINISHED GOODS RECEIPT ─── */
  static async banGiaoNhapKho(id, user = {}) {
    const prodOrder = await this.getById(id);
    if (!prodOrder) throw ApiError.notFound("Không tìm thấy lệnh sản xuất");

    if (prodOrder.da_ban_giao_kho) {
      throw ApiError.badRequest(`Lệnh sản xuất ${prodOrder.ma_dh} đã bàn giao nhập kho trước đó (Mã: ${prodOrder.ma_phieu_nhap_tp || "Đang xử lý"})`);
    }

    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const randCode = Math.random().toString(36).slice(2, 6).toUpperCase();
    const ma_tp = `TP-${ymd}-${randCode}`;

    const receiptDoc = {
      ma_dh: ma_tp,
      ma_lenh_sx: prodOrder.ma_dh,
      lenh_sx_id: prodOrder._id,
      loai_don: "production_receipt",
      trang_thai: "draft",
      san_pham: prodOrder.san_pham || [],
      tong_tien: 0,
      ghi_chu: `Phiếu nhập thành phẩm bàn giao từ ${prodOrder.ma_dh}`,
      nguoi_lap_id: user._id,
      nguoi_lap_ten: user.ho_ten || user.tai_khoan,
      created_at: now,
      updated_at: now,
    };

    const insertRes = await state.don_hang.insertOne(receiptDoc);

    await state.don_hang.updateOne(
      { _id: toObjectId(id) },
      {
        $set: {
          da_ban_giao_kho: true,
          ma_phieu_nhap_tp: ma_tp,
          trang_thai: "completed",
          updated_at: now,
        },
      }
    );

    return { ma_tp, id: insertRes.insertedId, prodOrder };
  }

  /* ─── HANDOVER: WAREHOUSE -> LOGISTICS WAYBILL ─── */
  static async chuyenSangVanChuyen(id, user = {}, body = {}) {
    const order = await this.getById(id);
    if (!order) throw ApiError.notFound("Không tìm thấy đơn hàng");

    if (order.ma_van_don || order.trang_thai_van_chuyen) {
      throw ApiError.badRequest(`Đơn hàng ${order.ma_dh} đã được tạo vận đơn trước đó (Mã: ${order.ma_van_don || "Đang giao"})`);
    }

    const donViVC = body.don_vi_van_chuyen || "GHTK";
    const VanChuyenDAO = (await import("../models/vanChuyenDAO.js")).default;
    const waybillRes = await VanChuyenDAO.taoVanDon({
      ma_don_hang: order.ma_dh,
      don_vi_van_chuyen: donViVC,
      phi_van_chuyen: Number(body.phi_van_chuyen) || Number(order.phi_vc) || 30000,
      tien_thu_ho_cod: order.thanh_toan?.status === "paid" ? 0 : Number(order.tong_tien) || 0,
      nguoi_nhan: {
        ten: order.khach_hang_ten || order.khach_hang?.ten || "Khách Hàng",
        sdt: order.so_dien_thoai || order.khach_hang?.so_dien_thoai || "",
        dia_chi: order.dia_chi_giao || order.dia_chi_giao_hang || order.khach_hang?.dia_chi || "",
      },
      san_pham: order.san_pham || [],
      ghi_chu: body.ghi_chu || `Đóng gói từ đơn bán ${order.ma_dh}`,
      user,
    });

    if (waybillRes.error) {
      throw ApiError.badRequest(waybillRes.error.message || "Tạo vận đơn thất bại");
    }

    await state.don_hang.updateOne(
      { _id: toObjectId(id) },
      {
        $set: {
          ma_van_don: waybillRes.ma_van_don,
          don_vi_van_chuyen: donViVC,
          trang_thai_van_chuyen: "cho_lay_hang",
          updated_at: new Date(),
        },
      }
    );

    return { waybill: waybillRes, order, donViVC };
  }
}
