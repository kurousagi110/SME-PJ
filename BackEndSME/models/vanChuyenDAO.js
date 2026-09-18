import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";

export const TRANG_THAI_VAN_CHUYEN = {
  CHO_DONG_GOI: "cho_dong_goi",
  DA_BAN_GIAO: "da_ban_giao",
  DANG_GIAO: "dang_giao",
  GIAO_THANH_CONG: "giao_thanh_cong",
  CHUYEN_HOAN: "chuyen_hoan",
};

export const DON_VI_VAN_CHUYEN = {
  GHN: "GHN", // Giao Hàng Nhanh
  GHTK: "GHTK", // Giao Hàng Tiết Kiệm
  VIETTEL_POST: "ViettelPost",
  JT: "J&T Express",
  NOI_BO: "Đội xe nội bộ",
};

let vanChuyenCol = null;
let donHangCol = null;

function genWaybillCode(dv = "GHN") {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const prefix = dv === "GHTK" ? "GHTK" : dv === "ViettelPost" ? "VTP" : dv === "J&T Express" ? "JT" : "GHN";
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${ymd}-${rand}`;
}

export default class VanChuyenDAO {
  static async injectDB(conn) {
    if (vanChuyenCol) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME || "SME_db_mongo";
    const db = conn.db(dbName);
    vanChuyenCol = db.collection("van_chuyen");
    donHangCol = db.collection("don_hang");

    try {
      await vanChuyenCol.createIndex({ ma_van_don: 1 }, { unique: true });
      await vanChuyenCol.createIndex({ ma_don_hang: 1 });
      await vanChuyenCol.createIndex({ trang_thai: 1, ngay_tao: -1 });
      await vanChuyenCol.createIndex({ don_vi_van_chuyen: 1 });
    } catch (err) {
      logger.error("Error creating indexes for van_chuyen", { error: err.message });
    }
  }

  static async layTongQuan() {
    try {
      const shipments = await vanChuyenCol.find({}).toArray();

      const tong_so = shipments.length;
      const cho_dong_goi = shipments.filter((s) => s.trang_thai === TRANG_THAI_VAN_CHUYEN.CHO_DONG_GOI).length;
      const da_ban_giao = shipments.filter((s) => s.trang_thai === TRANG_THAI_VAN_CHUYEN.DA_BAN_GIAO).length;
      const dang_giao = shipments.filter((s) => s.trang_thai === TRANG_THAI_VAN_CHUYEN.DANG_GIAO).length;
      const giao_thanh_cong = shipments.filter((s) => s.trang_thai === TRANG_THAI_VAN_CHUYEN.GIAO_THANH_CONG).length;
      const chuyen_hoan = shipments.filter((s) => s.trang_thai === TRANG_THAI_VAN_CHUYEN.CHUYEN_HOAN).length;

      const tong_tien_cod = shipments
        .filter((s) => s.trang_thai === TRANG_THAI_VAN_CHUYEN.DANG_GIAO || s.trang_thai === TRANG_THAI_VAN_CHUYEN.DA_BAN_GIAO)
        .reduce((sum, s) => sum + (Number(s.tien_thu_ho_cod) || 0), 0);

      const cod_da_thu = shipments
        .filter((s) => s.trang_thai === TRANG_THAI_VAN_CHUYEN.GIAO_THANH_CONG)
        .reduce((sum, s) => sum + (Number(s.tien_thu_ho_cod) || 0), 0);

      const completed = giao_thanh_cong + chuyen_hoan;
      const ty_le_thanh_cong = completed > 0 ? Number(((giao_thanh_cong / completed) * 100).toFixed(1)) : 100;

      return {
        tong_so,
        cho_dong_goi,
        da_ban_giao,
        dang_giao,
        giao_thanh_cong,
        chuyen_hoan,
        tong_tien_cod,
        cod_da_thu,
        ty_le_thanh_cong,
      };
    } catch (err) {
      logger.error("VanChuyenDAO.layTongQuan error", { error: err.message });
      return { error: err };
    }
  }

  static async layDanhSach({ trang_thai, don_vi, search, page = 1, limit = 20 }) {
    try {
      const filter = {};
      if (trang_thai && trang_thai !== "all") {
        filter.trang_thai = trang_thai;
      }
      if (don_vi && don_vi !== "all") {
        filter.don_vi_van_chuyen = don_vi;
      }
      if (search) {
        filter.$or = [
          { ma_van_don: { $regex: search, $options: "i" } },
          { ma_don_hang: { $regex: search, $options: "i" } },
          { "nguoi_nhan.ten": { $regex: search, $options: "i" } },
          { "nguoi_nhan.sdt": { $regex: search, $options: "i" } },
        ];
      }

      const p = Math.max(1, Number(page));
      const l = Math.max(1, Number(limit));
      const skip = (p - 1) * l;

      const [data, total] = await Promise.all([
        vanChuyenCol.find(filter).sort({ ngay_tao: -1 }).skip(skip).limit(l).toArray(),
        vanChuyenCol.countDocuments(filter),
      ]);

      return {
        data,
        pagination: {
          page: p,
          limit: l,
          total,
          totalPages: Math.ceil(total / l),
        },
      };
    } catch (err) {
      logger.error("VanChuyenDAO.layDanhSach error", { error: err.message });
      return { error: err };
    }
  }

  static async layChiTiet(id) {
    try {
      let query = {};
      if (ObjectId.isValid(id)) {
        query = { _id: new ObjectId(id) };
      } else {
        query = { ma_van_don: id };
      }
      const item = await vanChuyenCol.findOne(query);
      return item;
    } catch (err) {
      return null;
    }
  }

  static async taoVanDon({
    ma_don_hang,
    don_vi_van_chuyen = "GHN",
    nguoi_nhan = {},
    dia_chi_giao = "",
    sdt_nhan = "",
    tien_thu_ho_cod = 0,
    phi_van_chuyen = 30000,
    nguoi_tra_phi = "khach",
    trong_luong_gram = 1500,
    san_pham = [],
    ghi_chu = "Cho xem hàng, không thử",
    user = {},
  }) {
    try {
      const ma_van_don = genWaybillCode(don_vi_van_chuyen);
      const now = new Date();

      const doc = {
        ma_van_don,
        ma_don_hang,
        don_vi_van_chuyen,
        nguoi_gui: {
          ten: "Công Ty Cổ Phần Nội Thất & Thiết Bị SME",
          sdt: "1900 6868",
          dia_chi: "Kho Tổng A1, KCN Tân Bình, TP. Hồ Chí Minh",
        },
        nguoi_nhan: {
          ten: nguoi_nhan.ten || "Khách Hàng",
          sdt: sdt_nhan || nguoi_nhan.sdt || "",
          dia_chi: dia_chi_giao || nguoi_nhan.dia_chi || "",
        },
        tien_thu_ho_cod: Number(tien_thu_ho_cod) || 0,
        phi_van_chuyen: Number(phi_van_chuyen) || 0,
        nguoi_tra_phi, // "shop" | "khach"
        trong_luong_gram: Number(trong_luong_gram) || 1000,
        san_pham: Array.isArray(san_pham) ? san_pham : [],
        ghi_chu,
        trang_thai: TRANG_THAI_VAN_CHUYEN.CHO_DONG_GOI,
        lich_su_trang_thai: [
          {
            trang_thai: TRANG_THAI_VAN_CHUYEN.CHO_DONG_GOI,
            thoi_gian: now,
            ghi_chu: "Đã tạo phiếu vận đơn, chờ đóng gói kiện hàng",
            nguoi_thuc_hien: user.tai_khoan || "system",
          },
        ],
        ngay_tao: now,
        ngay_cap_nhat: now,
      };

      const result = await vanChuyenCol.insertOne(doc);
      return { success: true, id: result.insertedId, ma_van_don, doc };
    } catch (err) {
      logger.error("VanChuyenDAO.taoVanDon error", { error: err.message });
      return { error: err };
    }
  }

  static async capNhatTrangThai(id, { trang_thai, ghi_chu = "", vi_tri = "", user = {} }) {
    try {
      let query = {};
      if (ObjectId.isValid(id)) query = { _id: new ObjectId(id) };
      else query = { ma_van_don: id };

      const existing = await vanChuyenCol.findOne(query);
      if (!existing) return { error: new Error("Không tìm thấy vận đơn") };

      const now = new Date();
      const historyItem = {
        trang_thai,
        thoi_gian: now,
        ghi_chu: ghi_chu || `Cập nhật trạng thái thành ${trang_thai}`,
        vi_tri: vi_tri || "Trung tâm khai thác logistics",
        nguoi_thuc_hien: user.tai_khoan || "system",
      };

      const updateData = {
        trang_thai,
        ngay_cap_nhat: now,
      };

      if (trang_thai === TRANG_THAI_VAN_CHUYEN.GIAO_THANH_CONG) {
        updateData.ngay_giao_thanh_cong = now;
      }

      await vanChuyenCol.updateOne(query, {
        $set: updateData,
        $push: { lich_su_trang_thai: historyItem },
      });

      return { success: true };
    } catch (err) {
      logger.error("VanChuyenDAO.capNhatTrangThai error", { error: err.message });
      return { error: err };
    }
  }
}
