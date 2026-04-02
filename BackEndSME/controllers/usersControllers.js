import UsersDAO from "../models/usersDAO.js";

export default class UsersController {
  /* ===================== Auth ===================== */
  static async register(req, res) {
    try {
      const { ho_ten, ngay_sinh, tai_khoan, password, chuc_vu, phong_ban } = req.body;
      if (!ho_ten || !tai_khoan || !password) {
        return res.status(400).json({ message: "Thiếu ho_ten / tai_khoan / password" });
      }
      const result = await UsersDAO.registerUser(ho_ten, ngay_sinh, tai_khoan, password, chuc_vu, phong_ban);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Đăng ký thất bại" });
      return res.status(201).json({ insertedId: result.insertedId });
    } catch (e) {
      return res.status(500).json({ message: "Đăng ký thất bại", error: e.message });
    }
  }

  static async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await UsersDAO.getUserById(id);
      if (user?.error) return res.status(404).json({ message: user.error.message });
      return res.json(user);
    } catch (e) {
      return res.status(500).json({ message: "Lấy người dùng thất bại", error: e.message });
    }
  }

  static async login(req, res) {
    try {
      const { tai_khoan, password } = req.body;
      if (!tai_khoan || !password) {
        return res.status(400).json({ message: "Thiếu tai_khoan / password" });
      }
      const result = await UsersDAO.loginUser(tai_khoan, password);
      if (result?.error) return res.status(401).json({ message: result.error.message || "Đăng nhập thất bại" });
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ message: "Đăng nhập thất bại", error: e.message });
    }
  }

  static async refreshToken(req, res) {
    try {
      const { userId, refreshToken } = req.body;
      if (!userId || !refreshToken) {
        return res.status(400).json({ message: "Thiếu userId / refreshToken" });
      }
      const result = await UsersDAO.resetToken(userId, refreshToken);
      if (result?.error) return res.status(401).json({ message: result.error.message || "Làm mới token thất bại" });
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ message: "Làm mới token thất bại", error: e.message });
    }
  }

  static async logout(req, res) {
    try {
      const { userId, refreshToken } = req.body;
      if (!userId || !refreshToken) {
        return res.status(400).json({ message: "Thiếu userId / refreshToken" });
      }
      const result = await UsersDAO.logoutUser(userId, refreshToken);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Đăng xuất thất bại" });
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ message: "Đăng xuất thất bại", error: e.message });
    }
  }

  static async logoutAll(req, res) {
    try {
      const { userId } = req.body; // hoặc từ req.params.id tùy route
      if (!userId) return res.status(400).json({ message: "Thiếu userId" });
      const result = await UsersDAO.logoutAll(userId);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Đăng xuất tất cả thiết bị thất bại" });
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ message: "Đăng xuất tất cả thiết bị thất bại", error: e.message });
    }
  }

  /* ===================== Queries ===================== */
  static async getUsers(req, res) {
    try {
      const { 
        q = "", 
        page = 1, 
        limit = 20, 
        trang_thai,
        phong_ban,
        chuc_vu,
      } = req.query;

      const parsed = {
        q,
        page: Number(page),
        limit: Number(limit),
        trang_thai: typeof trang_thai !== "undefined" ? Number(trang_thai) : undefined,
        phong_ban,
        chuc_vu,
      };

      const result = await UsersDAO.findUsers(parsed);
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ message: "Lấy danh sách người dùng thất bại", error: e.message });
    }
  }

  static async getMyUser(req, res) {
    try {
      const { id } = req.params;
      const user = await UsersDAO.getMyUser(id);
      if (user?.error) return res.status(404).json({ message: user.error.message });
      return res.json(user);
    } catch (e) {
      return res.status(500).json({ message: "Lấy người dùng thất bại", error: e.message });
    }
  }

  /* ===================== Profile / Password ===================== */
  static async updateProfile(req, res) {
    try {
      const { id } = req.params;
      const { ho_ten, ngay_sinh } = req.body;
      const result = await UsersDAO.updateProfile(id, { ho_ten, ngay_sinh });
      if (result?.error) return res.status(400).json({ message: result.error.message || "Cập nhật hồ sơ thất bại" });
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ message: "Cập nhật hồ sơ thất bại", error: e.message });
    }
  }

  static async updatePassword(req, res) {
    try {
      const { id } = req.params;
      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: "Thiếu oldPassword / newPassword" });
      }
      const result = await UsersDAO.updatePassword(id, oldPassword, newPassword);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Cập nhật mật khẩu thất bại" });
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ message: "Cập nhật mật khẩu thất bại", error: e.message });
    }
  }

  /* ===================== Chức vụ (object) ===================== */
  static async setChucVu(req, res) {
    try {
      const { id } = req.params;
      const { ten = "", mo_ta = "", heSoluong = null } = req.body || {};
      const result = await UsersDAO.setChucVu(id, { ten, mo_ta, heSoluong });
      if (result?.error) return res.status(400).json({ message: result.error.message || "Thiết lập chức vụ thất bại" });
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ message: "Thiết lập chức vụ thất bại", error: e.message });
    }
  }

  static async updateChucVu(req, res) {
    try {
      const { id } = req.params;
      const payload = {};
      ["ten", "mo_ta", "heSoluong"].forEach((k) => {
        if (req.body?.[k] !== undefined) payload[k] = req.body[k];
      });
      const result = await UsersDAO.updateChucVu(id, payload);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Cập nhật chức vụ thất bại" });
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ message: "Cập nhật chức vụ thất bại", error: e.message });
    }
  }

  static async clearChucVu(req, res) {
    try {
      const { id } = req.params;
      const result = await UsersDAO.clearChucVu(id);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Xóa chức vụ thất bại" });
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ message: "Xóa chức vụ thất bại", error: e.message });
    }
  }

  /* ===================== Phòng ban (object) ===================== */
  static async setPhongBan(req, res) {
    try {
      const { id } = req.params;
      const { ten = "", mo_ta = "" } = req.body || {};
      const result = await UsersDAO.setPhongBan(id, { ten, mo_ta });
      if (result?.error) return res.status(400).json({ message: result.error.message || "Thiết lập phòng ban thất bại" });
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ message: "Thiết lập phòng ban thất bại", error: e.message });
    }
  }

  static async updatePhongBan(req, res) {
    try {
      const { id } = req.params;
      const payload = {};
      ["ten", "mo_ta"].forEach((k) => {
        if (req.body?.[k] !== undefined) payload[k] = req.body[k];
      });
      const result = await UsersDAO.updatePhongBan(id, payload);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Cập nhật phòng ban thất bại" });
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ message: "Cập nhật phòng ban thất bại", error: e.message });
    }
  }

  static async clearPhongBan(req, res) {
    try {
      const { id } = req.params;
      const result = await UsersDAO.clearPhongBan(id);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Xóa phòng ban thất bại" });
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ message: "Xóa phòng ban thất bại", error: e.message });
    }
  }

  /* ===================== Trạng thái ===================== */
  static async softDelete(req, res) {
    try {
      const { id } = req.params;
      const result = await UsersDAO.softDeleteUser(id);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Khóa người dùng thất bại" });
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ message: "Khóa người dùng thất bại", error: e.message });
    }
  }

  static async restore(req, res) {
    try {
      const { id } = req.params;
      const result = await UsersDAO.restoreUser(id);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Khôi phục người dùng thất bại" });
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ message: "Khôi phục người dùng thất bại", error: e.message });
    }
  }

  static async getDanhSachNhanVien(req, res) {
    try {
      const q = (req.query.q || "").trim();
      const phong_ban_query = (req.query.phong_ban || "").trim(); // 👈 tên phòng ban

      const currentUser = req.user;
      if (!currentUser) return res.status(401).json({ message: "Bạn chưa đăng nhập" });

      const isManager =
        currentUser?.phong_ban?.ten === "Phòng giám đốc" ||
        currentUser?.chuc_vu?.ten === "Trưởng phòng";

      const filter = {};

      // search
      if (q) {
        filter.$or = [
          { ma_nv: { $regex: q, $options: "i" } },
          { ho_ten: { $regex: q, $options: "i" } },
        ];
      }

      // lọc theo phòng ban
      if (isManager) {
        // Manager: nếu truyền phong_ban thì lọc theo phong_ban truyền lên
        if (phong_ban_query) filter["phong_ban.ten"] = phong_ban_query;
      } else {
        // Không phải manager: chỉ được xem phòng ban của chính mình
        const pbTen = currentUser?.phong_ban?.ten;
        if (!pbTen) {
          return res.status(400).json({ message: "Tài khoản chưa có phòng ban" });
        }
        filter["phong_ban.ten"] = pbTen;
      }

      const result = await UsersDAO.getDanhSachNhanVien(filter);
      if (result?.error) {
        return res.status(500).json({
          message: "Lấy danh sách nhân viên không thành công",
          error: result.error?.message || result.error,
        });
      }

      return res.status(200).json({ items: result });
    } catch (e) {
      return res.status(500).json({ message: "Lỗi server", error: e.message });
    }
  }
}
