import LuongDAO from "../models/luongDAO.js";

export default class LuongController {
  /* ===================== CHẤM CÔNG 1 ===================== */
  static async chamCong(req, res) {
    try {
      const { ma_nv, gio_check_in, gio_check_out, ngay_thang, so_gio_lam, ghi_chu } = req.body || {};

      if (!ma_nv || !ngay_thang) {
        return res.status(400).json({ message: "Thiếu ma_nv / ngay_thang" });
      }

      const result = await LuongDAO.createOrUpdateChamCong({
        ma_nv,
        gio_check_in,
        gio_check_out,
        ngay_thang,
        so_gio_lam,
        ghi_chu,
      });

      if (result?.error) {
        return res.status(400).json({ message: result.error.message || "Chấm công thất bại" });
      }

      return res.json({
        ok: true,
        upsertedId: result.upsertedId,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      });
    } catch (e) {
      return res.status(500).json({ message: "Chấm công failed", error: e.message });
    }
  }

  /* ===================== ✅ CHẤM CÔNG BULK ===================== */
  static async chamCongBulk(req, res) {
    try {
      const { ngay_thang, items } = req.body || {};

      if (!ngay_thang || !Array.isArray(items)) {
        return res.status(400).json({ message: "Thiếu ngay_thang hoặc items (list)" });
      }
      if (items.length === 0) {
        return res.status(400).json({ message: "items rỗng" });
      }

      const result = await LuongDAO.createOrUpdateChamCongBulk({ ngay_thang, items });

      if (result?.error) {
        return res.status(400).json({
          message: result.error.message || "Bulk chấm công thất bại",
          errors: result.errors || [],
        });
      }

      return res.json({
        ok: true,
        message: "Bulk chấm công thành công",
        data: result,
      });
    } catch (e) {
      return res.status(500).json({ message: "Bulk chấm công failed", error: e.message });
    }
  }

  /* ===================== GET BY DAY (1 NV) ===================== */
  static async getChamCongByDay(req, res) {
    try {
      const { ma_nv, ngay_thang } = req.query;

      if (!ma_nv || !ngay_thang) {
        return res.status(400).json({ message: "Thiếu ma_nv / ngay_thang" });
      }

      const doc = await LuongDAO.getChamCongByDay({ ma_nv, ngay_thang });

      if (doc?.error) return res.status(404).json({ message: doc.error.message });
      return res.json(doc);
    } catch (e) {
      return res.status(500).json({ message: "Get chấm công theo ngày failed", error: e.message });
    }
  }

  /* ===================== ✅ LIST ===================== */
  static async listChamCong(req, res) {
    try {
      const { ma_nv, ngay_thang, from, to, page = 1, limit = 50 } = req.query;

      // ✅ đúng logic FE: chỉ truyền ngay_thang => list tất cả NV của ngày đó
      // ✅ nếu có ma_nv + ngay_thang => lấy 1 bản ghi
      const result = await LuongDAO.listChamCong({
        ma_nv,
        ngay_thang,
        from,
        to,
        page: Number(page),
        limit: Number(limit),
      });

      if (result?.error) {
        return res.status(400).json({ message: result.error.message || "List chấm công failed" });
      }

      return res.json(result);
    } catch (e) {
      return res.status(500).json({ message: "List chấm công failed", error: e.message });
    }
  }

  /* ===================== DELETE ===================== */
  static async softDeleteChamCong(req, res) {
    try {
      const { id } = req.params;
      const result = await LuongDAO.softDeleteChamCong(id);

      if (result?.error) {
        return res.status(400).json({ message: result.error.message || "Xóa chấm công failed" });
      }
      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res.status(500).json({ message: "Xóa chấm công failed", error: e.message });
    }
  }

  /* ===================== TÍNH LƯƠNG ===================== */
  static async tinhLuongThang(req, res) {
    try {
      const { ma_nv, thang, nam, don_gia_gio, thuong, phat, ghi_chu } = req.body || {};

      if (!ma_nv || !thang || !nam) {
        return res.status(400).json({ message: "Thiếu ma_nv / thang / nam" });
      }

      const result = await LuongDAO.tinhLuongThang({
        ma_nv,
        thang,
        nam,
        don_gia_gio,
        thuong,
        phat,
        ghi_chu,
      });

      if (result?.error) {
        return res.status(400).json({ message: result.error.message || "Tính lương tháng failed" });
      }

      return res.json(result);
    } catch (e) {
      return res.status(500).json({ message: "Tính lương tháng failed", error: e.message });
    }
  }
}
