import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";
import DonHangDAO from "./donHangDAO.js";

let quotationCol;

function genQuotationCode() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BG-${ymd}-${rand}`;
}

export const QUOTATION_STATUS = {
  DRAFT: "draft",         // Bản thảo
  SENT: "sent",           // Đã gửi khách
  ACCEPTED: "accepted",   // Khách chấp thuận
  REJECTED: "rejected",   // Khách từ chối
  CONVERTED: "converted", // Đã chuyển thành Đơn Hàng chính thức
};

export default class QuotationDAO {
  static async injectDB(conn) {
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
    if (!dbName) throw new Error("QuotationDAO: missing DB name");
    quotationCol = conn.db(dbName).collection("bao_gia");
    await quotationCol.createIndex({ ma_bao_gia: 1 }, { unique: true });
    await quotationCol.createIndex({ created_at: -1 });
  }

  static async list({ trang_thai, search, page = 1, limit = 20 } = {}) {
    try {
      const filter = {};
      if (trang_thai && trang_thai !== "all") {
        filter.trang_thai = trang_thai;
      }
      if (search) {
        const q = String(search).trim();
        filter.$or = [
          { ma_bao_gia: { $regex: q, $options: "i" } },
          { "khach_hang.ten": { $regex: q, $options: "i" } },
          { "khach_hang.so_dien_thoai": { $regex: q, $options: "i" } },
        ];
      }

      const skip = Math.max(0, (Number(page) - 1) * Number(limit));
      const [items, total] = await Promise.all([
        quotationCol.find(filter).sort({ created_at: -1 }).skip(skip).limit(Number(limit)).toArray(),
        quotationCol.countDocuments(filter),
      ]);

      return {
        items,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)) || 1,
      };
    } catch (err) {
      logger.error("QuotationDAO.list error", { error: err.message });
      return { error: err };
    }
  }

  static async getByCode(ma_bao_gia) {
    try {
      return await quotationCol.findOne({ ma_bao_gia: String(ma_bao_gia).trim() });
    } catch (err) {
      return null;
    }
  }

  static async create({
    khach_hang = {},
    ngay_het_han,
    items = [],
    thue_vat = 0,
    dieu_khoan = "",
    ghi_chu = "",
    user = {},
  }) {
    try {
      const ma_bao_gia = genQuotationCode();
      const now = new Date();

      let tong_tien_truoc_ck = 0;
      let tong_chiet_khau = 0;

      const processedItems = items.map((it) => {
        const qty = Math.max(1, Number(it.so_luong) || 1);
        const price = Math.max(0, Number(it.don_gia) || 0);
        const discountPct = Math.min(100, Math.max(0, Number(it.chiet_khau_phan_tram) || 0));
        const subtotal = qty * price;
        const discountVal = (subtotal * discountPct) / 100;
        const lineTotal = subtotal - discountVal;

        tong_tien_truoc_ck += subtotal;
        tong_chiet_khau += discountVal;

        return {
          san_pham_id: it.san_pham_id ? String(it.san_pham_id) : null,
          ma_sp: it.ma_sp || "",
          ten_sp: it.ten_sp || "",
          don_vi: it.don_vi || "Cái",
          so_luong: qty,
          don_gia: price,
          chiet_khau_phan_tram: discountPct,
          thanh_tien: lineTotal,
        };
      });

      const tien_sau_ck = tong_tien_truoc_ck - tong_chiet_khau;
      const vatAmount = (tien_sau_ck * (Number(thue_vat) || 0)) / 100;
      const tong_thanh_toan = tien_sau_ck + vatAmount;

      const doc = {
        ma_bao_gia,
        khach_hang: {
          ten: khach_hang.ten || "Khách hàng",
          so_dien_thoai: khach_hang.so_dien_thoai || "",
          email: khach_hang.email || "",
          dia_chi: khach_hang.dia_chi || "",
          cong_ty: khach_hang.cong_ty || "",
        },
        ngay_bao_gia: now,
        ngay_het_han: ngay_het_han ? new Date(ngay_het_han) : new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
        items: processedItems,
        tong_tien_truoc_ck,
        tong_chiet_khau,
        thue_vat: Number(thue_vat) || 0,
        tien_thue_vat: vatAmount,
        tong_thanh_toan,
        dieu_khoan: String(dieu_khoan || "").trim(),
        ghi_chu: String(ghi_chu || "").trim(),
        trang_thai: QUOTATION_STATUS.DRAFT,
        ma_don_hang: null,
        created_by: {
          user_id: user._id || user.id ? String(user._id || user.id) : null,
          ho_ten: user.ho_ten || user.tai_khoan || "Nhân viên kinh doanh",
        },
        created_at: now,
        updated_at: now,
      };

      const res = await quotationCol.insertOne(doc);
      return { ok: true, insertedId: res.insertedId, doc };
    } catch (err) {
      logger.error("QuotationDAO.create error", { error: err.message });
      return { error: err };
    }
  }

  static async updateStatus(ma_bao_gia, trang_thai, user = {}) {
    try {
      const q = await quotationCol.findOne({ ma_bao_gia: String(ma_bao_gia).trim() });
      if (!q) return { error: new Error("Không tìm thấy báo giá") };

      await quotationCol.updateOne(
        { ma_bao_gia: q.ma_bao_gia },
        {
          $set: {
            trang_thai,
            updated_at: new Date(),
            updated_by: {
              user_id: user._id || user.id ? String(user._id || user.id) : null,
              ho_ten: user.ho_ten || user.tai_khoan || "Hệ thống",
            },
          },
        }
      );
      return { ok: true, ma_bao_gia: q.ma_bao_gia, trang_thai };
    } catch (err) {
      return { error: err };
    }
  }

  /**
   * Chuyển Báo Giá thành Đơn Bán Hàng chính thức (1-Click Quote-to-Order)
   */
  static async convertToOrder(ma_bao_gia, user = {}) {
    try {
      const q = await quotationCol.findOne({ ma_bao_gia: String(ma_bao_gia).trim() });
      if (!q) return { error: new Error("Không tìm thấy báo giá") };

      if (q.trang_thai === QUOTATION_STATUS.CONVERTED && q.ma_don_hang) {
        return { error: new Error(`Báo giá đã được chuyển đổi thành đơn hàng ${q.ma_don_hang} trước đó`) };
      }

      // Tạo đơn hàng bán (loai_don: 'sale')
      const userId = user._id || user.id || new ObjectId();
      const orderPayload = {
        loai_don: "sale",
        khach_hang_ten: q.khach_hang?.ten || "Khách hàng B2B",
        nguoi_lap_id: ObjectId.isValid(userId) ? new ObjectId(userId) : new ObjectId(),
        san_pham: q.items.map((it) => ({
          san_pham_id: it.san_pham_id,
          ma_sp: it.ma_sp,
          ten_sp: it.ten_sp,
          don_vi: it.don_vi,
          so_luong: it.so_luong,
          don_gia: it.don_gia,
          thanh_tien: it.thanh_tien,
        })),
        giam_gia: q.tong_chiet_khau || 0,
        thue_rate: (q.thue_vat || 0) > 1 ? (q.thue_vat || 0) / 100 : (q.thue_vat || 0),
        ghi_chu: `Chuyển đổi từ Báo giá ${q.ma_bao_gia}. ${q.ghi_chu || ""}`,
        trang_thai: "confirmed",
      };

      const orderRes = await DonHangDAO.taoDonHang(orderPayload);
      if (orderRes.error) return { error: orderRes.error };

      const ma_dh = orderRes.doc?.ma_dh || orderRes.ma_dh;
      const don_hang_id = orderRes.insertedId ? String(orderRes.insertedId) : null;

      // Cập nhật trạng thái báo giá sang 'converted'
      await quotationCol.updateOne(
        { ma_bao_gia: q.ma_bao_gia },
        {
          $set: {
            trang_thai: QUOTATION_STATUS.CONVERTED,
            ma_don_hang: ma_dh,
            updated_at: new Date(),
          },
        }
      );

      return {
        ok: true,
        ma_dh,
        don_hang_id,
        ma_bao_gia: q.ma_bao_gia,
        trang_thai: QUOTATION_STATUS.CONVERTED,
      };
    } catch (err) {
      logger.error("QuotationDAO.convertToOrder error", { error: err.message });
      return { error: err };
    }
  }

  static async delete(ma_bao_gia) {
    try {
      const q = await quotationCol.findOne({ ma_bao_gia: String(ma_bao_gia).trim() });
      if (!q) return { error: new Error("Không tìm thấy báo giá") };
      if (q.trang_thai === QUOTATION_STATUS.CONVERTED) {
        return { error: new Error("Không thể xóa báo giá đã chuyển thành đơn hàng") };
      }
      await quotationCol.deleteOne({ ma_bao_gia: q.ma_bao_gia });
      return { ok: true };
    } catch (err) {
      return { error: err };
    }
  }
}
