import phongban_chucvuDAO from "../models/phongban_chucvuDAO.js";

export default class PhongBanChucVuController {
  /* ============ CREATE PHÒNG BAN ============ */
  static async create(req, res) {
    try {
      const { ten_phong_ban, mo_ta, chuc_vu } = req.body || {};
      if (!ten_phong_ban) {
        return res.status(400).json({ message: "Thiếu ten_phong_ban" });
      }

      const result = await phongban_chucvuDAO.addPhongBanChucVu(
        ten_phong_ban,
        mo_ta,
        chuc_vu
      );

      if (result?.error) {
        return res
          .status(400)
          .json({ message: result.error.message || "Thêm phòng ban thất bại" });
      }

      return res.status(201).json({ insertedId: result.insertedId });
    } catch (e) {
      return res
        .status(500)
        .json({ message: "Tạo phòng ban thất bại", error: e.message });
    }
  }

  /* ============ LIST ============ */
  static async list(req, res) {
    try {
      const { q = "", status, page = 1, limit = 20 } = req.query;

      const result = await phongban_chucvuDAO.list({
        q,
        status,
        page: Number(page),
        limit: Number(limit),
      });

      if (result?.error) {
        return res
          .status(400)
          .json({ message: result.error.message || "Lấy danh sách phòng ban thất bại" });
      }

      return res.json(result);
    } catch (e) {
      return res
        .status(500)
        .json({ message: "Lấy danh sách phòng ban thất bại", error: e.message });
    }
  }

  /* ============ GET BY ID ============ */
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const doc = await phongban_chucvuDAO.getById(id);
      if (doc?.error) {
        return res.status(404).json({ message: doc.error.message });
      }
      return res.json(doc);
    } catch (e) {
      return res
        .status(500)
        .json({ message: "Lấy phòng ban theo id thất bại", error: e.message });
    }
  }

  /* ============ GET ALL PHÒNG BAN ============ */
  static async getAllPhongBan(req, res) {
    try {
      const { includeDeleted = false } = req.query;
      const items = await phongban_chucvuDAO.getAllPhongBan({
        includeDeleted: includeDeleted === "true",
      });
      if (items?.error) {
        return res
          .status(400)
          .json({ message: items.error.message || "Lấy toàn bộ phòng ban thất bại" });
      }
      return res.json(items);
    } catch (e) {
      return res
        .status(500)
        .json({ message: "Lấy toàn bộ phòng ban thất bại", error: e.message });
    }
  }

  /* ============ UPDATE PHÒNG BAN ============ */
  static async updatePhongBan(req, res) {
    try {
      const { id } = req.params;
      const payload = {};
      ["ten_phong_ban", "mo_ta", "trang_thai"].forEach((k) => {
        if (req.body?.[k] !== undefined) payload[k] = req.body[k];
      });

      const result = await phongban_chucvuDAO.updatePhongBan(id, payload);
      if (result?.error) {
        return res
          .status(400)
          .json({ message: result.error.message || "Cập nhật phòng ban thất bại" });
      }
      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res
        .status(500)
        .json({ message: "Cập nhật phòng ban thất bại", error: e.message });
    }
  }

  /* ============ SOFT DELETE / RESTORE / HARD DELETE ============ */
  static async softDelete(req, res) {
    try {
      const { id } = req.params;
      const result = await phongban_chucvuDAO.softDeletePhongBan(id);
      if (result?.error) {
        return res
          .status(400)
          .json({ message: result.error.message || "Xóa mềm phòng ban thất bại" });
      }
      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res
        .status(500)
        .json({ message: "Xóa mềm phòng ban thất bại", error: e.message });
    }
  }

  static async restore(req, res) {
    try {
      const { id } = req.params;
      const result = await phongban_chucvuDAO.restorePhongBan(id);
      if (result?.error) {
        return res
          .status(400)
          .json({ message: result.error.message || "Khôi phục phòng ban thất bại" });
      }
      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res
        .status(500)
        .json({ message: "Khôi phục phòng ban thất bại", error: e.message });
    }
  }

  static async hardDelete(req, res) {
    try {
      const { id } = req.params;
      const result = await phongban_chucvuDAO.hardDeletePhongBan(id);
      if (result?.error) {
        return res
          .status(400)
          .json({ message: result.error.message || "Xóa vĩnh viễn phòng ban thất bại" });
      }
      return res.json({ deletedCount: result.deletedCount });
    } catch (e) {
      return res
        .status(500)
        .json({ message: "Xóa vĩnh viễn phòng ban thất bại", error: e.message });
    }
  }

  /* ============ CHỨC VỤ ============ */
  static async addChucVu(req, res) {
    try {
      const { id } = req.params;
      const { ten_chuc_vu, mo_ta, he_so_luong } = req.body || {};
      if (!ten_chuc_vu) {
        return res.status(400).json({ message: "Thiếu ten_chuc_vu" });
      }

      const result = await phongban_chucvuDAO.addChucVu(id, {
        ten_chuc_vu,
        mo_ta,
        he_so_luong,
      });

      if (result?.error) {
        return res
          .status(400)
          .json({ message: result.error.message || "Thêm chức vụ thất bại" });
      }
      return res.json({
        modifiedCount: result.modifiedCount,
        chuc_vu_id: result.chuc_vu_id,
      });
    } catch (e) {
      return res
        .status(500)
        .json({ message: "Thêm chức vụ thất bại", error: e.message });
    }
  }

  static async updateChucVu(req, res) {
    try {
      const { id, chucVuId } = req.params;
      const payload = {};
      ["ten_chuc_vu", "mo_ta", "he_so_luong", "trang_thai"].forEach((k) => {
        if (req.body?.[k] !== undefined) payload[k] = req.body[k];
      });

      const result = await phongban_chucvuDAO.updateChucVu(
        id,
        chucVuId,
        payload
      );
      if (result?.error) {
        return res
          .status(400)
          .json({ message: result.error.message || "Cập nhật chức vụ thất bại" });
      }
      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res
        .status(500)
        .json({ message: "Cập nhật chức vụ thất bại", error: e.message });
    }
  }

  static async removeChucVu(req, res) {
    try {
      const { id, chucVuId } = req.params;
      const result = await phongban_chucvuDAO.removeChucVu(id, chucVuId);
      if (result?.error) {
        return res
          .status(400)
          .json({ message: result.error.message || "Xóa chức vụ thất bại" });
      }
      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res
        .status(500)
        .json({ message: "Xóa chức vụ thất bại", error: e.message });
    }
  }

  static async setTrangThaiChucVu(req, res) {
    try {
      const { id, chucVuId } = req.params;
      const { trang_thai } = req.body || {};
      if (!trang_thai) {
        return res.status(400).json({ message: "Thiếu trang_thai" });
      }
      const result = await phongban_chucvuDAO.setTrangThaiChucVu(
        id,
        chucVuId,
        trang_thai
      );
      if (result?.error) {
        return res
          .status(400)
          .json({
            message: result.error.message || "Cập nhật trạng thái chức vụ thất bại",
          });
      }
      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res.status(500).json({
        message: "Cập nhật trạng thái chức vụ thất bại",
        error: e.message,
      });
    }
  }
}
