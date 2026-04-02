// Refactored: 2026-04-02 | Issues fixed: S1, S2, C3, C6 | Phase 3 – Service Layer

import NguyenLieuDAO from "../models/nguyenLieuDAO.js";
import ApiError from "../utils/ApiError.js";

/**
 * NguyenLieuService – all business logic for raw material management.
 */
export default class NguyenLieuService {
  static _daoError(result, fallback, errorCode = "OPERATION_FAILED") {
    if (result?.error) throw ApiError.badRequest(result.error.message || fallback, errorCode);
    return result;
  }

  /* ─── CREATE ─── */
  static async create({ ma_nl, ten_nl, don_vi, gia_nhap, so_luong, ton_toi_thieu, mo_ta }) {
    if (!ma_nl || !ten_nl || !don_vi) {
      throw ApiError.badRequest("Thiếu ma_nl / ten_nl / don_vi", "VALIDATION_ERROR");
    }
    const result = await NguyenLieuDAO.addNguyenLieu({ ma_nl, ten_nl, don_vi, gia_nhap, so_luong, ton_toi_thieu, mo_ta });
    this._daoError(result, "Thêm nguyên liệu thất bại", "CREATE_FAILED");
    return { insertedId: result.insertedId };
  }

  /* ─── UPDATE ─── */
  static async update(id, rawPayload) {
    if (!id) throw ApiError.badRequest("Thiếu id", "VALIDATION_ERROR");
    const allowed = ["ten_nl", "don_vi", "gia_nhap", "so_luong", "mo_ta", "ton_toi_thieu", "trang_thai"];
    const payload = {};
    allowed.forEach((k) => { if (rawPayload[k] !== undefined) payload[k] = rawPayload[k]; });
    const result = await NguyenLieuDAO.updateNguyenLieu(id, payload);
    this._daoError(result, "Cập nhật nguyên liệu thất bại", "UPDATE_FAILED");
    return { modifiedCount: result.modifiedCount };
  }

  /* ─── ADJUST STOCK ─── */
  static async adjustStock(id, deltaQty, { newUnitCost, allowNegative = false } = {}) {
    if (!id) throw ApiError.badRequest("Thiếu id", "VALIDATION_ERROR");
    if (deltaQty === undefined) throw ApiError.badRequest("Thiếu deltaQty", "VALIDATION_ERROR");
    const result = await NguyenLieuDAO.adjustStock(id, Number(deltaQty), { newUnitCost, allowNegative });
    this._daoError(result, "Điều chỉnh tồn kho thất bại", "STOCK_ADJUST_FAILED");
    return result;
  }

  /* ─── SOFT DELETE / RESTORE ─── */
  static async softDelete(id) {
    const result = await NguyenLieuDAO.softDelete(id);
    this._daoError(result, "Xóa mềm nguyên liệu thất bại", "DELETE_FAILED");
    return { modifiedCount: result.modifiedCount };
  }

  static async restore(id) {
    const result = await NguyenLieuDAO.restore(id);
    this._daoError(result, "Khôi phục nguyên liệu thất bại", "RESTORE_FAILED");
    return { modifiedCount: result.modifiedCount };
  }

  /* ─── GET BY ID ─── */
  static async getById(id, { includeDeleted = false } = {}) {
    if (!id) throw ApiError.badRequest("Thiếu id", "VALIDATION_ERROR");
    const doc = await NguyenLieuDAO.getById(id, { includeDeleted });
    if (doc?.error) throw ApiError.notFound(doc.error.message, "MATERIAL_NOT_FOUND");
    return doc;
  }

  /* ─── LIST ─── */
  static async list({ q = "", status, lowStockOnly = false, page = 1, limit = 20,
                       sortBy = "ten_nl", order = "asc", includeDeleted = false } = {}) {
    const result = await NguyenLieuDAO.list({ q, status, lowStockOnly, page, limit, sortBy, order, includeDeleted });
    this._daoError(result, "Lấy danh sách nguyên liệu thất bại", "LIST_FAILED");
    return result;
  }

  /* ─── SEARCH ─── */
  static async search(q = "", limit = 20) {
    const docs = await NguyenLieuDAO.search(q, limit);
    if (docs?.error) throw ApiError.badRequest(docs.error.message, "SEARCH_FAILED");
    return docs;
  }

  /* ─── STATS ─── */
  static async stats({ lowStockThreshold } = {}) {
    const result = await NguyenLieuDAO.getInventoryStats({ lowStockThreshold });
    this._daoError(result, "Lấy thống kê tồn kho thất bại", "STATS_FAILED");
    return result;
  }

  static async lowStock({ threshold, limit = 50 } = {}) {
    const result = await NguyenLieuDAO.getLowStock({ threshold, limit });
    this._daoError(result, "Lấy danh sách nguyên liệu sắp hết thất bại", "LOW_STOCK_FAILED");
    return result;
  }

  /* ─── ALL STOCK ─── */
  static async getAllStock({ q = "", status = "", min_qty, max_qty,
                             page = 1, limit = 20, sortBy = "ten_nl", sortDir = "asc" } = {}) {
    const result = await NguyenLieuDAO.getAllStock({ q: q.trim(), status: status.trim(),
      min_qty, max_qty, page, limit, sortBy, sortDir });
    this._daoError(result, "Lấy kho nguyên liệu thất bại", "ALL_STOCK_FAILED");
    return result;
  }
}
