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
let soQuyCol = null;

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
    soQuyCol = db.collection("so_quy");

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

      // Tự động tìm đơn bán hàng liên kết nếu có
      let linkedOrder = null;
      if (ma_don_hang && donHangCol) {
        linkedOrder = await donHangCol.findOne({
          $or: [
            { ma_dh: ma_don_hang },
            ...(ObjectId.isValid(ma_don_hang) ? [{ _id: new ObjectId(ma_don_hang) }] : []),
          ],
        });
      }

      const receiverName =
        nguoi_nhan.ten && nguoi_nhan.ten !== "Khách Hàng"
          ? nguoi_nhan.ten
          : linkedOrder?.khach_hang?.ten ||
            linkedOrder?.khach_hang_ten ||
            linkedOrder?.doi_tuong?.ten ||
            nguoi_nhan.ten ||
            "Khách Hàng";

      const receiverPhone =
        sdt_nhan ||
        nguoi_nhan.sdt ||
        linkedOrder?.khach_hang?.so_dien_thoai ||
        linkedOrder?.khach_hang_sdt ||
        linkedOrder?.doi_tuong?.so_dien_thoai ||
        "";

      const receiverAddress =
        dia_chi_giao ||
        nguoi_nhan.dia_chi ||
        linkedOrder?.khach_hang?.dia_chi ||
        linkedOrder?.dia_chi_giao_hang ||
        linkedOrder?.doi_tuong?.dia_chi ||
        "";

      const orderProducts =
        Array.isArray(san_pham) && san_pham.length > 0
          ? san_pham
          : (linkedOrder?.san_pham || []).map((sp) => ({
              ten_sp: sp.ten_sp || sp.ma_sp || "",
              so_luong: Number(sp.so_luong) || 1,
              don_vi: sp.don_vi || "cái",
              don_gia: Number(sp.don_gia) || 0,
            }));

      let codAmount = Number(tien_thu_ho_cod) || 0;
      if (!codAmount && linkedOrder) {
        const isPaid =
          linkedOrder.thanh_toan?.status === "paid" ||
          linkedOrder.trang_thai === "paid";
        if (!isPaid && linkedOrder.tong_tien) {
          codAmount = Number(linkedOrder.tong_tien) || 0;
        }
      }

      const doc = {
        ma_van_don,
        ma_don_hang: linkedOrder?.ma_dh || ma_don_hang,
        don_vi_van_chuyen,
        nguoi_gui: {
          ten: "Công Ty Cổ Phần Nội Thất & Thiết Bị SME",
          sdt: "1900 6868",
          dia_chi: "Kho Tổng A1, KCN Tân Bình, TP. Hồ Chí Minh",
        },
        nguoi_nhan: {
          ten: receiverName,
          sdt: receiverPhone,
          dia_chi: receiverAddress,
        },
        tien_thu_ho_cod: codAmount,
        phi_van_chuyen: Number(phi_van_chuyen) || 0,
        nguoi_tra_phi, // "shop" | "khach"
        trong_luong_gram: Number(trong_luong_gram) || 1000,
        san_pham: orderProducts,
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

      // Cập nhật ngược lại vào đơn hàng bán
      if (linkedOrder) {
        await donHangCol.updateOne(
          { _id: linkedOrder._id },
          {
            $set: {
              ma_van_don,
              don_vi_van_chuyen,
              trang_thai_van_chuyen: TRANG_THAI_VAN_CHUYEN.CHO_DONG_GOI,
              updated_at: now,
            },
          }
        );
      }

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

      // Cập nhật trạng thái vận chuyển trên đơn hàng + tự động chốt đơn bán & thu COD
      if (existing.ma_don_hang && donHangCol) {
        const isDelivered = trang_thai === TRANG_THAI_VAN_CHUYEN.GIAO_THANH_CONG;
        const orderUpdate = {
          trang_thai_van_chuyen: trang_thai,
          updated_at: now,
        };

        if (isDelivered) {
          orderUpdate.trang_thai = "completed";
          orderUpdate["thanh_toan.status"] = "paid";
          orderUpdate["thanh_toan.phuong_thuc"] = "cod";
          orderUpdate["thanh_toan.ngay_thanh_toan"] = now;
        }

        await donHangCol.updateOne(
          {
            $or: [
              { ma_dh: existing.ma_don_hang },
              ...(ObjectId.isValid(existing.ma_don_hang) ? [{ _id: new ObjectId(existing.ma_don_hang) }] : []),
            ],
          },
          { $set: orderUpdate }
        );

        // Tự động sinh Phiếu Thu tiền COD vào Sổ Quỹ (nếu có thu hộ COD và chưa có phiếu)
        if (isDelivered && Number(existing.tien_thu_ho_cod) > 0 && soQuyCol) {
          try {
            const existingReceipt = await soQuyCol.findOne({
              ma_chung_tu: existing.ma_don_hang,
              hang_muc: { $in: ["thu_ho_cod", "thu_tien_ban_hang"] },
              trang_thai: "active",
            });

            if (!existingReceipt) {
              const prefix = "PT";
              const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
              const randCode = Math.random().toString(36).slice(2, 6).toUpperCase();
              const ma_phieu = `${prefix}-${ymd}-${randCode}`;

              await soQuyCol.insertOne({
                ma_phieu,
                loai_phieu: "thu",
                hang_muc: "thu_ho_cod",
                so_tien: Number(existing.tien_thu_ho_cod),
                phuong_thuc: "chuyen_khoan",
                doi_tuong: {
                  loai: "doi_tac_van_chuyen",
                  ten: existing.don_vi_van_chuyen || "Đơn vị vận chuyển",
                  so_dien_thoai: existing.nguoi_nhan?.sdt || "",
                  dia_chi: existing.nguoi_nhan?.dia_chi || "",
                },
                ma_chung_tu: existing.ma_don_hang,
                ngay_ghi_nhan: now,
                ghi_chu: `Đối soát COD vận đơn ${existing.ma_van_don} - đơn hàng ${existing.ma_don_hang}`,
                nguoi_lap: {
                  tai_khoan: user.tai_khoan || "system",
                  ten: user.ho_ten || "Hệ thống tự động",
                },
                trang_thai: "active",
                created_at: now,
                updated_at: now,
              });
              logger.info(`[VanChuyenDAO] Tự động tạo Phiếu Thu COD ${ma_phieu} cho đơn ${existing.ma_don_hang}`);
            }
          } catch (sqErr) {
            logger.warn("Auto create COD receipt in so_quy warning", { error: sqErr.message });
          }
        }
      }

      return { success: true };
    } catch (err) {
      logger.error("VanChuyenDAO.capNhatTrangThai error", { error: err.message });
      return { error: err };
    }
  }
}
