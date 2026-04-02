// Refactored: 2026-04-02 | Issues fixed: S1, S2, C3, C5 | Phase 3 – Service Layer
// C5: MongoDB session/transaction logic moved here FROM donHangController.

import DonHangDAO from "../models/donHangDAO.js";
import ApiError from "../utils/ApiError.js";

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
        let outcome;
        await session.withTransaction(async () => {
          const r = await DonHangDAO.capNhatTrangThaiVaTonKho(id, trang_thai, {
            session,
            nguoi_thao_tac_id,
          });
          if (r?.error) throw r.error;
          outcome = r;
        });
        return { modifiedCount: outcome?.modifiedCount || 0 };
      } finally {
        await session.endSession();
      }
    }

    // Fallback: no session support
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
}
