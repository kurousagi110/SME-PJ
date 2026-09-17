import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";

export const LOAI_DOI_TAC = {
  KHACH_HANG: "khach_hang",
  NHA_CUNG_CAP: "nha_cung_cap",
  CA_HAI: "ca_hai",
};

export const STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

let doiTacCol = null;
let donHangCol = null;
let soQuyCol = null;

function genPartnerCode(loai = "khach_hang") {
  const prefix = loai === LOAI_DOI_TAC.NHA_CUNG_CAP ? "NCC" : "KH";
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${rand}`;
}

export default class DoiTacDAO {
  static async injectDB(conn) {
    if (doiTacCol && donHangCol && soQuyCol) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME || "SME_db_mongo";
    const db = conn.db(dbName);
    doiTacCol = db.collection("doi_tac");
    donHangCol = db.collection("don_hang");
    soQuyCol = db.collection("so_quy");

    try {
      await doiTacCol.createIndex({ ma_doi_tac: 1 }, { unique: true });
      await doiTacCol.createIndex({ loai_doi_tac: 1, ten: 1 });
      await doiTacCol.createIndex({ so_dien_thoai: 1 });
      await doiTacCol.createIndex({ trang_thai: 1 });
    } catch (err) {
      logger.error("Error creating indexes in doi_tac", { error: err.message });
    }
  }

  static async taoDoiTac({
    ma_doi_tac,
    loai_doi_tac = LOAI_DOI_TAC.KHACH_HANG,
    ten,
    so_dien_thoai = "",
    email = "",
    dia_chi = "",
    ma_so_thue = "",
    nhom = "khach_le",
    ghi_chu = "",
    user = {},
  }) {
    try {
      const code = (ma_doi_tac || "").trim() || genPartnerCode(loai_doi_tac);
      const now = new Date();

      const doc = {
        ma_doi_tac: code,
        loai_doi_tac,
        ten: (ten || "").trim(),
        so_dien_thoai: (so_dien_thoai || "").trim(),
        email: (email || "").trim().toLowerCase(),
        dia_chi: (dia_chi || "").trim(),
        ma_so_thue: (ma_so_thue || "").trim(),
        nhom: nhom || (loai_doi_tac === LOAI_DOI_TAC.NHA_CUNG_CAP ? "chinh" : "khach_le"),
        ghi_chu: (ghi_chu || "").trim(),
        trang_thai: STATUS.ACTIVE,
        created_by: {
          user_id: user._id || user.id ? String(user._id || user.id) : null,
          ho_ten: user.ho_ten || user.tai_khoan || "Hệ thống",
        },
        created_at: now,
        updated_at: now,
      };

      const result = await doiTacCol.insertOne(doc);
      return { ok: true, insertedId: result.insertedId, doc };
    } catch (e) {
      logger.error("DoiTacDAO.taoDoiTac error", { error: e.message });
      return { error: e };
    }
  }

  static async layDanhSachDoiTac({
    loai_doi_tac,
    nhom,
    search,
    page = 1,
    limit = 50,
  } = {}) {
    try {
      const conditions = [{ trang_thai: { $ne: STATUS.INACTIVE } }];
      if (loai_doi_tac && loai_doi_tac !== "all") {
        conditions.push({ $or: [{ loai_doi_tac }, { loai_doi_tac: LOAI_DOI_TAC.CA_HAI }] });
      }
      if (nhom && nhom !== "all") {
        conditions.push({ nhom });
      }

      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), "i");
        conditions.push({
          $or: [
            { ma_doi_tac: regex },
            { ten: regex },
            { so_dien_thoai: regex },
            { email: regex },
            { dia_chi: regex },
          ],
        });
      }

      const filter = conditions.length > 1 ? { $and: conditions } : conditions[0];

      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Math.min(100, Number(limit) || 50));
      const skip = (pageNum - 1) * limitNum;

      const [partners, total] = await Promise.all([
        doiTacCol.find(filter).sort({ created_at: -1 }).skip(skip).limit(limitNum).toArray(),
        doiTacCol.countDocuments(filter),
      ]);

      // Aggregate orders and payments for each partner
      const items = await Promise.all(
        partners.map(async (p) => {
          const isCustomer = p.loai_doi_tac === LOAI_DOI_TAC.KHACH_HANG || p.loai_doi_tac === LOAI_DOI_TAC.CA_HAI;
          const orderFilter = isCustomer
            ? {
                loai_don: "sale",
                $or: [{ khach_hang_ten: p.ten }, { "khach_hang.ten": p.ten }],
                trang_thai: { $nin: ["draft", "cancelled", "deleted"] },
              }
            : {
                loai_don: "purchase_receipt",
                $or: [{ nha_cung_cap_ten: p.ten }, { "nha_cung_cap.ten": p.ten }],
                trang_thai: { $nin: ["draft", "cancelled", "deleted"] },
              };

          const orders = await donHangCol.find(orderFilter).toArray();
          const tong_don = orders.length;
          const tong_gia_tri = orders.reduce((sum, o) => sum + (Number(o.tong_tien) || 0), 0);

          // Get payments for those orders
          const orderCodes = orders.map((o) => o.ma_dh).filter(Boolean);
          let da_thanh_toan = 0;
          if (orderCodes.length > 0) {
            const receipts = await soQuyCol
              .find({ ma_chung_tu: { $in: orderCodes }, trang_thai: "active" })
              .toArray();
            da_thanh_toan = receipts.reduce((sum, r) => sum + (Number(r.so_tien) || 0), 0);
          }

          // If orders had 'paid' status directly, treat as paid
          for (const o of orders) {
            if (o.trang_thai === "paid" && da_thanh_toan === 0) {
              da_thanh_toan += Number(o.tong_tien) || 0;
            }
          }

          const cong_no = Math.max(0, tong_gia_tri - da_thanh_toan);

          return {
            ...p,
            tong_don,
            tong_gia_tri,
            da_thanh_toan,
            cong_no,
          };
        })
      );

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
      logger.error("DoiTacDAO.layDanhSachDoiTac error", { error: e.message });
      return { error: e };
    }
  }

  static async layChiTietDoiTac(id) {
    try {
      let filter;
      try {
        filter = { _id: new ObjectId(String(id)) };
      } catch {
        filter = { ma_doi_tac: String(id) };
      }

      const partner = await doiTacCol.findOne(filter);
      if (!partner) return null;

      const isCustomer = partner.loai_doi_tac === LOAI_DOI_TAC.KHACH_HANG || partner.loai_doi_tac === LOAI_DOI_TAC.CA_HAI;
      const orderFilter = isCustomer
        ? {
            loai_don: "sale",
            $or: [{ khach_hang_ten: partner.ten }, { "khach_hang.ten": partner.ten }],
            trang_thai: { $nin: ["deleted"] },
          }
        : {
            loai_don: "purchase_receipt",
            $or: [{ nha_cung_cap_ten: partner.ten }, { "nha_cung_cap.ten": partner.ten }],
            trang_thai: { $nin: ["deleted"] },
          };

      const orders = await donHangCol
        .find(orderFilter)
        .sort({ ngay_dat: -1, createAt: -1 })
        .toArray();

      const tong_don = orders.length;
      const tong_gia_tri = orders.reduce((sum, o) => sum + (Number(o.tong_tien) || 0), 0);

      const orderCodes = orders.map((o) => o.ma_dh).filter(Boolean);
      let receipts = [];
      if (orderCodes.length > 0) {
        receipts = await soQuyCol
          .find({ ma_chung_tu: { $in: orderCodes } })
          .sort({ ngay_ghi_nhan: -1 })
          .toArray();
      }

      return {
        partner,
        stats: {
          tong_don,
          tong_gia_tri,
        },
        orders,
        receipts,
      };
    } catch (e) {
      logger.error("DoiTacDAO.layChiTietDoiTac error", { error: e.message });
      return null;
    }
  }

  static async capNhatDoiTac(id, data, user = {}) {
    try {
      let filter;
      try {
        filter = { _id: new ObjectId(String(id)) };
      } catch {
        filter = { ma_doi_tac: String(id) };
      }

      const updateFields = {};
      if (data.ten !== undefined) updateFields.ten = String(data.ten).trim();
      if (data.so_dien_thoai !== undefined) updateFields.so_dien_thoai = String(data.so_dien_thoai).trim();
      if (data.email !== undefined) updateFields.email = String(data.email).trim().toLowerCase();
      if (data.dia_chi !== undefined) updateFields.dia_chi = String(data.dia_chi).trim();
      if (data.ma_so_thue !== undefined) updateFields.ma_so_thue = String(data.ma_so_thue).trim();
      if (data.nhom !== undefined) updateFields.nhom = data.nhom;
      if (data.ghi_chu !== undefined) updateFields.ghi_chu = String(data.ghi_chu).trim();
      if (data.trang_thai !== undefined) updateFields.trang_thai = data.trang_thai;
      updateFields.updated_at = new Date();

      const res = await doiTacCol.updateOne(filter, { $set: updateFields });
      return { ok: true, modifiedCount: res.modifiedCount };
    } catch (e) {
      logger.error("DoiTacDAO.capNhatDoiTac error", { error: e.message });
      return { error: e };
    }
  }

  static async xoaDoiTac(id) {
    try {
      let filter;
      try {
        filter = { _id: new ObjectId(String(id)) };
      } catch {
        filter = { ma_doi_tac: String(id) };
      }

      const res = await doiTacCol.updateOne(filter, {
        $set: { trang_thai: STATUS.INACTIVE, updated_at: new Date() },
      });
      return { ok: true, modifiedCount: res.modifiedCount };
    } catch (e) {
      logger.error("DoiTacDAO.xoaDoiTac error", { error: e.message });
      return { error: e };
    }
  }

  static async layTongQuanCRM() {
    try {
      const filterActive = { trang_thai: { $ne: STATUS.INACTIVE } };

      const [totalCustomers, totalVIP, totalSuppliers, allSalesOrders] = await Promise.all([
        doiTacCol.countDocuments({
          ...filterActive,
          $or: [{ loai_doi_tac: LOAI_DOI_TAC.KHACH_HANG }, { loai_doi_tac: LOAI_DOI_TAC.CA_HAI }],
        }),
        doiTacCol.countDocuments({
          ...filterActive,
          nhom: "vip",
          $or: [{ loai_doi_tac: LOAI_DOI_TAC.KHACH_HANG }, { loai_doi_tac: LOAI_DOI_TAC.CA_HAI }],
        }),
        doiTacCol.countDocuments({
          ...filterActive,
          $or: [{ loai_doi_tac: LOAI_DOI_TAC.NHA_CUNG_CAP }, { loai_doi_tac: LOAI_DOI_TAC.CA_HAI }],
        }),
        donHangCol
          .find({ loai_don: "sale", trang_thai: { $nin: ["draft", "cancelled", "deleted"] } })
          .toArray(),
      ]);

      const tong_ltv = allSalesOrders.reduce((sum, o) => sum + (Number(o.tong_tien) || 0), 0);

      return {
        ok: true,
        tong_khach_hang: totalCustomers,
        khach_hang_vip: totalVIP,
        tong_nha_cung_cap: totalSuppliers,
        tong_doanh_so_ltv: tong_ltv,
      };
    } catch (e) {
      logger.error("DoiTacDAO.layTongQuanCRM error", { error: e.message });
      return { error: e };
    }
  }
}
