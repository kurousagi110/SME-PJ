// Refactored: 2026-04-02 | Issues fixed: S1, S2, C3 | Phase 3 – Service Layer

import LuongDAO from "../models/luongDAO.js";
import ApiError from "../utils/ApiError.js";

/**
 * LuongService – business logic for attendance (cham_cong) and payroll (luong).
 */
export default class LuongService {
  static _daoError(result, fallback, errorCode = "OPERATION_FAILED") {
    if (result?.error) throw ApiError.badRequest(result.error.message || fallback, errorCode);
    return result;
  }

  /* ─── CHẤM CÔNG 1 NHÂN VIÊN ─── */
  static async chamCong({ ma_nv, gio_check_in, gio_check_out, ngay_thang, so_gio_lam, ghi_chu }) {
    if (!ma_nv || !ngay_thang) {
      throw ApiError.badRequest("Thiếu ma_nv / ngay_thang", "VALIDATION_ERROR");
    }
    const result = await LuongDAO.createOrUpdateChamCong({ ma_nv, gio_check_in, gio_check_out, ngay_thang, so_gio_lam, ghi_chu });
    this._daoError(result, "Chấm công thất bại", "CHAM_CONG_FAILED");
    return {
      ok: true,
      upsertedId: result.upsertedId,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  }

  /* ─── CHẤM CÔNG BULK ─── */
  static async chamCongBulk({ ngay_thang, items }) {
    if (!ngay_thang || !Array.isArray(items)) {
      throw ApiError.badRequest("Thiếu ngay_thang hoặc items", "VALIDATION_ERROR");
    }
    if (items.length === 0) {
      throw ApiError.badRequest("items rỗng", "VALIDATION_ERROR");
    }
    const result = await LuongDAO.createOrUpdateChamCongBulk({ ngay_thang, items });
    this._daoError(result, "Bulk chấm công thất bại", "BULK_CHAM_CONG_FAILED");
    return result;
  }

  /* ─── GET BY DAY ─── */
  static async getChamCongByDay({ ma_nv, ngay_thang }) {
    if (!ma_nv || !ngay_thang) {
      throw ApiError.badRequest("Thiếu ma_nv / ngay_thang", "VALIDATION_ERROR");
    }
    const doc = await LuongDAO.getChamCongByDay({ ma_nv, ngay_thang });
    if (doc?.error) throw ApiError.notFound(doc.error.message, "CHAM_CONG_NOT_FOUND");
    return doc;
  }

  /* ─── LIST ─── */
  static async listChamCong({ ma_nv, ngay_thang, from, to, page = 1, limit = 50 } = {}) {
    const result = await LuongDAO.listChamCong({ ma_nv, ngay_thang, from, to, page, limit });
    this._daoError(result, "Lấy danh sách chấm công thất bại", "LIST_FAILED");
    return result;
  }

  /* ─── SOFT DELETE ─── */
  static async softDeleteChamCong(id) {
    if (!id) throw ApiError.badRequest("Thiếu id", "VALIDATION_ERROR");
    const result = await LuongDAO.softDeleteChamCong(id);
    this._daoError(result, "Xóa chấm công thất bại", "DELETE_FAILED");
    return { modifiedCount: result.modifiedCount };
  }

  /* ─── TÍNH LƯƠNG THÁNG ─── */
  static async tinhLuongThang({ ma_nv, thang, nam, don_gia_gio, thuong, phat, ghi_chu }) {
    if (!ma_nv || !thang || !nam) {
      throw ApiError.badRequest("Thiếu ma_nv / thang / nam", "VALIDATION_ERROR");
    }
    const result = await LuongDAO.tinhLuongThang({ ma_nv, thang, nam, don_gia_gio, thuong, phat, ghi_chu });
    this._daoError(result, "Tính lương tháng thất bại", "TINH_LUONG_FAILED");
    return result;
  }
}
