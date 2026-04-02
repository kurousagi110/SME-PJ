// Refactored: 2026-04-02 | Issues fixed: S1, S2, C3 | Phase 3 – Service Layer

import phongban_chucvuDAO from "../models/phongban_chucvuDAO.js";
import ApiError from "../utils/ApiError.js";

/**
 * PhongBanService – business logic for department (phong_ban) and position (chuc_vu) management.
 */
export default class PhongBanService {
  static _daoError(result, fallback, errorCode = "OPERATION_FAILED") {
    if (result?.error) throw ApiError.badRequest(result.error.message || fallback, errorCode);
    return result;
  }

  /* ─── CREATE PHÒNG BAN ─── */
  static async create({ ten_phong_ban, mo_ta, chuc_vu }) {
    if (!ten_phong_ban) throw ApiError.badRequest("Thiếu ten_phong_ban", "VALIDATION_ERROR");
    const result = await phongban_chucvuDAO.addPhongBanChucVu(ten_phong_ban, mo_ta, chuc_vu);
    this._daoError(result, "Thêm phòng ban thất bại", "CREATE_FAILED");
    return { insertedId: result.insertedId };
  }

  /* ─── LIST ─── */
  static async list({ q = "", status, page = 1, limit = 20 } = {}) {
    const result = await phongban_chucvuDAO.list({ q, status, page, limit });
    this._daoError(result, "Lấy danh sách phòng ban thất bại", "LIST_FAILED");
    return result;
  }

  /* ─── GET BY ID ─── */
  static async getById(id) {
    if (!id) throw ApiError.badRequest("Thiếu id", "VALIDATION_ERROR");
    const doc = await phongban_chucvuDAO.getById(id);
    if (doc?.error) throw ApiError.notFound(doc.error.message, "PHONGBAN_NOT_FOUND");
    return doc;
  }

  /* ─── GET ALL ─── */
  static async getAllPhongBan({ includeDeleted = false } = {}) {
    const items = await phongban_chucvuDAO.getAllPhongBan({ includeDeleted });
    if (items?.error) throw ApiError.badRequest(items.error.message, "LIST_FAILED");
    return items;
  }

  /* ─── UPDATE ─── */
  static async updatePhongBan(id, rawPayload) {
    if (!id) throw ApiError.badRequest("Thiếu id", "VALIDATION_ERROR");
    const allowed = ["ten_phong_ban", "mo_ta", "trang_thai"];
    const payload = {};
    allowed.forEach((k) => { if (rawPayload[k] !== undefined) payload[k] = rawPayload[k]; });
    const result = await phongban_chucvuDAO.updatePhongBan(id, payload);
    this._daoError(result, "Cập nhật phòng ban thất bại", "UPDATE_FAILED");
    return { modifiedCount: result.modifiedCount };
  }

  /* ─── SOFT DELETE / RESTORE / HARD DELETE ─── */
  static async softDelete(id) {
    const result = await phongban_chucvuDAO.softDeletePhongBan(id);
    this._daoError(result, "Xóa mềm phòng ban thất bại", "DELETE_FAILED");
    return { modifiedCount: result.modifiedCount };
  }

  static async restore(id) {
    const result = await phongban_chucvuDAO.restorePhongBan(id);
    this._daoError(result, "Khôi phục phòng ban thất bại", "RESTORE_FAILED");
    return { modifiedCount: result.modifiedCount };
  }

  static async hardDelete(id) {
    const result = await phongban_chucvuDAO.hardDeletePhongBan(id);
    this._daoError(result, "Xóa vĩnh viễn phòng ban thất bại", "HARD_DELETE_FAILED");
    return { deletedCount: result.deletedCount };
  }

  /* ─── CHỨC VỤ ─── */
  static async addChucVu(phongBanId, { ten_chuc_vu, mo_ta, he_so_luong }) {
    if (!ten_chuc_vu) throw ApiError.badRequest("Thiếu ten_chuc_vu", "VALIDATION_ERROR");
    const result = await phongban_chucvuDAO.addChucVu(phongBanId, { ten_chuc_vu, mo_ta, he_so_luong });
    this._daoError(result, "Thêm chức vụ thất bại", "ADD_CHUCVU_FAILED");
    return { modifiedCount: result.modifiedCount, chuc_vu_id: result.chuc_vu_id };
  }

  static async updateChucVu(phongBanId, chucVuId, rawPayload) {
    const allowed = ["ten_chuc_vu", "mo_ta", "he_so_luong", "trang_thai"];
    const payload = {};
    allowed.forEach((k) => { if (rawPayload[k] !== undefined) payload[k] = rawPayload[k]; });
    const result = await phongban_chucvuDAO.updateChucVu(phongBanId, chucVuId, payload);
    this._daoError(result, "Cập nhật chức vụ thất bại", "UPDATE_CHUCVU_FAILED");
    return { modifiedCount: result.modifiedCount };
  }

  static async removeChucVu(phongBanId, chucVuId) {
    const result = await phongban_chucvuDAO.removeChucVu(phongBanId, chucVuId);
    this._daoError(result, "Xóa chức vụ thất bại", "REMOVE_CHUCVU_FAILED");
    return { modifiedCount: result.modifiedCount };
  }

  static async setTrangThaiChucVu(phongBanId, chucVuId, trang_thai) {
    if (!trang_thai) throw ApiError.badRequest("Thiếu trang_thai", "VALIDATION_ERROR");
    const result = await phongban_chucvuDAO.setTrangThaiChucVu(phongBanId, chucVuId, trang_thai);
    this._daoError(result, "Cập nhật trạng thái chức vụ thất bại", "UPDATE_CHUCVU_STATUS_FAILED");
    return { modifiedCount: result.modifiedCount };
  }
}
