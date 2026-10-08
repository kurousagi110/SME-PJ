import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";
import { escapeRegex } from "../utils/escapeRegex.js";

let batchCol = null;

export default class BatchDAO {
  static async injectDB(conn) {
    if (batchCol) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME || "SME_db_mongo";
    const db = conn.db(dbName);
    batchCol = db.collection("lo_san_xuat");

    try {
      await batchCol.createIndex({ so_lo: 1 }, { unique: true });
      await batchCol.createIndex({ item_id: 1, han_su_dung: 1 });
      await batchCol.createIndex({ trang_thai: 1, han_su_dung: 1 });
    } catch (err) {
      logger.error("Error creating indexes in lo_san_xuat", { error: err.message });
    }
  }

  /**
   * Tạo số lô mới cho sản phẩm / nguyên liệu
   */
  static async taoLo({
    so_lo,
    item_type = "san_pham", // "san_pham" | "nguyen_lieu"
    item_id,
    ma_hang,
    ten_hang,
    so_luong_nhap,
    ngay_san_xuat,
    han_su_dung,
    nha_san_xuat = "",
    ghi_chu = "",
    user = {},
  }) {
    try {
      const now = new Date();
      const code = (so_lo || `LOT-${Date.now().toString(36).toUpperCase()}`).trim();

      const doc = {
        so_lo: code,
        item_type,
        item_id: item_id ? new ObjectId(String(item_id)) : null,
        ma_hang,
        ten_hang,
        so_luong_nhap: Number(so_luong_nhap) || 0,
        so_luong_ton: Number(so_luong_nhap) || 0, // số lượng còn lại trong lô
        ngay_san_xuat: ngay_san_xuat ? new Date(ngay_san_xuat) : now,
        han_su_dung: han_su_dung ? new Date(han_su_dung) : null,
        nha_san_xuat,
        ghi_chu,
        trang_thai: "active", // "active" | "expired" | "depleted"
        created_by: {
          id: user._id || user.id,
          username: user.username,
          ho_ten: user.ho_ten,
        },
        created_at: now,
        updated_at: now,
      };

      const result = await batchCol.insertOne(doc);
      return { success: true, data: { ...doc, _id: result.insertedId } };
    } catch (err) {
      logger.error("[BatchDAO.taoLo] Error", { error: err.message });
      return { error: err };
    }
  }

  /**
   * Danh sách lô theo mặt hàng kèm cảnh báo cận date
   */
  static async listBatches({
    item_id,
    item_type,
    search,
    can_date_days, // Số ngày cảnh báo cận hạn (vd: 30 ngày)
    page = 1,
    limit = 20,
  } = {}) {
    try {
      const query = {};
      if (item_id && ObjectId.isValid(item_id)) query.item_id = new ObjectId(item_id);
      if (item_type) query.item_type = item_type;

      if (search && search.trim()) {
        const safeSearch = escapeRegex(search.trim());
        query.$or = [
          { so_lo: { $regex: safeSearch, $options: "i" } },
          { ma_hang: { $regex: safeSearch, $options: "i" } },
          { ten_hang: { $regex: safeSearch, $options: "i" } },
        ];
      }


      if (can_date_days) {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() + Number(can_date_days));
        query.han_su_dung = { $lte: thresholdDate, $ne: null };
        query.so_luong_ton = { $gt: 0 };
      }

      const total = await batchCol.countDocuments(query);
      const items = await batchCol
        .find(query)
        .sort({ han_su_dung: 1, created_at: -1 }) // FEFO sort
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      return {
        items,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (err) {
      logger.error("[BatchDAO.listBatches] Error", { error: err.message });
      return { error: err };
    }
  }

  /**
   * Gợi ý xuất kho theo chiến lược FEFO (First Expired First Out)
   */
  static async suggestFEFO(item_id, requestedQty) {
    try {
      const batches = await batchCol
        .find({
          item_id: new ObjectId(String(item_id)),
          so_luong_ton: { $gt: 0 },
          trang_thai: "active",
        })
        .sort({ han_su_dung: 1, created_at: 1 })
        .toArray();

      let remaining = Number(requestedQty);
      const allocations = [];

      for (const batch of batches) {
        if (remaining <= 0) break;
        const take = Math.min(batch.so_luong_ton, remaining);
        allocations.push({
          batchId: batch._id,
          so_lo: batch.so_lo,
          han_su_dung: batch.han_su_dung,
          allocatedQty: take,
          ton_hien_tai: batch.so_luong_ton,
        });
        remaining -= take;
      }

      return {
        allocated: allocations,
        fulfilled: remaining <= 0,
        missingQty: Math.max(0, remaining),
      };
    } catch (err) {
      logger.error("[BatchDAO.suggestFEFO] Error", { error: err.message });
      return { error: err };
    }
  }
}
