// Refactored: 2026-04-02 | Issues fixed: C1, C2, C3, C4 | Original: luongControllers.js

import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess, buildPagination } from "../utils/response.js";
import LuongService from "../services/luongService.js";

export default class LuongController {
  /* ─── CHẤM CÔNG 1 NHÂN VIÊN ─── */
  static chamCong = asyncHandler(async (req, res) => {
    const { ma_nv, gio_check_in, gio_check_out, ngay_thang, so_gio_lam, ghi_chu } = req.body || {};
    const data = await LuongService.chamCong({ ma_nv, gio_check_in, gio_check_out, ngay_thang, so_gio_lam, ghi_chu });
    return sendSuccess(res, data, "Chấm công thành công");
  });

  /* ─── CHẤM CÔNG BULK ─── */
  static chamCongBulk = asyncHandler(async (req, res) => {
    const { ngay_thang, items } = req.body || {};
    const data = await LuongService.chamCongBulk({ ngay_thang, items });
    return sendSuccess(res, data, "Bulk chấm công thành công");
  });

  /* ─── GET BY DAY ─── */
  static getChamCongByDay = asyncHandler(async (req, res) => {
    const { ma_nv, ngay_thang } = req.query;
    const doc = await LuongService.getChamCongByDay({ ma_nv, ngay_thang });
    return sendSuccess(res, doc, "Lấy chấm công theo ngày thành công");
  });

  /* ─── LIST ─── */
  static listChamCong = asyncHandler(async (req, res) => {
    const { ma_nv, ngay_thang, from, to, page = 1, limit = 50 } = req.query;
    const result = await LuongService.listChamCong({
      ma_nv, ngay_thang, from, to,
      page: Number(page), limit: Number(limit),
    });
    const pagination = buildPagination(result.page ?? page, result.limit ?? limit, result.total ?? 0);
    return sendSuccess(res, result.cham_cong ?? result.items ?? result, "Lấy danh sách chấm công thành công", 200, pagination);
  });

  /* ─── SOFT DELETE ─── */
  static softDeleteChamCong = asyncHandler(async (req, res) => {
    const data = await LuongService.softDeleteChamCong(req.params.id);
    return sendSuccess(res, data, "Xóa chấm công thành công");
  });

  /* ─── TÍNH LƯƠNG THÁNG ─── */
  static tinhLuongThang = asyncHandler(async (req, res) => {
    const { ma_nv, thang, nam, don_gia_gio, thuong, phat, ghi_chu } = req.body || {};
    const data = await LuongService.tinhLuongThang({ ma_nv, thang, nam, don_gia_gio, thuong, phat, ghi_chu });
    return sendSuccess(res, data, "Tính lương tháng thành công");
  });
}
