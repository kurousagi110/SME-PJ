import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";

let thongBaoCol = null;

function genNotificationCode() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TB-${ymd}-${rand}`;
}

export default class ThongBaoDAO {
  static async injectDB(conn) {
    if (thongBaoCol) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME || "SME_db_mongo";
    const db = conn.db(dbName);
    thongBaoCol = db.collection("thong_bao");

    try {
      await thongBaoCol.createIndex({ user_id: 1, da_doc: 1, created_at: -1 });
      await thongBaoCol.createIndex({ phong_ban: 1, created_at: -1 });
      await thongBaoCol.createIndex({ ma_tb: 1 }, { unique: true });
      await thongBaoCol.createIndex({ created_at: -1 });
    } catch (err) {
      logger.error("Error creating indexes for thong_bao", { error: err.message });
    }
  }

  /**
   * Tạo thông báo mới và lưu DB.
   */
  static async taoThongBao({
    user_id = null, // null nếu gửi toàn phòng ban
    phong_ban = null, // null nếu gửi đích danh user
    tieu_de,
    noi_dung,
    loai = "SYSTEM_NOTIFICATION",
    lien_ket = "",
    du_lieu = {},
    nguoi_gui = null,
  }) {
    try {
      const now = new Date();
      const ma_tb = genNotificationCode();

      const doc = {
        ma_tb,
        user_id: user_id ? String(user_id) : null,
        phong_ban: phong_ban ? String(phong_ban).toLowerCase().trim() : null,
        tieu_de: (tieu_de || "").trim(),
        noi_dung: (noi_dung || "").trim(),
        loai,
        lien_ket: lien_ket || "",
        du_lieu: du_lieu || {},
        nguoi_gui: nguoi_gui || { ho_ten: "Hệ thống", tai_khoan: "system" },
        da_doc: false,
        cac_user_da_doc: [], // dùng khi gửi cho cả phòng ban
        created_at: now,
      };

      const res = await thongBaoCol.insertOne(doc);
      return { ok: true, id: res.insertedId, doc };
    } catch (e) {
      logger.error("ThongBaoDAO.taoThongBao error", { error: e.message });
      return { error: e };
    }
  }

  /**
   * Lấy danh sách thông báo của user (bao gồm thông báo riêng và thông báo của phòng ban).
   */
  static async layDanhSach({ user_id, phong_ban, da_doc, page = 1, limit = 30 }) {
    try {
      const orConditions = [];
      if (user_id) {
        orConditions.push({ user_id: String(user_id) });
      }
      if (phong_ban) {
        const cleanDept = String(phong_ban).toLowerCase().trim();
        orConditions.push({ phong_ban: cleanDept });
      }
      // Thông báo gửi toàn công ty (không chỉ định user hay ban)
      orConditions.push({ user_id: null, phong_ban: null });

      const filter = { $or: orConditions };

      if (da_doc !== undefined && da_doc !== null) {
        const isRead = da_doc === true || da_doc === "true";
        if (isRead) {
          filter.$or = [
            { user_id: String(user_id), da_doc: true },
            { cac_user_da_doc: String(user_id) },
          ];
        } else {
          filter.da_doc = false;
          filter.cac_user_da_doc = { $ne: String(user_id) };
        }
      }

      const p = Math.max(1, Number(page) || 1);
      const l = Math.max(1, Math.min(100, Number(limit) || 30));
      const skip = (p - 1) * l;

      const [items, total] = await Promise.all([
        thongBaoCol.find(filter).sort({ created_at: -1 }).skip(skip).limit(l).toArray(),
        thongBaoCol.countDocuments(filter),
      ]);

      const formatted = items.map((it) => ({
        ...it,
        da_doc: it.user_id ? it.da_doc : (it.cac_user_da_doc || []).includes(String(user_id)),
      }));

      return {
        ok: true,
        items: formatted,
        pagination: {
          page: p,
          limit: l,
          total,
          totalPages: Math.ceil(total / l) || 1,
        },
      };
    } catch (e) {
      logger.error("ThongBaoDAO.layDanhSach error", { error: e.message });
      return { error: e };
    }
  }

  /**
   * Đếm số lượng thông báo chưa đọc.
   */
  static async demChuaDoc({ user_id, phong_ban }) {
    try {
      const orConditions = [];
      if (user_id) {
        orConditions.push({ user_id: String(user_id), da_doc: false });
      }
      if (phong_ban) {
        const cleanDept = String(phong_ban).toLowerCase().trim();
        orConditions.push({
          phong_ban: cleanDept,
          cac_user_da_doc: { $ne: String(user_id) },
        });
      }
      orConditions.push({
        user_id: null,
        phong_ban: null,
        cac_user_da_doc: { $ne: String(user_id) },
      });

      const count = await thongBaoCol.countDocuments({ $or: orConditions });
      return { ok: true, count };
    } catch (e) {
      logger.error("ThongBaoDAO.demChuaDoc error", { error: e.message });
      return { ok: true, count: 0 };
    }
  }

  /**
   * Đánh dấu 1 thông báo là đã đọc.
   */
  static async danhDauDaDoc(id, user_id) {
    try {
      let query;
      try {
        query = { _id: new ObjectId(String(id)) };
      } catch {
        query = { ma_tb: String(id) };
      }

      const tb = await thongBaoCol.findOne(query);
      if (!tb) return { ok: false, message: "Không tìm thấy thông báo" };

      if (tb.user_id) {
        await thongBaoCol.updateOne(query, { $set: { da_doc: true, read_at: new Date() } });
      } else {
        await thongBaoCol.updateOne(query, {
          $addToSet: { cac_user_da_doc: String(user_id) },
        });
      }

      return { ok: true };
    } catch (e) {
      logger.error("ThongBaoDAO.danhDauDaDoc error", { error: e.message });
      return { error: e };
    }
  }

  /**
   * Đánh dấu tất cả thông báo là đã đọc.
   */
  static async danhDauDocTatCa(user_id, phong_ban) {
    try {
      const userIdStr = String(user_id);
      const cleanDept = phong_ban ? String(phong_ban).toLowerCase().trim() : null;

      // 1. Đánh dấu các thông báo đích danh
      await thongBaoCol.updateMany(
        { user_id: userIdStr, da_doc: false },
        { $set: { da_doc: true, read_at: new Date() } }
      );

      // 2. Thêm user_id vào cac_user_da_doc cho thông báo phòng ban hoặc toàn cty
      const deptFilter = cleanDept
        ? { phong_ban: cleanDept, cac_user_da_doc: { $ne: userIdStr } }
        : { user_id: null, cac_user_da_doc: { $ne: userIdStr } };

      await thongBaoCol.updateMany(deptFilter, {
        $addToSet: { cac_user_da_doc: userIdStr },
      });

      return { ok: true };
    } catch (e) {
      logger.error("ThongBaoDAO.danhDauDocTatCa error", { error: e.message });
      return { error: e };
    }
  }
}
