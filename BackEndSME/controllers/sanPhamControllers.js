import SanPhamDAO from "../models/sanPhamDAO.js";

export default class SanPhamController {
  /* ============ CREATE ============ */
  static async create(req, res) {
    try {
      const { ma_sp, ten_sp, don_gia, so_luong = 0, mo_ta = "", nguyen_lieu = [] } = req.body || {};

      if (!ma_sp || !ten_sp) {
        return res.status(400).json({ message: "Thiếu ma_sp / ten_sp" });
      }

      const result = await SanPhamDAO.addSanPham(
        ma_sp,
        ten_sp,
        don_gia,
        so_luong,
        mo_ta,
        nguyen_lieu
      );

      if (result?.error) {
        return res.status(400).json({ message: result.error.message || "Thêm sản phẩm thất bại" });
      }

      return res.status(201).json({ insertedId: result.insertedId });
    } catch (e) {
      return res.status(500).json({ message: "Tạo sản phẩm thất bại", error: e.message });
    }
  }

  /* ============ UPDATE INFO ============ */
  static async update(req, res) {
    try {
      const { id } = req.params;

      const payload = {};
      ["ten_sp", "don_gia", "so_luong", "mo_ta", "nguyen_lieu", "trang_thai"].forEach((k) => {
        if (req.body?.[k] !== undefined) payload[k] = req.body[k];
      });

      const result = await SanPhamDAO.updateSanPham(id, payload);
      if (result?.error) {
        return res.status(400).json({ message: result.error.message || "Cập nhật sản phẩm thất bại" });
      }

      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res.status(500).json({ message: "Cập nhật sản phẩm thất bại", error: e.message });
    }
  }

  /* ============ STATUS ============ */
  static async setStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body || {};
      if (!status) return res.status(400).json({ message: "Thiếu status" });

      const result = await SanPhamDAO.setStatus(id, status);
      if (result?.error) {
        return res.status(400).json({ message: result.error.message || "Cập nhật trạng thái thất bại" });
      }

      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res.status(500).json({ message: "Cập nhật trạng thái thất bại", error: e.message });
    }
  }

  /* ============ DELETE / RESTORE ============ */
  static async softDelete(req, res) {
    try {
      const { id } = req.params;
      const result = await SanPhamDAO.softDeleteSanPham(id);

      if (result?.error) {
        return res.status(400).json({ message: result.error.message || "Xóa mềm sản phẩm thất bại" });
      }

      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res.status(500).json({ message: "Xóa mềm sản phẩm thất bại", error: e.message });
    }
  }

  static async restore(req, res) {
    try {
      const { id } = req.params;
      const result = await SanPhamDAO.restoreSanPham(id);

      if (result?.error) {
        return res.status(400).json({ message: result.error.message || "Khôi phục sản phẩm thất bại" });
      }

      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res.status(500).json({ message: "Khôi phục sản phẩm thất bại", error: e.message });
    }
  }

  static async hardDelete(req, res) {
    try {
      const { id } = req.params;
      const result = await SanPhamDAO.hardDeleteSanPham(id);

      if (result?.error) {
        return res.status(400).json({ message: result.error.message || "Xóa vĩnh viễn sản phẩm thất bại" });
      }

      return res.json({ deletedCount: result.deletedCount });
    } catch (e) {
      return res.status(500).json({ message: "Xóa vĩnh viễn sản phẩm thất bại", error: e.message });
    }
  }

  /* ============ READ ONE ============ */
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const includeDeleted = String(req.query?.includeDeleted) === "true";

      const doc = await SanPhamDAO.getSanPhamById(id, { includeDeleted });
      if (doc?.error) {
        return res.status(404).json({ message: doc.error.message });
      }

      return res.json(doc);
    } catch (e) {
      return res.status(500).json({ message: "Lấy sản phẩm theo id thất bại", error: e.message });
    }
  }

  /* ============ LIST (paging + filter + sort) ============ */
  static async list(req, res) {
    try {
      const {
        q = "",
        minPrice,
        maxPrice,
        status,
        page = 1,
        limit = 20,
        sortBy = "createAt",
        order = "desc",
        includeDeleted,
      } = req.query;

      const result = await SanPhamDAO.listSanPham({
        q,
        minPrice: minPrice !== undefined ? Number(minPrice) : undefined,
        maxPrice: maxPrice !== undefined ? Number(maxPrice) : undefined,
        status,
        page: Number(page),
        limit: Number(limit),
        sortBy,
        order,
        includeDeleted: String(includeDeleted) === "true",
      });

      if (result?.error) {
        return res.status(400).json({ message: result.error.message || "Lấy danh sách sản phẩm thất bại" });
      }

      return res.json(result);
    } catch (e) {
      return res.status(500).json({ message: "Lấy danh sách sản phẩm thất bại", error: e.message });
    }
  }

  /* ============ SEARCH QUICK ============ */
  static async search(req, res) {
    try {
      const { q = "", limit = 20 } = req.query;
      const docs = await SanPhamDAO.searchSanPham(q, Number(limit));

      if (docs?.error) {
        return res.status(400).json({ message: docs.error.message || "Tìm kiếm sản phẩm thất bại" });
      }

      return res.json(docs);
    } catch (e) {
      return res.status(500).json({ message: "Tìm kiếm sản phẩm thất bại", error: e.message });
    }
  }

  /* ============ STOCK ============ */
  static async adjustStock(req, res) {
    try {
      const { id } = req.params;
      const { delta, deltaQty, allowNegative = false, newPrice, newMinStock, newDonVi } = req.body || {};

      // ✅ support cả delta và deltaQty
      const dRaw = delta !== undefined ? delta : deltaQty;
      if (dRaw === undefined) return res.status(400).json({ message: "Thiếu delta (hoặc deltaQty)" });

      const result = await SanPhamDAO.adjustStock(id, Number(dRaw), {
        allowNegative,
        newPrice,
        newMinStock,
        newDonVi,
      });

      if (result?.error) {
        return res.status(400).json({ message: result.error.message || "Điều chỉnh tồn kho sản phẩm thất bại" });
      }
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ message: "Điều chỉnh tồn kho sản phẩm thất bại", error: e.message });
    }
  }

  static async bulkAdjustStock(req, res) {
    try {
      const { updates = [], allowNegative = false } = req.body || {};

      const result = await SanPhamDAO.bulkAdjustStock(updates, {
        allowNegative: Boolean(allowNegative),
      });

      if (result?.error) {
        return res.status(400).json({ message: result.error.message || "Điều chỉnh tồn kho hàng loạt thất bại" });
      }

      return res.json(result);
    } catch (e) {
      return res.status(500).json({ message: "Điều chỉnh tồn kho hàng loạt thất bại", error: e.message });
    }
  }

  /* ============ STATS ============ */
  static async stats(req, res) {
    try {
      const { lowStockThreshold = 5 } = req.query;

      const result = await SanPhamDAO.getInventoryStats({
        lowStockThreshold: Number(lowStockThreshold),
      });

      if (result?.error) {
        return res.status(400).json({ message: result.error.message || "Lấy thống kê tồn kho thất bại" });
      }

      return res.json(result);
    } catch (e) {
      return res.status(500).json({ message: "Lấy thống kê tồn kho thất bại", error: e.message });
    }
  }

  static async lowStock(req, res) {
    try {
      const { threshold = 5, limit = 50 } = req.query;

      const result = await SanPhamDAO.getLowStock({
        threshold: Number(threshold),
        limit: Number(limit),
      });

      if (result?.error) {
        return res.status(400).json({
          message: result.error.message || "Lấy danh sách sản phẩm sắp hết hàng thất bại",
        });
      }

      return res.json(result);
    } catch (e) {
      return res.status(500).json({
        message: "Lấy danh sách sản phẩm sắp hết hàng thất bại",
        error: e.message,
      });
    }
  }

  // GET /san-pham/stock?q=&status=&min_qty=&max_qty=&page=&limit=&sortBy=&sortDir=
  static async getAllStock(req, res) {
    try {
      console.log("SanPhamController.getAllStock called with query:", req.query);
      const params = {
        q: (req.query.q || "").trim(),
        status: (req.query.status || "").trim(),
        min_qty:
          req.query.min_qty !== undefined ? Number(req.query.min_qty) : undefined,
        max_qty:
          req.query.max_qty !== undefined ? Number(req.query.max_qty) : undefined,
        page: req.query.page !== undefined ? Number(req.query.page) : 1,
        limit: req.query.limit !== undefined ? Number(req.query.limit) : 20,
        sortBy: req.query.sortBy || "ten_sp",
        sortDir: req.query.sortDir || "asc",
      };

      const result = await SanPhamDAO.getAllStock(params);

      if (result?.error) {
        return res.status(500).json({
          success: false,
          message: "Lấy tồn kho không thành công",
          error: String(result.error?.message || result.error),
        });
      }

      return res.status(200).json({
        success: true,
        ...result, // { items, pagination }
      });
    } catch (e) {
      console.error("SanPhamController.getAllStock error:", e);
      return res.status(500).json({
        success: false,
        message: "Lấy tồn kho không thành công",
        error: String(e?.message || e),
      });
    }
  }
}
