import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import DoiTacDAO from "../models/doiTacDAO.js";
import { logAction } from "../utils/auditLogger.js";
import { performedByOf } from "../utils/auditIdentity.js";

export default class DoiTacController {
  /* ─── 1. Danh sách đối tác ─── */
  static list = asyncHandler(async (req, res) => {
    const loai_doi_tac = req.query.loai_doi_tac || req.query.loai;
    const { nhom, search, page = 1, limit = 50 } = req.query;

    const result = await DoiTacDAO.layDanhSachDoiTac({
      loai_doi_tac,
      nhom,
      search,
      page,
      limit,
    });

    if (result.error) {
      throw ApiError.internal("Không thể lấy danh sách đối tác: " + result.error.message);
    }

    return sendSuccess(res, result, "Lấy danh sách đối tác thành công");
  });

  /* ─── 2. Thống kê CRM ─── */
  static getTongQuan = asyncHandler(async (req, res) => {
    const result = await DoiTacDAO.layTongQuanCRM();
    if (result.error) {
      throw ApiError.internal("Không thể lấy tổng quan CRM: " + result.error.message);
    }
    return sendSuccess(res, result, "Lấy tổng quan CRM thành công");
  });

  /* ─── 3. Chi tiết hồ sơ Customer 360 ─── */
  static getById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const doc = await DoiTacDAO.layChiTietDoiTac(id);
    if (!doc) {
      throw ApiError.notFound("Không tìm thấy đối tác");
    }
    return sendSuccess(res, doc, "Lấy chi tiết đối tác thành công");
  });

  /* ─── 4. Tạo mới đối tác ─── */
  static create = asyncHandler(async (req, res) => {
    const {
      ma_doi_tac,
      loai_doi_tac,
      ten,
      so_dien_thoai,
      email,
      dia_chi,
      ma_so_thue,
      nhom,
      ghi_chu,
    } = req.body || {};

    if (!ten || !String(ten).trim()) {
      throw ApiError.badRequest("Tên đối tác là bắt buộc", "VALIDATION_ERROR");
    }

    const user = req.user || performedByOf(req) || {};

    const result = await DoiTacDAO.taoDoiTac({
      ma_doi_tac,
      loai_doi_tac,
      ten,
      so_dien_thoai,
      email,
      dia_chi,
      ma_so_thue,
      nhom,
      ghi_chu,
      user,
    });

    if (result.error) {
      throw ApiError.internal("Không thể tạo đối tác: " + result.error.message);
    }

    logAction(
      "CREATE",
      "doi_tac",
      result.insertedId?.toString(),
      `Tạo đối tác: ${ten} (${loai_doi_tac || "khach_hang"})`,
      user,
      req.ip
    );

    return sendSuccess(res, result.doc, "Tạo đối tác thành công", 201);
  });

  /* ─── 5. Cập nhật đối tác ─── */
  static update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user || performedByOf(req) || {};

    const result = await DoiTacDAO.capNhatDoiTac(id, req.body || {}, user);
    if (result.error) {
      throw ApiError.internal("Không thể cập nhật đối tác: " + result.error.message);
    }

    logAction(
      "UPDATE",
      "doi_tac",
      String(id),
      `Cập nhật đối tác ${id}`,
      user,
      req.ip
    );

    return sendSuccess(res, { ok: true }, "Cập nhật đối tác thành công");
  });

  /* ─── 6. Xóa đối tác ─── */
  static delete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user || performedByOf(req) || {};

    const result = await DoiTacDAO.xoaDoiTac(id);
    if (result.error) {
      throw ApiError.internal("Không thể xóa đối tác: " + result.error.message);
    }

    logAction(
      "DELETE",
      "doi_tac",
      String(id),
      `Xóa đối tác ${id}`,
      user,
      req.ip
    );

    return sendSuccess(res, { ok: true }, "Xóa đối tác thành công");
  });
}
