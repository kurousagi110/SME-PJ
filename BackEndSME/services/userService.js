// Refactored: 2026-04-02 | Issues fixed: S1, S2, C3 | Phase 3 – Service Layer

import UsersDAO from "../models/usersDAO.js";
import ApiError from "../utils/ApiError.js";
import { escapeRegex } from "../utils/escapeRegex.js";

/**
 * UserService – business logic for user management and authentication.
 */
export default class UserService {
  static _daoError(result, fallback, errorCode = "OPERATION_FAILED") {
    if (result?.error) throw ApiError.badRequest(result.error.message || fallback, errorCode);
    return result;
  }

  /* ─── AUTH ─── */
  static async register({ ho_ten, ngay_sinh, tai_khoan, password }) {
    if (!ho_ten || !tai_khoan || !password) {
      throw ApiError.badRequest("Thiếu ho_ten / tai_khoan / password", "VALIDATION_ERROR");
    }
    if (typeof password !== "string" || password.length < 8 || password.length > 128) {
      throw ApiError.badRequest("Mật khẩu phải từ 8–128 ký tự", "WEAK_PASSWORD");
    }
    // Pass null để DAO biết user mới chưa có chức vụ / phòng ban.
    // Permission escalation phải qua endpoint admin (verifyAdmin + verifyToken).
    const result = await UsersDAO.registerUser(ho_ten, ngay_sinh, tai_khoan, password, null, null);
    if (result?.error) {
      // SECURITY: DAO trả { error } khi tài khoản đã tồn tại — phải trả 409 Conflict
      // chứ không phải 400, và KHÔNG để lộ thêm thông tin (anti-enumeration).
      const msg = result.error.message || "Đăng ký thất bại";
      const code = msg.includes("đã tồn tại") ? "USERNAME_TAKEN" : "REGISTER_FAILED";
      throw ApiError.conflict(msg, code);
    }
    return { insertedId: result.insertedId };
  }

  static async login({ tai_khoan, password }) {
    if (!tai_khoan || !password) {
      throw ApiError.badRequest("Thiếu tai_khoan / password", "VALIDATION_ERROR");
    }
    const result = await UsersDAO.loginUser(tai_khoan, password);
    if (result?.error) throw ApiError.unauthorized(result.error.message || "Đăng nhập thất bại", "LOGIN_FAILED");
    return result;
  }

  // SECURITY: refreshToken đã được verify trong DAO → userId được extract từ JWT payload.
  // Body {userId} đã bị loại bỏ ở controller để chặn forced-logout của người khác.
  static async refreshToken({ refreshToken }) {
    if (!refreshToken) {
      throw ApiError.badRequest("Thiếu refreshToken", "VALIDATION_ERROR");
    }
    const result = await UsersDAO.resetToken(refreshToken);
    if (result?.error) throw ApiError.unauthorized(result.error.message || "Làm mới token thất bại", "REFRESH_FAILED");
    return result;
  }

  static async logout({ userId, refreshToken }) {
    if (!userId || !refreshToken) {
      throw ApiError.badRequest("Thiếu userId / refreshToken", "VALIDATION_ERROR");
    }
    const result = await UsersDAO.logoutUser(userId, refreshToken);
    this._daoError(result, "Đăng xuất thất bại", "LOGOUT_FAILED");
    return { ok: true };
  }

  static async logoutAll({ userId }) {
    if (!userId) throw ApiError.badRequest("Thiếu userId", "VALIDATION_ERROR");
    const result = await UsersDAO.logoutAll(userId);
    this._daoError(result, "Đăng xuất tất cả thiết bị thất bại", "LOGOUT_ALL_FAILED");
    return { ok: true };
  }

  /* ─── QUERIES ─── */
  static async getUsers({ q = "", page = 1, limit = 20, trang_thai, phong_ban, chuc_vu } = {}) {
    return await UsersDAO.findUsers({ q, page, limit, trang_thai, phong_ban, chuc_vu });
  }

  static async getUserById(id) {
    if (!id) throw ApiError.badRequest("Thiếu id", "VALIDATION_ERROR");
    const user = await UsersDAO.getUserById(id);
    if (user?.error) throw ApiError.notFound(user.error.message, "USER_NOT_FOUND");
    return user;
  }

  static async getMyUser(id) {
    if (!id) throw ApiError.badRequest("Thiếu id", "VALIDATION_ERROR");
    const user = await UsersDAO.getMyUser(id);
    if (user?.error) throw ApiError.notFound(user.error.message, "USER_NOT_FOUND");
    return user;
  }

  /* ─── PROFILE / PASSWORD ─── */
  static async updateProfile(id, { ho_ten, ngay_sinh }) {
    const result = await UsersDAO.updateProfile(id, { ho_ten, ngay_sinh });
    this._daoError(result, "Cập nhật hồ sơ thất bại", "PROFILE_UPDATE_FAILED");
    return { ok: true };
  }

  static async updatePassword(id, { oldPassword, newPassword }) {
    if (!oldPassword || !newPassword) {
      throw ApiError.badRequest("Thiếu oldPassword / newPassword", "VALIDATION_ERROR");
    }
    const result = await UsersDAO.updatePassword(id, oldPassword, newPassword);
    this._daoError(result, "Cập nhật mật khẩu thất bại", "PASSWORD_UPDATE_FAILED");
    return { ok: true };
  }

  /* ─── CHỨC VỤ ─── */
  static async setChucVu(id, { ten = "", mo_ta = "", heSoluong = null }) {
    const result = await UsersDAO.setChucVu(id, { ten, mo_ta, heSoluong });
    this._daoError(result, "Thiết lập chức vụ thất bại", "SET_CHUCVU_FAILED");
    return { ok: true };
  }

  static async updateChucVu(id, rawPayload) {
    const allowed = ["ten", "mo_ta", "heSoluong"];
    const payload = {};
    allowed.forEach((k) => { if (rawPayload[k] !== undefined) payload[k] = rawPayload[k]; });
    const result = await UsersDAO.updateChucVu(id, payload);
    this._daoError(result, "Cập nhật chức vụ thất bại", "UPDATE_CHUCVU_FAILED");
    return { ok: true };
  }

  static async clearChucVu(id) {
    const result = await UsersDAO.clearChucVu(id);
    this._daoError(result, "Xóa chức vụ thất bại", "CLEAR_CHUCVU_FAILED");
    return { ok: true };
  }

  /* ─── PHÒNG BAN ─── */
  static async setPhongBan(id, { ten = "", mo_ta = "" }) {
    const result = await UsersDAO.setPhongBan(id, { ten, mo_ta });
    this._daoError(result, "Thiết lập phòng ban thất bại", "SET_PHONGBAN_FAILED");
    return { ok: true };
  }

  static async updatePhongBan(id, rawPayload) {
    const allowed = ["ten", "mo_ta"];
    const payload = {};
    allowed.forEach((k) => { if (rawPayload[k] !== undefined) payload[k] = rawPayload[k]; });
    const result = await UsersDAO.updatePhongBan(id, payload);
    this._daoError(result, "Cập nhật phòng ban thất bại", "UPDATE_PHONGBAN_FAILED");
    return { ok: true };
  }

  static async clearPhongBan(id) {
    const result = await UsersDAO.clearPhongBan(id);
    this._daoError(result, "Xóa phòng ban thất bại", "CLEAR_PHONGBAN_FAILED");
    return { ok: true };
  }

  /* ─── TRẠNG THÁI ─── */
  static async softDelete(id) {
    const result = await UsersDAO.softDeleteUser(id);
    this._daoError(result, "Khóa người dùng thất bại", "DELETE_FAILED");
    return { ok: true };
  }

  static async restore(id) {
    const result = await UsersDAO.restoreUser(id);
    this._daoError(result, "Khôi phục người dùng thất bại", "RESTORE_FAILED");
    return { ok: true };
  }

  /* ─── DANH SÁCH NHÂN VIÊN ─── */
  static async getDanhSachNhanVien({ currentUser, q = "", phong_ban_query = "" }) {
    if (!currentUser) throw ApiError.unauthorized("Bạn chưa đăng nhập", "UNAUTHORIZED");

    const isManager =
      currentUser?.phong_ban?.ten === "Phòng giám đốc" ||
      currentUser?.chuc_vu?.ten === "Trưởng phòng";

    const filter = {};

    if (q) {
      // SECURITY: escape regex metacharacters before building the $regex.
      // Without this, a search like q=.*.*.*.*(a+)+$ causes ReDoS on the
      // mongod event loop. Round 4 escaped user-side DAO queries but
      // missed this server-side filter.
      const safe = escapeRegex(q);
      filter.$or = [
        { ma_nv: { $regex: safe, $options: "i" } },
        { ho_ten: { $regex: safe, $options: "i" } },
      ];
    }

    if (isManager) {
      // Same hardening as above for the department filter when a manager
      // narrows the list via ?phong_ban=...
      if (phong_ban_query) filter["phong_ban.ten"] = { $regex: escapeRegex(phong_ban_query), $options: "i" };
    } else {
      const pbTen = currentUser?.phong_ban?.ten;
      if (!pbTen) throw ApiError.badRequest("Tài khoản chưa có phòng ban", "NO_PHONGBAN");
      filter["phong_ban.ten"] = pbTen;
    }

    const result = await UsersDAO.getDanhSachNhanVien(filter);
    if (result?.error) throw ApiError.internal(result.error?.message || "Lấy danh sách nhân viên thất bại", "LIST_FAILED");
    return result;
  }
}
