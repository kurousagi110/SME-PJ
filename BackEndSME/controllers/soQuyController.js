import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import SoQuyDAO, { LOAI_PHIEU, PHUONG_THUC } from "../models/soQuyDAO.js";
import { logAction } from "../utils/auditLogger.js";
import { performedByOf } from "../utils/auditIdentity.js";

export default class SoQuyController {
  /* ─── 1. Lấy danh sách phiếu thu chi ─── */
  static list = asyncHandler(async (req, res) => {
    const {
      loai_phieu,
      hang_muc,
      phuong_thuc,
      tu_ngay,
      den_ngay,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const result = await SoQuyDAO.layDanhSachSoQuy({
      loai_phieu,
      hang_muc,
      phuong_thuc,
      tu_ngay,
      den_ngay,
      search,
      page,
      limit,
    });

    if (result.error) {
      throw ApiError.internal("Không thể lấy danh sách sổ quỹ: " + result.error.message);
    }

    return sendSuccess(res, result, "Lấy danh sách sổ quỹ thành công");
  });

  /* ─── 2. Thống kê tổng quan dòng tiền ─── */
  static getTongQuan = asyncHandler(async (req, res) => {
    const result = await SoQuyDAO.layTongQuanDoiSoat();
    if (result.error) {
      throw ApiError.internal("Không thể lấy tổng quan sổ quỹ: " + result.error.message);
    }
    return sendSuccess(res, result, "Lấy tổng quan sổ quỹ thành công");
  });

  /* ─── 3. Danh sách công nợ khách hàng & nhà cung cấp ─── */
  static getCongNo = asyncHandler(async (req, res) => {
    const result = await SoQuyDAO.layDanhSachCongNo();
    if (result.error) {
      throw ApiError.internal("Không thể lấy danh sách công nợ: " + result.error.message);
    }
    return sendSuccess(res, result, "Lấy danh sách công nợ thành công");
  });

  /* ─── 4. Lập phiếu thu / chi mới ─── */
  static create = asyncHandler(async (req, res) => {
    const {
      loai_phieu,
      hang_muc,
      so_tien,
      phuong_thuc,
      doi_tuong,
      ma_chung_tu,
      ngay_ghi_nhan,
      ghi_chu,
    } = req.body || {};

    if (!loai_phieu || ![LOAI_PHIEU.THU, LOAI_PHIEU.CHI].includes(loai_phieu)) {
      throw ApiError.badRequest("loai_phieu phải là 'thu' hoặc 'chi'", "VALIDATION_ERROR");
    }

    const amount = Number(so_tien);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw ApiError.badRequest("Số tiền phải lớn hơn 0", "VALIDATION_ERROR");
    }

    const user = req.user || performedByOf(req) || {};

    const result = await SoQuyDAO.taoPhieu({
      loai_phieu,
      hang_muc,
      so_tien: amount,
      phuong_thuc,
      doi_tuong,
      ma_chung_tu,
      ngay_ghi_nhan,
      ghi_chu,
      user,
    });

    if (result.error) {
      throw ApiError.internal("Không thể tạo phiếu thu/chi: " + result.error.message);
    }

    logAction(
      "CREATE",
      "so_quy",
      result.insertedId?.toString(),
      `Tạo phiếu ${loai_phieu === "thu" ? "thu" : "chi"} ${result.doc?.ma_phieu}: ${amount.toLocaleString("vi-VN")} đ`,
      user,
      req.ip
    );

    return sendSuccess(res, result.doc, "Tạo phiếu thu/chi thành công", 201);
  });

  /* ─── 5. Hủy phiếu thu / chi ─── */
  static cancel = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { ly_do } = req.body || {};
    const user = req.user || performedByOf(req) || {};

    const existing = await SoQuyDAO.getById(id);
    if (!existing) {
      throw ApiError.notFound("Không tìm thấy phiếu thu/chi");
    }

    if (existing.trang_thai === "cancelled") {
      throw ApiError.badRequest("Phiếu đã bị hủy trước đó");
    }

    const result = await SoQuyDAO.huyPhieu(id, { ly_do, user });
    if (result.error) {
      throw ApiError.internal("Không thể hủy phiếu: " + result.error.message);
    }

    logAction(
      "UPDATE",
      "so_quy",
      String(id),
      `Hủy phiếu ${existing.ma_phieu}: ${ly_do || "Không có lý do"}`,
      user,
      req.ip
    );

    return sendSuccess(res, { ok: true }, "Hủy phiếu thu/chi thành công");
  });

  /* ─── 6. Chi tiết 1 phiếu ─── */
  static getById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const doc = await SoQuyDAO.getById(id);
    if (!doc) {
      throw ApiError.notFound("Không tìm thấy phiếu thu/chi");
    }
    return sendSuccess(res, doc, "Lấy thông tin phiếu thành công");
  });
}
