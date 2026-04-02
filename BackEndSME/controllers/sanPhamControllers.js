// Refactored: 2026-04-02 | Issues fixed: C1, C2, C3, C4, C6 | Original: sanPhamControllers.js
// C1: Unified response format via sendSuccess/sendError
// C4: asyncHandler eliminates all try/catch blocks
// C6: Removed debug console.log

import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess, buildPagination } from "../utils/response.js";
import SanPhamService from "../services/sanPhamService.js";

export default class SanPhamController {
  /* ─── CREATE ─── */
  static create = asyncHandler(async (req, res) => {
    const { ma_sp, ten_sp, don_gia, so_luong = 0, mo_ta = "", nguyen_lieu = [] } = req.body || {};
    const data = await SanPhamService.create({ ma_sp, ten_sp, don_gia, so_luong, mo_ta, nguyen_lieu });
    return sendSuccess(res, data, "Tạo sản phẩm thành công", 201);
  });

  /* ─── UPDATE INFO ─── */
  static update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = await SanPhamService.update(id, req.body || {});
    return sendSuccess(res, data, "Cập nhật sản phẩm thành công");
  });

  /* ─── STATUS ─── */
  static setStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body || {};
    const data = await SanPhamService.setStatus(id, status);
    return sendSuccess(res, data, "Cập nhật trạng thái thành công");
  });

  /* ─── DELETE / RESTORE ─── */
  static softDelete = asyncHandler(async (req, res) => {
    const data = await SanPhamService.softDelete(req.params.id);
    return sendSuccess(res, data, "Xóa mềm sản phẩm thành công");
  });

  static restore = asyncHandler(async (req, res) => {
    const data = await SanPhamService.restore(req.params.id);
    return sendSuccess(res, data, "Khôi phục sản phẩm thành công");
  });

  static hardDelete = asyncHandler(async (req, res) => {
    const data = await SanPhamService.hardDelete(req.params.id);
    return sendSuccess(res, data, "Xóa vĩnh viễn sản phẩm thành công");
  });

  /* ─── READ ONE ─── */
  static getById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    // C2: query coercion done in validate.parseQuery middleware on route
    const includeDeleted = req.query.includeDeleted === true || req.query.includeDeleted === "true";
    const doc = await SanPhamService.getById(id, { includeDeleted });
    return sendSuccess(res, doc, "Lấy sản phẩm thành công");
  });

  /* ─── LIST ─── */
  static list = asyncHandler(async (req, res) => {
    const { q = "", minPrice, maxPrice, status, page = 1, limit = 20,
            sortBy = "createAt", order = "desc", includeDeleted = false } = req.query;
    const result = await SanPhamService.list({
      q, minPrice, maxPrice, status,
      page: Number(page), limit: Number(limit), sortBy, order,
      includeDeleted: includeDeleted === true || includeDeleted === "true",
    });
    const pagination = buildPagination(result.page ?? page, result.limit ?? limit, result.total ?? 0);
    return sendSuccess(res, result.san_pham ?? result.items ?? result, "Lấy danh sách sản phẩm thành công", 200, pagination);
  });

  /* ─── SEARCH ─── */
  static search = asyncHandler(async (req, res) => {
    const { q = "", limit = 20 } = req.query;
    const docs = await SanPhamService.search(q, Number(limit));
    return sendSuccess(res, docs, "Tìm kiếm sản phẩm thành công");
  });

  /* ─── STOCK ─── */
  static adjustStock = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { delta, deltaQty, allowNegative = false, newPrice, newMinStock, newDonVi } = req.body || {};
    const dRaw = delta !== undefined ? delta : deltaQty;
    const data = await SanPhamService.adjustStock(id, dRaw, { allowNegative, newPrice, newMinStock, newDonVi });
    return sendSuccess(res, data, "Điều chỉnh tồn kho sản phẩm thành công");
  });

  static bulkAdjustStock = asyncHandler(async (req, res) => {
    const { updates = [], allowNegative = false } = req.body || {};
    const data = await SanPhamService.bulkAdjustStock(updates, { allowNegative: Boolean(allowNegative) });
    return sendSuccess(res, data, "Điều chỉnh tồn kho hàng loạt thành công");
  });

  /* ─── STATS ─── */
  static stats = asyncHandler(async (req, res) => {
    const { lowStockThreshold = 5 } = req.query;
    const data = await SanPhamService.stats({ lowStockThreshold: Number(lowStockThreshold) });
    return sendSuccess(res, data, "Lấy thống kê tồn kho thành công");
  });

  static lowStock = asyncHandler(async (req, res) => {
    const { threshold = 5, limit = 50 } = req.query;
    const data = await SanPhamService.lowStock({ threshold: Number(threshold), limit: Number(limit) });
    return sendSuccess(res, data, "Lấy danh sách sản phẩm sắp hết hàng thành công");
  });

  /* ─── ALL STOCK ─── */
  static getAllStock = asyncHandler(async (req, res) => {
    const { q = "", status = "", min_qty, max_qty, page, limit,
            sortBy = "ten_sp", sortDir = "asc" } = req.query;
    const result = await SanPhamService.getAllStock({
      q, status,
      min_qty:  min_qty  !== undefined ? Number(min_qty)  : undefined,
      max_qty:  max_qty  !== undefined ? Number(max_qty)  : undefined,
      page:     page     !== undefined ? Number(page)     : 1,
      limit:    limit    !== undefined ? Number(limit)    : 20,
      sortBy, sortDir,
    });
    const pagination = buildPagination(result.pagination?.page ?? 1, result.pagination?.limit ?? 20, result.pagination?.total ?? 0);
    return sendSuccess(res, result.items ?? result, "Lấy tồn kho sản phẩm thành công", 200, pagination);
  });
}
