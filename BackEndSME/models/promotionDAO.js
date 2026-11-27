/**
 * PromotionDAO — Quản lý chiến dịch Khuyến mãi/Voucher động & Sổ điểm Loyalty khách hàng.
 */

import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";
import { escapeSafeRegexPattern } from "../utils/securityHelpers.js";
import SystemSettingsDAO from "./systemSettingsDAO.js";
import {
  DEFAULT_PROMOTIONS,
  evaluatePromotion,
  calculateLoyaltyEarn,
  calculateLoyaltyRedeem,
  determineLoyaltyTier,
} from "../utils/promotionEngine.js";

let promotionsCol = null;
let loyaltyCol = null;
let doiTacCol = null;

export default class PromotionDAO {
  static async injectDB(conn) {
    if (promotionsCol) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
    if (!dbName) throw new Error("PromotionDAO.injectDB: missing SME_DB_NAME env var");
    const db = conn.db(dbName);
    promotionsCol = db.collection("promotions");
    loyaltyCol = db.collection("loyalty_ledger");
    doiTacCol = db.collection("doi_tac");

    try {
      await promotionsCol.createIndex({ code: 1 }, { unique: true });
      await promotionsCol.createIndex({ is_active: 1, end_date: 1 });
      await loyaltyCol.createIndex({ partner_id: 1, created_at: -1 });
      await loyaltyCol.createIndex({ phone: 1, created_at: -1 });

      // Tự động seed 4 mã khuyến mãi mặc định nếu collection rỗng (đảm bảo tương thích ngược)
      const count = await promotionsCol.countDocuments();
      if (count === 0) {
        const now = new Date();
        await promotionsCol.insertMany(
          DEFAULT_PROMOTIONS.map((p) => ({
            ...p,
            used_count: 0,
            customer_usage: {},
            trang_thai: "active",
            created_at: now,
            updated_at: now,
          }))
        );
      }
    } catch (err) {
      logger.warn("PromotionDAO init warning", { error: err.message });
    }
  }

  static async list({ q = "", activeOnly = false, page = 1, limit = 50 } = {}) {
    try {
      const filter = { trang_thai: { $ne: "deleted" } };
      if (activeOnly) filter.is_active = true;
      if (q && String(q).trim()) {
        const rx = new RegExp(escapeSafeRegexPattern(String(q).trim()), "i");
        filter.$or = [{ code: rx }, { name: rx }, { description: rx }];
      }

      const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
      const [items, total] = await Promise.all([
        promotionsCol.find(filter).sort({ created_at: -1 }).skip(skip).limit(Number(limit)).toArray(),
        promotionsCol.countDocuments(filter),
      ]);

      return { items, total, page: Number(page), limit: Number(limit) };
    } catch (err) {
      logger.error("PromotionDAO.list error", { error: err.message });
      return { error: err };
    }
  }

  static async getByCode(code) {
    if (!code || !promotionsCol) return null;
    return await promotionsCol.findOne({
      code: String(code).trim().toUpperCase(),
      trang_thai: { $ne: "deleted" },
    });
  }

  static async create(payload = {}, user = null) {
    try {
      const code = String(payload.code || "").trim().toUpperCase();
      if (!code) return { error: new Error("Thiếu mã khuyến mãi (code)") };
      const name = String(payload.name || "").trim() || `Khuyến mãi ${code}`;
      const type = ["percent", "fixed", "freeship"].includes(payload.type) ? payload.type : "fixed";
      const value = Math.max(0, Number(payload.value || 0));
      if (value <= 0) return { error: new Error("Giá trị khuyến mãi phải lớn hơn 0") };

      const existing = await promotionsCol.findOne({ code });
      if (existing && existing.trang_thai !== "deleted") {
        return { error: new Error(`Mã khuyến mãi "${code}" đã tồn tại`) };
      }

      const now = new Date();
      const doc = {
        code,
        name,
        type,
        value,
        max_discount: Math.max(0, Number(payload.max_discount || 0)),
        min_order_amount: Math.max(0, Number(payload.min_order_amount || 0)),
        max_usage: Math.max(0, Number(payload.max_usage || 0)),
        per_customer_limit: Math.max(0, Number(payload.per_customer_limit || 0)),
        customer_groups: Array.isArray(payload.customer_groups) ? payload.customer_groups : [],
        start_date: payload.start_date ? new Date(payload.start_date) : null,
        end_date: payload.end_date ? new Date(payload.end_date) : null,
        is_active: payload.is_active !== false,
        description: String(payload.description || "").trim(),
        used_count: 0,
        customer_usage: {},
        trang_thai: "active",
        created_by: user ? { user_id: String(user._id || ""), ho_ten: user.ho_ten || user.tai_khoan } : null,
        created_at: now,
        updated_at: now,
      };

      const res = await promotionsCol.insertOne(doc);
      return { ok: true, doc: { ...doc, _id: res.insertedId } };
    } catch (err) {
      logger.error("PromotionDAO.create error", { error: err.message });
      return { error: err };
    }
  }

  static async update(id, patch = {}) {
    try {
      if (!ObjectId.isValid(id)) return { error: new Error("ID khuyến mãi không hợp lệ") };
      const updateFields = { updated_at: new Date() };
      const allowed = [
        "name",
        "type",
        "value",
        "max_discount",
        "min_order_amount",
        "max_usage",
        "per_customer_limit",
        "customer_groups",
        "is_active",
        "description",
      ];
      for (const k of allowed) {
        if (patch[k] !== undefined) updateFields[k] = patch[k];
      }
      if (patch.start_date !== undefined) updateFields.start_date = patch.start_date ? new Date(patch.start_date) : null;
      if (patch.end_date !== undefined) updateFields.end_date = patch.end_date ? new Date(patch.end_date) : null;

      const res = await promotionsCol.findOneAndUpdate(
        { _id: new ObjectId(id), trang_thai: { $ne: "deleted" } },
        { $set: updateFields },
        { returnDocument: "after" }
      );
      if (!res) return { error: new Error("Không tìm thấy chương trình khuyến mãi") };
      return { ok: true, doc: res };
    } catch (err) {
      logger.error("PromotionDAO.update error", { error: err.message });
      return { error: err };
    }
  }

  static async remove(id) {
    try {
      if (!ObjectId.isValid(id)) return { error: new Error("ID khuyến mãi không hợp lệ") };
      const res = await promotionsCol.updateOne(
        { _id: new ObjectId(id) },
        { $set: { trang_thai: "deleted", is_active: false, updated_at: new Date() } }
      );
      if (!res.matchedCount) return { error: new Error("Không tìm thấy chương trình khuyến mãi") };
      return { ok: true };
    } catch (err) {
      logger.error("PromotionDAO.remove error", { error: err.message });
      return { error: err };
    }
  }

  /**
   * Kiểm tra mã khuyến mãi (đọc từ DB, fallback sang DEFAULT_PROMOTIONS nếu DB chưa sẵn sàng).
   */
  static async validateCode({ code = "", orderAmount = 0, customerGroup = "", customerKey = "" } = {}) {
    const cleanCode = String(code || "").trim().toUpperCase();
    if (!cleanCode) {
      return { valid: false, code: "INVALID_COUPON", message: "Vui lòng nhập mã khuyến mãi", discountAmount: 0 };
    }

    let promo = promotionsCol ? await this.getByCode(cleanCode) : null;
    if (!promo && !promotionsCol) {
      promo = DEFAULT_PROMOTIONS.find((p) => p.code === cleanCode) || null;
    }

    const usedByCustomer =
      promo && customerKey && promo.customer_usage ? Number(promo.customer_usage[customerKey] || 0) : 0;

    return evaluatePromotion(promo, {
      orderAmount,
      customerGroup,
      customerUsedCount: usedByCustomer,
    });
  }

  /**
   * Ghi nhận 1 lượt sử dụng mã khuyến mãi sau khi đơn hàng được tạo thành công.
   */
  static async recordUsage(code, customerKey = "") {
    if (!code || !promotionsCol) return;
    try {
      const cleanCode = String(code).trim().toUpperCase();
      const incObj = { used_count: 1 };
      if (customerKey) {
        const safeKey = String(customerKey).replace(/\./g, "_");
        incObj[`customer_usage.${safeKey}`] = 1;
      }
      await promotionsCol.updateOne({ code: cleanCode }, { $inc: incObj, $set: { updated_at: new Date() } });
    } catch (err) {
      logger.warn("PromotionDAO.recordUsage warning", { error: err.message });
    }
  }

  /* ═══════════════════════ LOYALTY POINTS ═══════════════════════ */

  static async getCustomerLoyalty({ partnerId = null, phone = "" } = {}) {
    if (!doiTacCol) return { points: 0, lifetime_points: 0, tier: determineLoyaltyTier(0), history: [] };
    try {
      const query = { trang_thai: { $ne: "inactive" } };
      if (partnerId && ObjectId.isValid(partnerId)) {
        query._id = new ObjectId(partnerId);
      } else if (phone && String(phone).trim()) {
        query.so_dien_thoai = String(phone).trim();
      } else {
        return { points: 0, lifetime_points: 0, tier: determineLoyaltyTier(0), history: [] };
      }

      const partner = await doiTacCol.findOne(query);
      if (!partner) {
        return { points: 0, lifetime_points: 0, tier: determineLoyaltyTier(0), history: [] };
      }

      const settings = await SystemSettingsDAO.getSettings();
      const points = Math.max(0, Number(partner.loyalty_points || 0));
      const lifetime = Math.max(points, Number(partner.lifetime_points || 0));
      const tier = determineLoyaltyTier(lifetime, settings.loyalty);

      const history = loyaltyCol
        ? await loyaltyCol
            .find({
              $or: [
                { partner_id: partner._id },
                ...(partner.so_dien_thoai ? [{ phone: partner.so_dien_thoai }] : []),
              ],
            })
            .sort({ created_at: -1 })
            .limit(30)
            .toArray()
        : [];

      return {
        partner_id: partner._id,
        partner_name: partner.ten,
        phone: partner.so_dien_thoai,
        points,
        lifetime_points: lifetime,
        tier,
        config: settings.loyalty,
        history,
      };
    } catch (err) {
      logger.error("PromotionDAO.getCustomerLoyalty error", { error: err.message });
      return { points: 0, lifetime_points: 0, tier: determineLoyaltyTier(0), history: [] };
    }
  }

  static async earnPoints({ phone = "", partnerId = null, orderAmount = 0, orderCode = "", user = null } = {}) {
    if (!doiTacCol || !loyaltyCol) return { earned: 0 };
    try {
      const settings = await SystemSettingsDAO.getSettings();
      const earned = calculateLoyaltyEarn(orderAmount, settings.loyalty);
      if (earned <= 0) return { earned: 0 };

      const filter =
        partnerId && ObjectId.isValid(partnerId)
          ? { _id: new ObjectId(partnerId) }
          : phone && String(phone).trim()
            ? { so_dien_thoai: String(phone).trim() }
            : null;
      if (!filter) return { earned: 0 };

      const partner = await doiTacCol.findOne(filter);
      if (!partner) return { earned: 0 };

      const nextPoints = Math.max(0, Number(partner.loyalty_points || 0)) + earned;
      const nextLifetime = Math.max(0, Number(partner.lifetime_points || 0)) + earned;
      const tier = determineLoyaltyTier(nextLifetime, settings.loyalty);

      await doiTacCol.updateOne(
        { _id: partner._id },
        {
          $set: {
            loyalty_points: nextPoints,
            lifetime_points: nextLifetime,
            loyalty_tier: tier.code,
            updated_at: new Date(),
          },
        }
      );

      await loyaltyCol.insertOne({
        partner_id: partner._id,
        partner_name: partner.ten,
        phone: partner.so_dien_thoai || "",
        type: "earn",
        points_delta: earned,
        balance_after: nextPoints,
        order_code: orderCode || "",
        order_amount: Number(orderAmount) || 0,
        note: `Tích điểm từ đơn ${orderCode || "POS"}`,
        created_by: user ? user.ho_ten || user.tai_khoan : "Hệ thống",
        created_at: new Date(),
      });

      return { earned, balance: nextPoints, tier };
    } catch (err) {
      logger.warn("PromotionDAO.earnPoints warning", { error: err.message });
      return { earned: 0 };
    }
  }

  static async redeemPoints({ phone = "", partnerId = null, pointsToRedeem = 0, orderAmount = 0, orderCode = "", user = null } = {}) {
    if (!doiTacCol || !loyaltyCol || !pointsToRedeem) {
      return { valid: true, pointsUsed: 0, discountAmount: 0 };
    }
    try {
      const settings = await SystemSettingsDAO.getSettings();
      const filter =
        partnerId && ObjectId.isValid(partnerId)
          ? { _id: new ObjectId(partnerId) }
          : phone && String(phone).trim()
            ? { so_dien_thoai: String(phone).trim() }
            : null;
      if (!filter) return { valid: false, pointsUsed: 0, discountAmount: 0, message: "Không tìm thấy khách hàng để đổi điểm" };

      const partner = await doiTacCol.findOne(filter);
      if (!partner) return { valid: false, pointsUsed: 0, discountAmount: 0, message: "Không tìm thấy hồ sơ khách hàng" };

      const avail = Math.max(0, Number(partner.loyalty_points || 0));
      const calc = calculateLoyaltyRedeem(pointsToRedeem, avail, orderAmount, settings.loyalty);
      if (!calc.valid || calc.pointsUsed <= 0) return calc;

      const nextPoints = Math.max(0, avail - calc.pointsUsed);
      await doiTacCol.updateOne(
        { _id: partner._id },
        { $set: { loyalty_points: nextPoints, updated_at: new Date() } }
      );

      await loyaltyCol.insertOne({
        partner_id: partner._id,
        partner_name: partner.ten,
        phone: partner.so_dien_thoai || "",
        type: "redeem",
        points_delta: -calc.pointsUsed,
        balance_after: nextPoints,
        order_code: orderCode || "",
        order_amount: Number(orderAmount) || 0,
        discount_amount: calc.discountAmount,
        note: `Quy đổi ${calc.pointsUsed} điểm cho đơn ${orderCode || "POS"}`,
        created_by: user ? user.ho_ten || user.tai_khoan : "Hệ thống",
        created_at: new Date(),
      });

      return { ...calc, balance: nextPoints };
    } catch (err) {
      logger.error("PromotionDAO.redeemPoints error", { error: err.message });
      return { valid: false, pointsUsed: 0, discountAmount: 0, message: err.message };
    }
  }

  static async listLoyaltyMembers({ q = "", limit = 50 } = {}) {
    if (!doiTacCol) return [];
    try {
      const filter = { loai_doi_tac: { $in: ["khach_hang", "ca_hai"] }, trang_thai: { $ne: "inactive" } };
      if (q && String(q).trim()) {
        const rx = new RegExp(escapeSafeRegexPattern(String(q).trim()), "i");
        filter.$or = [{ ten: rx }, { so_dien_thoai: rx }, { ma_doi_tac: rx }];
      }
      const settings = await SystemSettingsDAO.getSettings();
      const list = await doiTacCol
        .find(filter)
        .sort({ lifetime_points: -1, loyalty_points: -1 })
        .limit(Number(limit) || 50)
        .toArray();

      return list.map((p) => {
        const lifetime = Math.max(Number(p.lifetime_points || 0), Number(p.loyalty_points || 0));
        return {
          _id: p._id,
          ma_doi_tac: p.ma_doi_tac,
          ten: p.ten,
          so_dien_thoai: p.so_dien_thoai,
          nhom: p.nhom,
          loyalty_points: Number(p.loyalty_points || 0),
          lifetime_points: lifetime,
          tier: determineLoyaltyTier(lifetime, settings.loyalty),
        };
      });
    } catch (err) {
      logger.error("PromotionDAO.listLoyaltyMembers error", { error: err.message });
      return [];
    }
  }
}
