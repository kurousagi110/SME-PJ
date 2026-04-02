// Refactored: 2026-04-02 | Issues fixed: S1, S2, C3 | Phase 3 – Service Layer

import SanPhamDAO from "../models/sanPhamDAO.js";
import ApiError from "../utils/ApiError.js";

/**
 * SanPhamService – all business logic for product management.
 * Controllers call this service; DAO handles raw DB access.
 */
export default class SanPhamService {
  /* ─── Helpers ─── */
  static _daoError(result, fallback, errorCode = "OPERATION_FAILED") {
    if (result?.error) throw ApiError.badRequest(result.error.message || fallback, errorCode);
    return result;
  }

  /* ─── CREATE ─── */
  static async create({ ma_sp, ten_sp, don_gia, so_luong = 0, mo_ta = "", nguyen_lieu = [] }) {
    if (!ma_sp || !ten_sp) {
      throw ApiError.badRequest("Thiếu ma_sp / ten_sp", "VALIDATION_ERROR");
    }
    const result = await SanPhamDAO.addSanPham(ma_sp, ten_sp, don_gia, so_luong, mo_ta, nguyen_lieu);
    this._daoError(result, "Thêm sản phẩm thất bại", "CREATE_FAILED");
    return { insertedId: result.insertedId };
  }

  /* ─── UPDATE ─── */
  static async update(id, payload) {
    if (!id) throw ApiError.badRequest("Thiếu id sản phẩm", "VALIDATION_ERROR");
    const allowed = ["ten_sp", "don_gia", "so_luong", "mo_ta", "nguyen_lieu", "trang_thai"];
    const filtered = {};
    allowed.forEach((k) => { if (payload[k] !== undefined) filtered[k] = payload[k]; });
    const result = await SanPhamDAO.updateSanPham(id, filtered);
    this._daoError(result, "Cập nhật sản phẩm thất bại", "UPDATE_FAILED");
    return { modifiedCount: result.modifiedCount };
  }

  /* ─── STATUS ─── */
  static async setStatus(id, status) {
    if (!id)     throw ApiError.badRequest("Thiếu id", "VALIDATION_ERROR");
    if (!status) throw ApiError.badRequest("Thiếu status", "VALIDATION_ERROR");
    const result = await SanPhamDAO.setStatus(id, status);
    this._daoError(result, "Cập nhật trạng thái thất bại", "UPDATE_FAILED");
    return { modifiedCount: result.modifiedCount };
  }

  /* ─── GET BY ID ─── */
  static async getById(id, { includeDeleted = false } = {}) {
    if (!id) throw ApiError.badRequest("Thiếu id", "VALIDATION_ERROR");
    const doc = await SanPhamDAO.getSanPhamById(id, { includeDeleted });
    if (doc?.error) throw ApiError.notFound(doc.error.message, "PRODUCT_NOT_FOUND");
    return doc;
  }

  /* ─── LIST ─── */
  static async list({ q = "", minPrice, maxPrice, status, page = 1, limit = 20,
                       sortBy = "createAt", order = "desc", includeDeleted = false } = {}) {
    const result = await SanPhamDAO.listSanPham({ q, minPrice, maxPrice, status,
      page, limit, sortBy, order, includeDeleted });
    this._daoError(result, "Lấy danh sách sản phẩm thất bại", "LIST_FAILED");
    return result;
  }

  /* ─── SEARCH ─── */
  static async search(q = "", limit = 20) {
    const docs = await SanPhamDAO.searchSanPham(q, limit);
    if (docs?.error) throw ApiError.badRequest(docs.error.message, "SEARCH_FAILED");
    return docs;
  }

  /* ─── ADJUST STOCK ─── */
  static async adjustStock(id, delta, { allowNegative = false, newPrice, newMinStock, newDonVi } = {}) {
    if (!id)              throw ApiError.badRequest("Thiếu id", "VALIDATION_ERROR");
    if (delta === undefined) throw ApiError.badRequest("Thiếu delta", "VALIDATION_ERROR");
    const result = await SanPhamDAO.adjustStock(id, Number(delta), { allowNegative, newPrice, newMinStock, newDonVi });
    this._daoError(result, "Điều chỉnh tồn kho thất bại", "STOCK_ADJUST_FAILED");
    return result;
  }

  /* ─── BULK ADJUST STOCK ─── */
  static async bulkAdjustStock(updates = [], { allowNegative = false } = {}) {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw ApiError.badRequest("updates phải là mảng không rỗng", "VALIDATION_ERROR");
    }
    const result = await SanPhamDAO.bulkAdjustStock(updates, { allowNegative });
    this._daoError(result, "Điều chỉnh tồn kho hàng loạt thất bại", "BULK_STOCK_FAILED");
    return result;
  }

  /* ─── STATS ─── */
  static async stats({ lowStockThreshold = 5 } = {}) {
    const result = await SanPhamDAO.getInventoryStats({ lowStockThreshold });
    this._daoError(result, "Lấy thống kê tồn kho thất bại", "STATS_FAILED");
    return result;
  }

  /* ─── LOW STOCK ─── */
  static async lowStock({ threshold = 5, limit = 50 } = {}) {
    const result = await SanPhamDAO.getLowStock({ threshold, limit });
    this._daoError(result, "Lấy danh sách sắp hết hàng thất bại", "LOW_STOCK_FAILED");
    return result;
  }

  /* ─── ALL STOCK ─── */
  static async getAllStock({ q = "", status = "", min_qty, max_qty,
                             page = 1, limit = 20, sortBy = "ten_sp", sortDir = "asc" } = {}) {
    const result = await SanPhamDAO.getAllStock({ q: q.trim(), status: status.trim(),
      min_qty, max_qty, page, limit, sortBy, sortDir });
    this._daoError(result, "Lấy tồn kho thất bại", "ALL_STOCK_FAILED");
    return result;
  }

  /* ─── SOFT DELETE ─── */
  static async softDelete(id) {
    const result = await SanPhamDAO.softDeleteSanPham(id);
    this._daoError(result, "Xóa mềm sản phẩm thất bại", "DELETE_FAILED");
    return { modifiedCount: result.modifiedCount };
  }

  /* ─── RESTORE ─── */
  static async restore(id) {
    const result = await SanPhamDAO.restoreSanPham(id);
    this._daoError(result, "Khôi phục sản phẩm thất bại", "RESTORE_FAILED");
    return { modifiedCount: result.modifiedCount };
  }

  /* ─── HARD DELETE ─── */
  static async hardDelete(id) {
    const result = await SanPhamDAO.hardDeleteSanPham(id);
    this._daoError(result, "Xóa vĩnh viễn sản phẩm thất bại", "HARD_DELETE_FAILED");
    return { deletedCount: result.deletedCount };
  }
}
