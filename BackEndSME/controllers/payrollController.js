// Refactored: 2026-04-02 | Issues fixed: C1, C2, C3, C4 | Original: luongControllers.js

import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess, buildPagination } from "../utils/response.js";
import LuongService from "../services/luongService.js";

export default class PayrollController {
  /* ─── CHẤM CÔNG 1 NHÂN VIÊN ─── */
  static chamCong = asyncHandler(async (req, res) => {
    const body = req.body || {};
    const ma_nv = body.ma_nv || body.employee_id;
    const gio_check_in = body.gio_check_in || body.check_in;
    const gio_check_out = body.gio_check_out || body.check_out;
    const ngay_thang = body.ngay_thang || body.work_date || body.date;
    const so_gio_lam = body.so_gio_lam ?? body.work_hours ?? body.hours;
    const ghi_chu = body.ghi_chu || body.note;

    const data = await LuongService.chamCong({ ma_nv, gio_check_in, gio_check_out, ngay_thang, so_gio_lam, ghi_chu });
    return sendSuccess(res, data, "Chấm công thành công");
  });

  /* ─── CHẤM CÔNG BULK ─── */
  static chamCongBulk = asyncHandler(async (req, res) => {
    const body = req.body || {};
    const ngay_thang = body.ngay_thang || body.work_date || body.date;
    const items = body.items || [];
    const data = await LuongService.chamCongBulk({ ngay_thang, items });
    return sendSuccess(res, data, "Bulk chấm công thành công");
  });

  /* ─── GET BY DAY ─── */
  static getChamCongByDay = asyncHandler(async (req, res) => {
    const ma_nv = req.query.ma_nv || req.query.employee_id;
    const ngay_thang = req.query.ngay_thang || req.query.date || req.query.work_date;
    const doc = await LuongService.getChamCongByDay({ ma_nv, ngay_thang });
    return sendSuccess(res, doc, "Lấy chấm công theo ngày thành công");
  });

  /* ─── LIST ─── */
  static listChamCong = asyncHandler(async (req, res) => {
    const ma_nv = req.query.ma_nv || req.query.employee_id;
    const ngay_thang = req.query.ngay_thang || req.query.date;
    const from = req.query.from || req.query.fromDate;
    const to = req.query.to || req.query.toDate;
    const page = req.query.page || 1;
    const limit = req.query.limit || 50;

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
    const body = req.body || {};
    const ma_nv = body.ma_nv || body.employee_id;
    const thang = body.thang ?? body.month;
    const nam = body.nam ?? body.year;
    const don_gia_gio = body.don_gia_gio ?? body.hourly_rate;
    const thuong = body.thuong ?? body.bonus;
    const phat = body.phat ?? body.penalty;
    const ghi_chu = body.ghi_chu || body.note;

    const data = await LuongService.tinhLuongThang({ ma_nv, thang, nam, don_gia_gio, thuong, phat, ghi_chu });
    return sendSuccess(res, data, "Tính lương tháng thành công");
  });

  /* ─── CHI TRẢ LƯƠNG THÁNG (Closed-loop) ─── */
  static chiTraLuongThang = asyncHandler(async (req, res) => {
    const body = req.body || {};
    const thang = body.thang ?? body.month;
    const nam = body.nam ?? body.year;
    const phuong_thuc = body.phuong_thuc || body.payment_method || "chuyen_khoan";
    const ghi_chu = body.ghi_chu || body.note || "";

    const data = await LuongService.chiTraLuongThang({
      thang,
      nam,
      phuong_thuc,
      ghi_chu,
      user: req.user,
    });
    return sendSuccess(res, data, "Chi trả lương và tạo phiếu chi sổ quỹ thành công", 201);
  });

  static getTrangThaiChiLuong = asyncHandler(async (req, res) => {
    const thang = req.query.thang ?? req.query.month;
    const nam = req.query.nam ?? req.query.year;
    const data = await LuongService.trangThaiChiLuong(thang, nam);
    return sendSuccess(res, data, "Lấy trạng thái chi lương thành công");
  });
}

export const LuongController = PayrollController;
