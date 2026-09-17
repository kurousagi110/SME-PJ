import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";

export const LOAI_PHIEU = {
  THU: "thu",
  CHI: "chi",
};

export const PHUONG_THUC = {
  TIEN_MAT: "tien_mat",
  CHUYEN_KHOAN: "chuyen_khoan",
};

export const STATUS = {
  ACTIVE: "active",
  CANCELLED: "cancelled",
};

let soQuyCol = null;
let donHangCol = null;

function genPhieuCode(prefix = "PT") {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${ymd}-${rand}`;
}

export default class SoQuyDAO {
  static async injectDB(conn) {
    if (soQuyCol && donHangCol) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME || "SME_db_mongo";
    const db = conn.db(dbName);
    soQuyCol = db.collection("so_quy");
    donHangCol = db.collection("don_hang");

    try {
      await soQuyCol.createIndex({ ma_phieu: 1 }, { unique: true });
      await soQuyCol.createIndex({ loai_phieu: 1, ngay_ghi_nhan: -1 });
      await soQuyCol.createIndex({ ma_chung_tu: 1 });
      await soQuyCol.createIndex({ trang_thai: 1 });
    } catch (err) {
      logger.error("Error creating indexes in so_quy", { error: err.message });
    }
  }

  static async taoPhieu({
    loai_phieu,
    hang_muc,
    so_tien,
    phuong_thuc = PHUONG_THUC.TIEN_MAT,
    doi_tuong = {},
    ma_chung_tu = "",
    ngay_ghi_nhan,
    ghi_chu = "",
    user = {},
  }) {
    try {
      const isThu = loai_phieu === LOAI_PHIEU.THU;
      const prefix = isThu ? "PT" : "PC";
      const ma_phieu = genPhieuCode(prefix);
      const now = new Date();

      let recordDate = now;
      if (ngay_ghi_nhan) {
        const parsed = new Date(ngay_ghi_nhan);
        if (!Number.isNaN(parsed.getTime())) {
          recordDate = parsed;
        }
      }

      const doc = {
        ma_phieu,
        loai_phieu: isThu ? LOAI_PHIEU.THU : LOAI_PHIEU.CHI,
        hang_muc: hang_muc || (isThu ? "thu_khac" : "chi_khac"),
        so_tien: Math.max(0, Math.round(Number(so_tien) || 0)),
        phuong_thuc: phuong_thuc === PHUONG_THUC.CHUYEN_KHOAN ? PHUONG_THUC.CHUYEN_KHOAN : PHUONG_THUC.TIEN_MAT,
        doi_tuong: {
          loai: doi_tuong.loai || "khac",
          ten: (doi_tuong.ten || "").trim(),
          so_dien_thoai: (doi_tuong.so_dien_thoai || "").trim(),
          dia_chi: (doi_tuong.dia_chi || "").trim(),
        },
        ma_chung_tu: (ma_chung_tu || "").trim(),
        ngay_ghi_nhan: recordDate,
        nguoi_tao: {
          user_id: user._id || user.id ? String(user._id || user.id) : null,
          ho_ten: user.ho_ten || user.tai_khoan || "Hệ thống",
        },
        ghi_chu: (ghi_chu || "").trim(),
        trang_thai: STATUS.ACTIVE,
        created_at: now,
        updated_at: now,
      };

      const result = await soQuyCol.insertOne(doc);
      return { ok: true, insertedId: result.insertedId, doc };
    } catch (e) {
      logger.error("SoQuyDAO.taoPhieu error", { error: e.message });
      return { error: e };
    }
  }

  static async layDanhSachSoQuy({
    loai_phieu,
    hang_muc,
    phuong_thuc,
    tu_ngay,
    den_ngay,
    search,
    page = 1,
    limit = 20,
  } = {}) {
    try {
      const filter = {};
      if (loai_phieu) filter.loai_phieu = loai_phieu;
      if (hang_muc) filter.hang_muc = hang_muc;
      if (phuong_thuc) filter.phuong_thuc = phuong_thuc;

      if (tu_ngay || den_ngay) {
        filter.ngay_ghi_nhan = {};
        if (tu_ngay) filter.ngay_ghi_nhan.$gte = new Date(tu_ngay);
        if (den_ngay) {
          const end = new Date(den_ngay);
          end.setHours(23, 59, 59, 999);
          filter.ngay_ghi_nhan.$lte = end;
        }
      }

      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), "i");
        filter.$or = [
          { ma_phieu: regex },
          { ma_chung_tu: regex },
          { "doi_tuong.ten": regex },
          { ghi_chu: regex },
        ];
      }

      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Math.min(100, Number(limit) || 20));
      const skip = (pageNum - 1) * limitNum;

      const [items, total] = await Promise.all([
        soQuyCol.find(filter).sort({ ngay_ghi_nhan: -1, created_at: -1 }).skip(skip).limit(limitNum).toArray(),
        soQuyCol.countDocuments(filter),
      ]);

      return {
        ok: true,
        items,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      };
    } catch (e) {
      logger.error("SoQuyDAO.layDanhSachSoQuy error", { error: e.message });
      return { error: e };
    }
  }

  static async layTongQuanDoiSoat() {
    try {
      const activeFilter = { trang_thai: STATUS.ACTIVE };

      const agg = await soQuyCol.aggregate([
        { $match: activeFilter },
        {
          $group: {
            _id: { loai_phieu: "$loai_phieu", phuong_thuc: "$phuong_thuc" },
            tong: { $sum: "$so_tien" },
          },
        },
      ]).toArray();

      let tong_thu = 0;
      let tong_chi = 0;
      let tien_mat_thu = 0;
      let tien_mat_chi = 0;
      let chuyen_khoan_thu = 0;
      let chuyen_khoan_chi = 0;

      for (const row of agg) {
        const amt = row.tong || 0;
        if (row._id.loai_phieu === LOAI_PHIEU.THU) {
          tong_thu += amt;
          if (row._id.phuong_thuc === PHUONG_THUC.TIEN_MAT) tien_mat_thu += amt;
          else chuyen_khoan_thu += amt;
        } else if (row._id.loai_phieu === LOAI_PHIEU.CHI) {
          tong_chi += amt;
          if (row._id.phuong_thuc === PHUONG_THUC.TIEN_MAT) tien_mat_chi += amt;
          else chuyen_khoan_chi += amt;
        }
      }

      const ton_quy = tong_thu - tong_chi;
      const ton_tien_mat = tien_mat_thu - tien_mat_chi;
      const ton_chuyen_khoan = chuyen_khoan_thu - chuyen_khoan_chi;

      return {
        ok: true,
        tong_thu,
        tong_chi,
        ton_quy,
        ton_tien_mat,
        ton_chuyen_khoan,
      };
    } catch (e) {
      logger.error("SoQuyDAO.layTongQuanDoiSoat error", { error: e.message });
      return { error: e };
    }
  }

  static async layDanhSachCongNo() {
    try {
      // 1. Phải thu từ khách hàng (Đơn bán hàng)
      const salesOrders = await donHangCol
        .find({ loai_don: "sale", trang_thai: { $nin: ["draft", "cancelled", "deleted"] } })
        .sort({ ngay_dat: -1, createAt: -1 })
        .toArray();

      // 2. Phải trả nhà cung cấp (Đơn mua nguyên vật liệu / purchase receipt)
      const purchaseOrders = await donHangCol
        .find({ loai_don: "purchase_receipt", trang_thai: { $nin: ["draft", "cancelled", "deleted"] } })
        .sort({ ngay_dat: -1, createAt: -1 })
        .toArray();

      // Lấy tất cả phiếu thu chi active đã liên kết chứng từ
      const activeReceipts = await soQuyCol
        .find({ trang_thai: STATUS.ACTIVE, ma_chung_tu: { $ne: "" } })
        .toArray();

      const receiptsMap = new Map(); // ma_chung_tu -> { da_thu: 0, da_chi: 0 }
      for (const r of activeReceipts) {
        if (!r.ma_chung_tu) continue;
        const cur = receiptsMap.get(r.ma_chung_tu) || { da_thu: 0, da_chi: 0 };
        if (r.loai_phieu === LOAI_PHIEU.THU) {
          cur.da_thu += r.so_tien || 0;
        } else {
          cur.da_chi += r.so_tien || 0;
        }
        receiptsMap.set(r.ma_chung_tu, cur);
      }

      let tong_phai_thu = 0;
      let tong_da_thu = 0;
      let tong_con_phai_thu = 0;

      const cong_no_khach_hang = salesOrders.map((order) => {
        const tong_tien = Number(order.tong_tien) || 0;
        const rec = receiptsMap.get(order.ma_dh) || { da_thu: 0, da_chi: 0 };
        // Nếu order đã có trạng thái 'paid' trong don_hang nhưng chưa có phiếu thu trong so_quy, mặc định coi như đã thanh toán
        let da_thanh_toan = rec.da_thu;
        if (order.trang_thai === "paid" && da_thanh_toan === 0) {
          da_thanh_toan = tong_tien;
        }
        const con_lai = Math.max(0, tong_tien - da_thanh_toan);

        tong_phai_thu += tong_tien;
        tong_da_thu += da_thanh_toan;
        tong_con_phai_thu += con_lai;

        let trang_thai_cong_no = "chua_thanh_toan";
        if (con_lai === 0) trang_thai_cong_no = "da_thanh_toan";
        else if (da_thanh_toan > 0) trang_thai_cong_no = "thanh_toan_mot_phan";

        return {
          ma_dh: order.ma_dh,
          khach_hang: order.khach_hang?.ten || order.khach_hang_ten || "Khách vãng lai",
          so_dien_thoai: order.khach_hang?.so_dien_thoai || "",
          ngay_dat: order.ngay_dat || order.createAt,
          tong_tien,
          da_thanh_toan,
          con_lai,
          trang_thai_cong_no,
          trang_thai_don: order.trang_thai,
        };
      });

      let tong_phai_tra = 0;
      let tong_da_tra = 0;
      let tong_con_phai_tra = 0;

      const cong_no_nha_cung_cap = purchaseOrders.map((order) => {
        const tong_tien = Number(order.tong_tien) || 0;
        const rec = receiptsMap.get(order.ma_dh) || { da_thu: 0, da_chi: 0 };
        let da_chi = rec.da_chi;
        if (order.trang_thai === "paid" && da_chi === 0) {
          da_chi = tong_tien;
        }
        const con_lai = Math.max(0, tong_tien - da_chi);

        tong_phai_tra += tong_tien;
        tong_da_tra += da_chi;
        tong_con_phai_tra += con_lai;

        let trang_thai_cong_no = "chua_thanh_toan";
        if (con_lai === 0) trang_thai_cong_no = "da_thanh_toan";
        else if (da_chi > 0) trang_thai_cong_no = "thanh_toan_mot_phan";

        return {
          ma_dh: order.ma_dh,
          nha_cung_cap: order.nha_cung_cap?.ten || "Nhà cung cấp tổng hợp",
          ngay_dat: order.ngay_dat || order.createAt,
          tong_tien,
          da_chi,
          con_lai,
          trang_thai_cong_no,
          trang_thai_don: order.trang_thai,
        };
      });

      return {
        ok: true,
        khach_hang: {
          items: cong_no_khach_hang,
          tong_phai_thu,
          tong_da_thu,
          tong_con_phai_thu,
        },
        nha_cung_cap: {
          items: cong_no_nha_cung_cap,
          tong_phai_tra,
          tong_da_tra,
          tong_con_phai_tra,
        },
      };
    } catch (e) {
      logger.error("SoQuyDAO.layDanhSachCongNo error", { error: e.message });
      return { error: e };
    }
  }

  static async huyPhieu(id, { ly_do = "", user = {} } = {}) {
    try {
      let filter;
      try {
        filter = { _id: new ObjectId(String(id)) };
      } catch {
        filter = { ma_phieu: String(id) };
      }

      const res = await soQuyCol.updateOne(filter, {
        $set: {
          trang_thai: STATUS.CANCELLED,
          ly_do_huy: (ly_do || "").trim(),
          cancelled_by: {
            user_id: user._id || user.id ? String(user._id || user.id) : null,
            ho_ten: user.ho_ten || user.tai_khoan || "Hệ thống",
          },
          updated_at: new Date(),
        },
      });

      return { ok: true, modifiedCount: res.modifiedCount };
    } catch (e) {
      logger.error("SoQuyDAO.huyPhieu error", { error: e.message });
      return { error: e };
    }
  }

  static async getById(id) {
    try {
      let filter;
      try {
        filter = { _id: new ObjectId(String(id)) };
      } catch {
        filter = { ma_phieu: String(id) };
      }
      const doc = await soQuyCol.findOne(filter);
      return doc;
    } catch (e) {
      logger.error("SoQuyDAO.getById error", { error: e.message });
      return null;
    }
  }
}
