import NguyenLieuDAO from "../models/nguyenLieuDAO.js";

export default class NguyenLieuController {
  /* ============ CREATE ============ */
  static async create(req, res) {
    try {
      const { ma_nl, ten_nl, don_vi, gia_nhap, so_luong, ton_toi_thieu, mo_ta } = req.body || {};
      if (!ma_nl || !ten_nl || !don_vi) {
        return res.status(400).json({ message: "Thiếu ma_nl / ten_nl / don_vi" });
      }

      const result = await NguyenLieuDAO.addNguyenLieu({
        ma_nl,
        ten_nl,
        don_vi,
        gia_nhap,
        so_luong,
        ton_toi_thieu,
        mo_ta,
      });

      if (result?.error) return res.status(400).json({ message: result.error.message || "Thêm nguyên liệu thất bại" });
      return res.status(201).json({ insertedId: result.insertedId });
    } catch (e) {
      return res.status(500).json({ message: "Tạo nguyên liệu thất bại", error: e.message });
    }
  }

  /* ============ UPDATE ============ */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const payload = {};
      ["ten_nl", "don_vi", "gia_nhap", "so_luong", "mo_ta", "ton_toi_thieu", "trang_thai"].forEach(
        (k) => {
          if (req.body?.[k] !== undefined) payload[k] = req.body[k];
        }
      );

      const result = await NguyenLieuDAO.updateNguyenLieu(id, payload);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Cập nhật nguyên liệu thất bại" });
      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res.status(500).json({ message: "Cập nhật nguyên liệu thất bại", error: e.message });
    }
  }

  /* ============ ADJUST STOCK ============ */
  // body: { deltaQty: number, newUnitCost?: number, allowNegative?: boolean }
  static async adjustStock(req, res) {
  try {
    const { id } = req.params;
    const { deltaQty, newUnitCost, allowNegative = false } = req.body || {};
    if (deltaQty === undefined) return res.status(400).json({ message: "Thiếu deltaQty" });

    console.log("✅ adjust-stock API", { id, deltaQty, allowNegative, newUnitCost });

    const result = await NguyenLieuDAO.adjustStock(id, Number(deltaQty), { newUnitCost, allowNegative });
    if (result?.error) return res.status(400).json({ message: result.error.message || "Điều chỉnh tồn kho thất bại" });
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ message: "Điều chỉnh tồn kho thất bại", error: e.message });
  }
}


  /* ============ SOFT DELETE / RESTORE ============ */
  static async softDelete(req, res) {
    try {
      const { id } = req.params;
      const result = await NguyenLieuDAO.softDelete(id);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Xóa mềm nguyên liệu thất bại" });
      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res.status(500).json({ message: "Xóa mềm nguyên liệu thất bại", error: e.message });
    }
  }

  static async restore(req, res) {
    try {
      const { id } = req.params;
      const result = await NguyenLieuDAO.restore(id);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Khôi phục nguyên liệu thất bại" });
      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res.status(500).json({ message: "Khôi phục nguyên liệu thất bại", error: e.message });
    }
  }

  /* ============ READ ONE ============ */
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const includeDeleted = String(req.query?.includeDeleted) === "true";

      const doc = await NguyenLieuDAO.getById(id, { includeDeleted });
      if (doc?.error) return res.status(404).json({ message: doc.error.message });
      return res.json(doc);
    } catch (e) {
      return res.status(500).json({ message: "Lấy nguyên liệu theo id thất bại", error: e.message });
    }
  }

  /* ============ LIST ============ */
  static async list(req, res) {
    try {
      const {
        q = "",
        status,
        lowStockOnly,
        page = 1,
        limit = 20,
        sortBy = "ten_nl",
        order = "asc",
        includeDeleted,
      } = req.query;

      const result = await NguyenLieuDAO.list({
        q,
        status,
        lowStockOnly: String(lowStockOnly) === "true",
        page: Number(page),
        limit: Number(limit),
        sortBy,
        order,
        includeDeleted: String(includeDeleted) === "true",
      });

      if (result?.error) return res.status(400).json({ message: result.error.message || "Lấy danh sách nguyên liệu thất bại" });
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ message: "Lấy danh sách nguyên liệu thất bại", error: e.message });
    }
  }

  /* ============ SEARCH QUICK ============ */
  static async search(req, res) {
    try {
      const { q = "", limit = 20 } = req.query;
      const docs = await NguyenLieuDAO.search(q, Number(limit));
      if (docs?.error) return res.status(400).json({ message: docs.error.message || "Tìm kiếm nguyên liệu thất bại" });
      return res.json(docs);
    } catch (e) {
      return res.status(500).json({ message: "Tìm kiếm nguyên liệu thất bại", error: e.message });
    }
  }

  /* ============ STATS ============ */
  static async stats(req, res) {
    try {
      const { lowStockThreshold } = req.query;
      const result = await NguyenLieuDAO.getInventoryStats({
        lowStockThreshold: lowStockThreshold !== undefined ? Number(lowStockThreshold) : undefined,
      });
      if (result?.error) return res.status(400).json({ message: result.error.message || "Lấy thống kê tồn kho thất bại" });
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ message: "Lấy thống kê tồn kho thất bại", error: e.message });
    }
  }

  static async lowStock(req, res) {
    try {
      const { threshold, limit = 50 } = req.query;
      const result = await NguyenLieuDAO.getLowStock({
        threshold: threshold !== undefined ? Number(threshold) : undefined,
        limit: Number(limit),
      });
      if (result?.error) return res.status(400).json({ message: result.error.message || "Lấy danh sách nguyên liệu sắp hết hàng thất bại" });
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ message: "Lấy danh sách nguyên liệu sắp hết hàng thất bại", error: e.message });
    }
  }
  static async getAllStock(req, res) {
    try {
      const params = {
        q: (req.query.q || "").trim(),
        status: (req.query.status || "").trim(),
        min_qty: req.query.min_qty !== undefined ? Number(req.query.min_qty) : undefined,
        max_qty: req.query.max_qty !== undefined ? Number(req.query.max_qty) : undefined,
        page: req.query.page !== undefined ? Number(req.query.page) : 1,
        limit: req.query.limit !== undefined ? Number(req.query.limit) : 20,
        sortBy: req.query.sortBy || "ten_nl",
        sortDir: req.query.sortDir || "asc",
      };

      const result = await NguyenLieuDAO.getAllStock(params);

      if (result?.error) {
        return res.status(500).json({
          success: false,
          message: "Lấy kho nguyên liệu không thành công",
          error: String(result.error?.message || result.error),
        });
      }

      return res.status(200).json({ success: true, ...result });
    } catch (e) {
      console.error("NguyenLieuController.getAllStock error:", e);
      return res.status(500).json({
        success: false,
        message: "Lấy kho nguyên liệu không thành công",
        error: String(e?.message || e),
      });
    }
  }
}
