import asyncHandler from "../middleware/asyncHandler.js";
import ThongBaoDAO from "../models/thongBaoDAO.js";
import ApiError from "../utils/ApiError.js";

export default class ThongBaoController {
  /* GET /api/v1/thong-bao — Lấy danh sách thông báo của user đăng nhập */
  static layDanhSach = asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) throw ApiError.unauthorized("Chưa đăng nhập");

    const userId = user._id;
    const phongBan = user.phong_ban?.ten || user.ten_phong_ban || "";
    const { da_doc, page = 1, limit = 30 } = req.query;

    const result = await ThongBaoDAO.layDanhSach({
      user_id: userId,
      phong_ban: phongBan,
      da_doc,
      page: Number(page) || 1,
      limit: Number(limit) || 30,
    });

    const unreadResult = await ThongBaoDAO.demChuaDoc({
      user_id: userId,
      phong_ban: phongBan,
    });

    return res.status(200).json({
      success: true,
      data: result.items || [],
      unreadCount: unreadResult.count || 0,
      pagination: result.pagination,
    });
  });

  /* PATCH /api/v1/thong-bao/:id/read — Đánh dấu 1 thông báo là đã đọc */
  static danhDauDaDoc = asyncHandler(async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    if (!id) throw ApiError.badRequest("Thiếu id thông báo");

    const result = await ThongBaoDAO.danhDauDaDoc(id, user._id);
    return res.status(200).json({ success: true, ...result });
  });

  /* POST /api/v1/thong-bao/read-all — Đánh dấu tất cả thông báo là đã đọc */
  static danhDauDocTatCa = asyncHandler(async (req, res) => {
    const user = req.user;
    const userId = user._id;
    const phongBan = user.phong_ban?.ten || user.ten_phong_ban || "";

    const result = await ThongBaoDAO.danhDauDocTatCa(userId, phongBan);
    return res.status(200).json({
      success: true,
      message: "Đã đánh dấu tất cả thông báo là đã đọc",
    });
  });
}
