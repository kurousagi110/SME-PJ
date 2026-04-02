// Refactored: 2026-04-02 | Issues fixed: C1, C2, C3, C4 | Original: usersControllers.js

import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess, buildPagination } from "../utils/response.js";
import UserService from "../services/userService.js";

export default class UsersController {
  /* ─── AUTH ─── */
  static register = asyncHandler(async (req, res) => {
    const { ho_ten, ngay_sinh, tai_khoan, password, chuc_vu, phong_ban } = req.body || {};
    const data = await UserService.register({ ho_ten, ngay_sinh, tai_khoan, password, chuc_vu, phong_ban });
    return sendSuccess(res, data, "Đăng ký thành công", 201);
  });

  static login = asyncHandler(async (req, res) => {
    const { tai_khoan, password } = req.body || {};
    const data = await UserService.login({ tai_khoan, password });
    return sendSuccess(res, data, "Đăng nhập thành công");
  });

  static refreshToken = asyncHandler(async (req, res) => {
    const { userId, refreshToken } = req.body || {};
    const data = await UserService.refreshToken({ userId, refreshToken });
    return sendSuccess(res, data, "Làm mới token thành công");
  });

  static logout = asyncHandler(async (req, res) => {
    const { userId, refreshToken } = req.body || {};
    const data = await UserService.logout({ userId, refreshToken });
    return sendSuccess(res, data, "Đăng xuất thành công");
  });

  static logoutAll = asyncHandler(async (req, res) => {
    const { userId } = req.body || {};
    const data = await UserService.logoutAll({ userId });
    return sendSuccess(res, data, "Đăng xuất tất cả thiết bị thành công");
  });

  /* ─── QUERIES ─── */
  static getUsers = asyncHandler(async (req, res) => {
    const { q = "", page = 1, limit = 20, trang_thai, phong_ban, chuc_vu } = req.query;
    const result = await UserService.getUsers({
      q,
      page: Number(page),
      limit: Number(limit),
      trang_thai: trang_thai !== undefined ? Number(trang_thai) : undefined,
      phong_ban,
      chuc_vu,
    });
    const pagination = buildPagination(result.page ?? page, result.limit ?? limit, result.total ?? 0);
    return sendSuccess(res, result.users ?? result.items ?? result, "Lấy danh sách người dùng thành công", 200, pagination);
  });

  static getUserById = asyncHandler(async (req, res) => {
    const user = await UserService.getUserById(req.params.id);
    return sendSuccess(res, user, "Lấy thông tin người dùng thành công");
  });

  static getMyUser = asyncHandler(async (req, res) => {
    const user = await UserService.getMyUser(req.params.id);
    return sendSuccess(res, user, "Lấy thông tin tài khoản thành công");
  });

  /* ─── PROFILE / PASSWORD ─── */
  static updateProfile = asyncHandler(async (req, res) => {
    const { ho_ten, ngay_sinh } = req.body || {};
    const data = await UserService.updateProfile(req.params.id, { ho_ten, ngay_sinh });
    return sendSuccess(res, data, "Cập nhật hồ sơ thành công");
  });

  static updatePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body || {};
    const data = await UserService.updatePassword(req.params.id, { oldPassword, newPassword });
    return sendSuccess(res, data, "Cập nhật mật khẩu thành công");
  });

  /* ─── CHỨC VỤ ─── */
  static setChucVu = asyncHandler(async (req, res) => {
    const { ten = "", mo_ta = "", heSoluong = null } = req.body || {};
    const data = await UserService.setChucVu(req.params.id, { ten, mo_ta, heSoluong });
    return sendSuccess(res, data, "Thiết lập chức vụ thành công");
  });

  static updateChucVu = asyncHandler(async (req, res) => {
    const data = await UserService.updateChucVu(req.params.id, req.body || {});
    return sendSuccess(res, data, "Cập nhật chức vụ thành công");
  });

  static clearChucVu = asyncHandler(async (req, res) => {
    const data = await UserService.clearChucVu(req.params.id);
    return sendSuccess(res, data, "Xóa chức vụ thành công");
  });

  /* ─── PHÒNG BAN ─── */
  static setPhongBan = asyncHandler(async (req, res) => {
    const { ten = "", mo_ta = "" } = req.body || {};
    const data = await UserService.setPhongBan(req.params.id, { ten, mo_ta });
    return sendSuccess(res, data, "Thiết lập phòng ban thành công");
  });

  static updatePhongBan = asyncHandler(async (req, res) => {
    const data = await UserService.updatePhongBan(req.params.id, req.body || {});
    return sendSuccess(res, data, "Cập nhật phòng ban thành công");
  });

  static clearPhongBan = asyncHandler(async (req, res) => {
    const data = await UserService.clearPhongBan(req.params.id);
    return sendSuccess(res, data, "Xóa phòng ban thành công");
  });

  /* ─── TRẠNG THÁI ─── */
  static softDelete = asyncHandler(async (req, res) => {
    const data = await UserService.softDelete(req.params.id);
    return sendSuccess(res, data, "Khóa người dùng thành công");
  });

  static restore = asyncHandler(async (req, res) => {
    const data = await UserService.restore(req.params.id);
    return sendSuccess(res, data, "Khôi phục người dùng thành công");
  });

  /* ─── DANH SÁCH NHÂN VIÊN ─── */
  static getDanhSachNhanVien = asyncHandler(async (req, res) => {
    const q = (req.query.q || "").trim();
    const phong_ban_query = (req.query.phong_ban || "").trim();
    const items = await UserService.getDanhSachNhanVien({ currentUser: req.user, q, phong_ban_query });
    return sendSuccess(res, { items }, "Lấy danh sách nhân viên thành công");
  });
}
