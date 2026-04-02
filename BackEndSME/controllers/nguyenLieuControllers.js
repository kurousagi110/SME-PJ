// Refactored: 2026-04-02 | Issues fixed: C1, C2, C3, C4, C6 | Original: nguyenLieuControllers.js
// C6: Removed console.log from adjustStock and getAllStock

import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess, buildPagination } from "../utils/response.js";
import NguyenLieuService from "../services/nguyenLieuService.js";

export default class NguyenLieuController {
  /* ─── CREATE ─── */
  static create = asyncHandler(async (req, res) => {
    const { ma_nl, ten_nl, don_vi, gia_nhap, so_luong, ton_toi_thieu, mo_ta } = req.body || {};
    const data = await NguyenLieuService.create({ ma_nl, ten_nl, don_vi, gia_nhap, so_luong, ton_toi_thieu, mo_ta });
    return sendSuccess(res, data, "Tạo nguyên liệu thành công", 201);
  });

  /* ─── UPDATE ─── */
  static update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = await NguyenLieuService.update(id, req.body || {});
    return sendSuccess(res, data, "Cập nhật nguyên liệu thành công");
  });

  /* ─── ADJUST STOCK ─── */
  static adjustStock = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { deltaQty, newUnitCost, allowNegative = false } = req.body || {};
    const data = await NguyenLieuService.adjustStock(id, deltaQty, { newUnitCost, allowNegative });
    return sendSuccess(res, data, "Điều chỉnh tồn kho nguyên liệu thành công");
  });

  /* ─── SOFT DELETE / RESTORE ─── */
  static softDelete = asyncHandler(async (req, res) => {
    const data = await NguyenLieuService.softDelete(req.params.id);
    return sendSuccess(res, data, "Xóa mềm nguyên liệu thành công");
  });

  static restore = asyncHandler(async (req, res) => {
    const data = await NguyenLieuService.restore(req.params.id);
    return sendSuccess(res, data, "Khôi phục nguyên liệu thành công");
  });

  /* ─── READ ONE ─── */
  static getById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const includeDeleted = req.query.includeDeleted === true || req.query.includeDeleted === "true";
    const doc = await NguyenLieuService.getById(id, { includeDeleted });
    return sendSuccess(res, doc, "Lấy nguyên liệu thành công");
  });

  /* ─── LIST ─── */
  static list = asyncHandler(async (req, res) => {
    const { q = "", status, lowStockOnly, page = 1, limit = 20,
            sortBy = "ten_nl", order = "asc", includeDeleted } = req.query;
    const result = await NguyenLieuService.list({
      q, status,
      lowStockOnly:   lowStockOnly   === "true" || lowStockOnly   === true,
      page:           Number(page),
      limit:          Number(limit),
      sortBy, order,
      includeDeleted: includeDeleted === "true" || includeDeleted === true,
    });
    const pagination = buildPagination(result.page ?? page, result.limit ?? limit, result.total ?? 0);
    return sendSuccess(res, result.nguyen_lieu ?? result.items ?? result, "Lấy danh sách nguyên liệu thành công", 200, pagination);
  });

  /* ─── SEARCH ─── */
  static search = asyncHandler(async (req, res) => {
    const { q = "", limit = 20 } = req.query;
    const docs = await NguyenLieuService.search(q, Number(limit));
    return sendSuccess(res, docs, "Tìm kiếm nguyên liệu thành công");
  });

  /* ─── STATS ─── */
  static stats = asyncHandler(async (req, res) => {
    const { lowStockThreshold } = req.query;
    const data = await NguyenLieuService.stats({
      lowStockThreshold: lowStockThreshold !== undefined ? Number(lowStockThreshold) : undefined,
    });
    return sendSuccess(res, data, "Lấy thống kê tồn kho thành công");
  });

  static lowStock = asyncHandler(async (req, res) => {
    const { threshold, limit = 50 } = req.query;
    const data = await NguyenLieuService.lowStock({
      threshold: threshold !== undefined ? Number(threshold) : undefined,
      limit: Number(limit),
    });
    return sendSuccess(res, data, "Lấy danh sách nguyên liệu sắp hết thành công");
  });

  /* ─── ALL STOCK ─── */
  static getAllStock = asyncHandler(async (req, res) => {
    const { q = "", status = "", min_qty, max_qty, page, limit,
            sortBy = "ten_nl", sortDir = "asc" } = req.query;
    const result = await NguyenLieuService.getAllStock({
      q, status,
      min_qty:  min_qty  !== undefined ? Number(min_qty)  : undefined,
      max_qty:  max_qty  !== undefined ? Number(max_qty)  : undefined,
      page:     page     !== undefined ? Number(page)     : 1,
      limit:    limit    !== undefined ? Number(limit)    : 20,
      sortBy, sortDir,
    });
    const pagination = buildPagination(result.pagination?.page ?? 1, result.pagination?.limit ?? 20, result.pagination?.total ?? 0);
    return sendSuccess(res, result.items ?? result, "Lấy tồn kho nguyên liệu thành công", 200, pagination);
  });
}
