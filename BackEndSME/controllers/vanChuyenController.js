import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import VanChuyenDAO from "../models/vanChuyenDAO.js";
import { logAction } from "../utils/auditLogger.js";
import { performedByOf } from "../utils/auditIdentity.js";

export default class VanChuyenController {
  static list = asyncHandler(async (req, res) => {
    const { trang_thai, don_vi, search, page = 1, limit = 20 } = req.query;
    const result = await VanChuyenDAO.layDanhSach({ trang_thai, don_vi, search, page, limit });
    if (result.error) {
      throw ApiError.internal("Không thể lấy danh sách vận đơn: " + result.error.message);
    }
    return sendSuccess(res, result, "Lấy danh sách vận đơn thành công");
  });

  static getTongQuan = asyncHandler(async (req, res) => {
    const result = await VanChuyenDAO.layTongQuan();
    if (result.error) {
      throw ApiError.internal("Không thể lấy tổng quan vận chuyển: " + result.error.message);
    }
    return sendSuccess(res, result, "Lấy tổng quan vận chuyển thành công");
  });

  static getById = asyncHandler(async (req, res) => {
    const item = await VanChuyenDAO.layChiTiet(req.params.id);
    if (!item) {
      throw ApiError.notFound("Không tìm thấy vận đơn");
    }
    return sendSuccess(res, item, "Lấy thông tin vận đơn thành công");
  });

  static create = asyncHandler(async (req, res) => {
    const result = await VanChuyenDAO.taoVanDon({
      ...req.body,
      user: req.user,
    });

    if (result.error) {
      throw ApiError.internal("Không thể tạo vận đơn: " + result.error.message);
    }

    await logAction({
      action: "CREATE_WAYBILL",
      module: "SHIPPING",
      performedBy: performedByOf(req.user),
      target: result.ma_van_don,
      details: {
        ma_don_hang: req.body.ma_don_hang,
        don_vi: req.body.don_vi_van_chuyen,
        tien_cod: req.body.tien_thu_ho_cod,
      },
    });

    return sendSuccess(res, result, "Tạo vận đơn thành công", 201);
  });

  static updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { trang_thai, ghi_chu, vi_tri } = req.body;

    if (!trang_thai) {
      throw ApiError.badRequest("Trạng thái mới là bắt buộc");
    }

    const result = await VanChuyenDAO.capNhatTrangThai(id, {
      trang_thai,
      ghi_chu,
      vi_tri,
      user: req.user,
    });

    if (result.error) {
      throw ApiError.badRequest(result.error.message);
    }

    await logAction({
      action: "UPDATE_WAYBILL_STATUS",
      module: "SHIPPING",
      performedBy: performedByOf(req.user),
      target: id,
      details: { trang_thai, ghi_chu },
    });

    return sendSuccess(res, { success: true }, "Cập nhật trạng thái vận đơn thành công");
  });
}
