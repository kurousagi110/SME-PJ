// Refactored: 2026-04-02 | Issues fixed: C1, C2, C3, C4 | Original: phongban_chucvu.Controllers.js

import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess, buildPagination } from "../utils/response.js";
import PhongBanService from "../services/phongBanService.js";

export default class PhongBanChucVuController {
  /* ─── CREATE PHÒNG BAN ─── */
  static create = asyncHandler(async (req, res) => {
    const { ten_phong_ban, mo_ta, chuc_vu } = req.body || {};
    const data = await PhongBanService.create({ ten_phong_ban, mo_ta, chuc_vu });
    return sendSuccess(res, data, "Tạo phòng ban thành công", 201);
  });

  /* ─── LIST ─── */
  static list = asyncHandler(async (req, res) => {
    const { q = "", status, page = 1, limit = 20 } = req.query;
    const result = await PhongBanService.list({ q, status, page: Number(page), limit: Number(limit) });
    const pagination = buildPagination(result.page ?? page, result.limit ?? limit, result.total ?? 0);
    return sendSuccess(res, result.phong_ban ?? result.items ?? result, "Lấy danh sách phòng ban thành công", 200, pagination);
  });

  /* ─── GET BY ID ─── */
  static getById = asyncHandler(async (req, res) => {
    const doc = await PhongBanService.getById(req.params.id);
    return sendSuccess(res, doc, "Lấy phòng ban thành công");
  });

  /* ─── GET ALL PHÒNG BAN ─── */
  static getAllPhongBan = asyncHandler(async (req, res) => {
    const includeDeleted = req.query.includeDeleted === "true";
    const items = await PhongBanService.getAllPhongBan({ includeDeleted });
    return sendSuccess(res, items, "Lấy toàn bộ phòng ban thành công");
  });

  /* ─── UPDATE ─── */
  static updatePhongBan = asyncHandler(async (req, res) => {
    const data = await PhongBanService.updatePhongBan(req.params.id, req.body || {});
    return sendSuccess(res, data, "Cập nhật phòng ban thành công");
  });

  /* ─── SOFT DELETE / RESTORE / HARD DELETE ─── */
  static softDelete = asyncHandler(async (req, res) => {
    const data = await PhongBanService.softDelete(req.params.id);
    return sendSuccess(res, data, "Xóa mềm phòng ban thành công");
  });

  static restore = asyncHandler(async (req, res) => {
    const data = await PhongBanService.restore(req.params.id);
    return sendSuccess(res, data, "Khôi phục phòng ban thành công");
  });

  static hardDelete = asyncHandler(async (req, res) => {
    const data = await PhongBanService.hardDelete(req.params.id);
    return sendSuccess(res, data, "Xóa vĩnh viễn phòng ban thành công");
  });

  /* ─── CHỨC VỤ ─── */
  static addChucVu = asyncHandler(async (req, res) => {
    const { ten_chuc_vu, mo_ta, he_so_luong } = req.body || {};
    const data = await PhongBanService.addChucVu(req.params.id, { ten_chuc_vu, mo_ta, he_so_luong });
    return sendSuccess(res, data, "Thêm chức vụ thành công");
  });

  static updateChucVu = asyncHandler(async (req, res) => {
    const { id, chucVuId } = req.params;
    const data = await PhongBanService.updateChucVu(id, chucVuId, req.body || {});
    return sendSuccess(res, data, "Cập nhật chức vụ thành công");
  });

  static removeChucVu = asyncHandler(async (req, res) => {
    const { id, chucVuId } = req.params;
    const data = await PhongBanService.removeChucVu(id, chucVuId);
    return sendSuccess(res, data, "Xóa chức vụ thành công");
  });

  static setTrangThaiChucVu = asyncHandler(async (req, res) => {
    const { id, chucVuId } = req.params;
    const { trang_thai } = req.body || {};
    const data = await PhongBanService.setTrangThaiChucVu(id, chucVuId, trang_thai);
    return sendSuccess(res, data, "Cập nhật trạng thái chức vụ thành công");
  });
}
