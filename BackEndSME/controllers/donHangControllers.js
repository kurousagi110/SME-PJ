import DonHangDAO from "../models/donHangDAO.js";

function getUserId(req) {
  return (
    req.user?._id ||
    req.user?.id ||
    req.userId ||
    req.user_id ||
    req.auth?.userId ||
    req.auth?.user_id ||
    null
  );
}

export default class DonHangController {
  static async create(req, res) {
    try {
      const body = req.body || {};
      if (!body.loai_don) body.loai_don = "sale";

      const uid = getUserId(req);
      body.nguoi_lap_id = body.nguoi_lap_id || uid;

      const result = await DonHangDAO.taoDonHang(body);
      if (result?.error) {
        return res.status(400).json({ message: result.error.message || "Tạo chứng từ thất bại" });
      }
      return res.status(201).json({ insertedId: result.insertedId, ma_dh: result.ma_dh });
    } catch (e) {
      return res.status(500).json({ message: "Tạo chứng từ thất bại", error: e.message });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const doc = await DonHangDAO.getDonHangById(id);
      if (doc?.error) return res.status(404).json({ message: doc.error.message });
      return res.json(doc);
    } catch (e) {
      return res.status(500).json({ message: "Lấy chứng từ thất bại", error: e.message });
    }
  }

  static async getByCode(req, res) {
    try {
      const { ma_dh } = req.params;
      const doc = await DonHangDAO.getByCode(ma_dh);
      if (doc?.error) return res.status(404).json({ message: doc.error.message });
      return res.json(doc);
    } catch (e) {
      return res.status(500).json({ message: "Lấy chứng từ theo mã thất bại", error: e.message });
    }
  }

  static async list(req, res) {
    try {
      const {
        q = "",
        loai_don,
        khach_hang_ten,
        nha_cung_cap_ten,
        nguoi_lap_id,
        trang_thai,
        date_from,
        date_to,
        page = 1,
        limit = 20,
        sortBy = "created_at",
        order = "desc",
        includeDeleted,
      } = req.query;

      const result = await DonHangDAO.listDonHang({
        q,
        loai_don,
        khach_hang_ten,
        nha_cung_cap_ten,
        nguoi_lap_id,
        trang_thai,
        date_from,
        date_to,
        page: Number(page),
        limit: Number(limit),
        sortBy,
        order,
        includeDeleted: String(includeDeleted) === "true",
      });

      if (result?.error) {
        return res.status(400).json({ message: result.error.message || "Lấy danh sách thất bại" });
      }
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ message: "Lấy danh sách thất bại", error: e.message });
    }
  }

  // ✅ needs: tính NL cần + tồn kho
  static async productionNeeds(req, res) {
    try {
      const { id } = req.params;
      const result = await DonHangDAO.getProductionNeeds(id);
      if (result?.error) {
        return res.status(400).json({ message: result.error.message || "Không lấy được needs" });
      }
      return res.json({ items: result.items || [] });
    } catch (e) {
      return res.status(500).json({ message: "Không lấy được needs", error: e.message });
    }
  }

  static async updateItems(req, res) {
    try {
      const { id } = req.params;
      const { san_pham } = req.body || {};
      if (!Array.isArray(san_pham) || san_pham.length === 0) {
        return res.status(400).json({ message: "san_pham phải là mảng và có ít nhất 1 phần tử" });
      }
      const result = await DonHangDAO.capNhatSanPham(id, san_pham);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Cập nhật thất bại" });
      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res.status(500).json({ message: "Cập nhật thất bại", error: e.message });
    }
  }

  static async addItem(req, res) {
    try {
      const { id } = req.params;
      const item = req.body || {};
      if (!item || (!item.san_pham_id && !item.ma_sp && !item.nguyen_lieu_id && !item.ma_nl)) {
        return res.status(400).json({ message: "Thiếu san_pham_id/ma_sp hoặc nguyen_lieu_id/ma_nl" });
      }
      const result = await DonHangDAO.themSanPham(id, item);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Thêm thất bại" });
      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res.status(500).json({ message: "Thêm thất bại", error: e.message });
    }
  }

  static async removeItem(req, res) {
    try {
      const { id } = req.params;
      const { idx, code } = req.body || {};
      if (idx === undefined && !code) {
        return res.status(400).json({ message: "Cần idx hoặc code(ma_sp/ma_nl) để xóa" });
      }
      const key = idx !== undefined ? Number(idx) : code;
      const result = await DonHangDAO.xoaSanPham(id, key);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Xóa thất bại" });
      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res.status(500).json({ message: "Xóa thất bại", error: e.message });
    }
  }

  static async applyDiscount(req, res) {
    try {
      const { id } = req.params;
      const { giam_gia } = req.body || {};
      const result = await DonHangDAO.apDungGiamGia(id, giam_gia);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Áp dụng giảm giá thất bại" });
      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res.status(500).json({ message: "Áp dụng giảm giá thất bại", error: e.message });
    }
  }

  static async applyTax(req, res) {
    try {
      const { id } = req.params;
      const { thue_rate } = req.body || {};
      const result = await DonHangDAO.apDungThue(id, thue_rate);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Áp dụng thuế thất bại" });
      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res.status(500).json({ message: "Áp dụng thuế thất bại", error: e.message });
    }
  }

  static async setShippingFee(req, res) {
    try {
      const { id } = req.params;
      const { phi_vc } = req.body || {};
      const result = await DonHangDAO.setPhiVanChuyen(id, phi_vc);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Cập nhật phí VC thất bại" });
      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res.status(500).json({ message: "Cập nhật phí VC thất bại", error: e.message });
    }
  }

  static async updatePayment(req, res) {
    try {
      const { id } = req.params;
      const thanh_toan = req.body || {};
      const result = await DonHangDAO.capNhatThanhToan(id, thanh_toan);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Cập nhật thanh toán thất bại" });
      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res.status(500).json({ message: "Cập nhật thanh toán thất bại", error: e.message });
    }
  }

  static async updateNote(req, res) {
    try {
      const { id } = req.params;
      const { ghi_chu } = req.body || {};
      const result = await DonHangDAO.capNhatGhiChu(id, ghi_chu);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Cập nhật ghi chú thất bại" });
      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res.status(500).json({ message: "Cập nhật ghi chú thất bại", error: e.message });
    }
  }

  static async updateStatus(req, res) {
    const { id } = req.params;
    const { trang_thai } = req.body || {};
    if (!trang_thai) return res.status(400).json({ message: "Thiếu trang_thai" });

    const client = req.app?.locals?.mongoClient;
    const uid = getUserId(req);

    try {
      if (client?.startSession) {
        const session = client.startSession();
        try {
          const result = await session.withTransaction(async () => {
            const r = await DonHangDAO.capNhatTrangThaiVaTonKho(id, trang_thai, {
              session,
              nguoi_thao_tac_id: uid,
            });
            if (r?.error) throw r.error;
            return r;
          });
          return res.json({ modifiedCount: result?.modifiedCount || 0 });
        } finally {
          await session.endSession();
        }
      }

      const result = await DonHangDAO.capNhatTrangThaiVaTonKho(id, trang_thai, { nguoi_thao_tac_id: uid });
      if (result?.error) return res.status(400).json({ message: result.error.message || "Cập nhật trạng thái thất bại" });
      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res.status(400).json({ message: e.message || "Cập nhật trạng thái thất bại" });
    }
  }

  static async softDelete(req, res) {
    try {
      const { id } = req.params;
      const result = await DonHangDAO.softDeleteDonHang(id);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Xóa mềm thất bại" });
      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res.status(500).json({ message: "Xóa mềm thất bại", error: e.message });
    }
  }

  static async restore(req, res) {
    try {
      const { id } = req.params;
      const result = await DonHangDAO.restoreDonHang(id);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Khôi phục thất bại" });
      return res.json({ modifiedCount: result.modifiedCount });
    } catch (e) {
      return res.status(500).json({ message: "Khôi phục thất bại", error: e.message });
    }
  }

  static async hardDelete(req, res) {
    try {
      const { id } = req.params;
      const result = await DonHangDAO.hardDeleteDonHang(id);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Xóa vĩnh viễn thất bại" });
      return res.json({ deletedCount: result.deletedCount });
    } catch (e) {
      return res.status(500).json({ message: "Xóa vĩnh viễn thất bại", error: e.message });
    }
  }

  static async revenueStats(req, res) {
    try {
      const { date_from, date_to } = req.query;
      const result = await DonHangDAO.thongKeDoanhThu({ date_from, date_to });
      if (result?.error) return res.status(400).json({ message: result.error.message || "Thống kê thất bại" });
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ message: "Thống kê thất bại", error: e.message });
    }
  }
}
