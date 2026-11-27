/**
 * CrmPipelineDAO — Quản lý Phễu Cơ Hội Bán Hàng (Kanban Lead → Won/Lost) & Nhật ký Chăm sóc khách hàng.
 */

import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";
import { escapeSafeRegexPattern } from "../utils/securityHelpers.js";
import QuotationDAO from "./quotationDAO.js";
import {
  VALID_CRM_STAGE_CODES,
  getDefaultProbabilityForStage,
  computePipelineMetrics,
} from "../utils/crmProcurementEngine.js";

let oppCol = null;

function genOppCode() {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `OPP-${ymd}-${rand}`;
}

export default class CrmPipelineDAO {
  static async injectDB(conn) {
    if (oppCol) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
    if (!dbName) throw new Error("CrmPipelineDAO.injectDB: missing SME_DB_NAME env var");
    oppCol = conn.db(dbName).collection("crm_opportunities");

    try {
      await oppCol.createIndex({ ma_co_hoi: 1 }, { unique: true });
      await oppCol.createIndex({ stage: 1, updated_at: -1 });
      await oppCol.createIndex({ next_follow_up: 1 });
    } catch (err) {
      logger.warn("CrmPipelineDAO index warning", { error: err.message });
    }
  }

  static async list({ stage = "", q = "", ownerId = "" } = {}) {
    try {
      const filter = { trang_thai: { $ne: "deleted" } };
      if (stage && VALID_CRM_STAGE_CODES.includes(stage)) filter.stage = stage;
      if (ownerId) filter.owner_id = String(ownerId);
      if (q && String(q).trim()) {
        const rx = new RegExp(escapeSafeRegexPattern(String(q).trim()), "i");
        filter.$or = [{ ma_co_hoi: rx }, { title: rx }, { customer_name: rx }, { customer_phone: rx }];
      }

      const items = await oppCol.find(filter).sort({ updated_at: -1 }).limit(200).toArray();
      const metrics = computePipelineMetrics(items);
      return { items, metrics };
    } catch (err) {
      logger.error("CrmPipelineDAO.list error", { error: err.message });
      return { error: err };
    }
  }

  static async create(payload = {}, user = null) {
    try {
      const title = String(payload.title || "").trim();
      const customerName = String(payload.customer_name || "").trim();
      if (!title || !customerName) {
        return { error: new Error("Vui lòng nhập tên cơ hội bán hàng và tên khách hàng") };
      }

      const stage = VALID_CRM_STAGE_CODES.includes(payload.stage) ? payload.stage : "lead";
      const probability =
        payload.probability !== undefined && payload.probability !== null
          ? Math.min(100, Math.max(0, Number(payload.probability)))
          : getDefaultProbabilityForStage(stage);

      const now = new Date();
      const doc = {
        ma_co_hoi: genOppCode(),
        title,
        customer_name: customerName,
        customer_phone: String(payload.customer_phone || "").trim(),
        customer_email: String(payload.customer_email || "").trim(),
        source: String(payload.source || "Trực tiếp").trim(),
        stage,
        expected_value: Math.max(0, Number(payload.expected_value || 0)),
        probability,
        expected_close_date: payload.expected_close_date ? new Date(payload.expected_close_date) : null,
        next_follow_up: payload.next_follow_up ? new Date(payload.next_follow_up) : null,
        items: Array.isArray(payload.items) ? payload.items : [],
        notes: String(payload.notes || "").trim(),
        quotation_code: null,
        lost_reason: "",
        activities: [
          {
            id: `ACT-${Date.now()}`,
            type: "note",
            content: `Tạo mới cơ hội bán hàng (${stage})`,
            by: user ? user.ho_ten || user.tai_khoan : "Hệ thống",
            at: now,
          },
        ],
        owner_id: user ? String(user._id || user.id || "") : "",
        owner_name: user ? user.ho_ten || user.tai_khoan || "Sales" : "Sales",
        trang_thai: "active",
        created_at: now,
        updated_at: now,
      };

      const res = await oppCol.insertOne(doc);
      return { ok: true, doc: { ...doc, _id: res.insertedId } };
    } catch (err) {
      logger.error("CrmPipelineDAO.create error", { error: err.message });
      return { error: err };
    }
  }

  static async updateStage(id, { stage, probability, lost_reason = "", user = null }) {
    try {
      if (!ObjectId.isValid(id)) return { error: new Error("ID cơ hội không hợp lệ") };
      if (!VALID_CRM_STAGE_CODES.includes(stage)) {
        return { error: new Error(`Giai đoạn CRM "${stage}" không hợp lệ`) };
      }

      const prob =
        probability !== undefined && probability !== null
          ? Math.min(100, Math.max(0, Number(probability)))
          : getDefaultProbabilityForStage(stage);

      const now = new Date();
      const updated = await oppCol.findOneAndUpdate(
        { _id: new ObjectId(id), trang_thai: { $ne: "deleted" } },
        {
          $set: {
            stage,
            probability: prob,
            lost_reason: stage === "lost" ? String(lost_reason || "").trim() : "",
            updated_at: now,
          },
          $push: {
            activities: {
              id: `ACT-${Date.now()}`,
              type: "stage_change",
              content: `Chuyển giai đoạn sang "${stage}" (${prob}%)${lost_reason ? ` — Lý do: ${lost_reason}` : ""}`,
              by: user ? user.ho_ten || user.tai_khoan : "Hệ thống",
              at: now,
            },
          },
        },
        { returnDocument: "after" }
      );
      if (!updated) return { error: new Error("Không tìm thấy cơ hội bán hàng") };
      return { ok: true, doc: updated };
    } catch (err) {
      logger.error("CrmPipelineDAO.updateStage error", { error: err.message });
      return { error: err };
    }
  }

  static async addActivity(id, { type = "call", content = "", next_follow_up = null, user = null }) {
    try {
      if (!ObjectId.isValid(id)) return { error: new Error("ID cơ hội không hợp lệ") };
      if (!String(content || "").trim()) return { error: new Error("Vui lòng nhập nội dung chăm sóc") };

      const now = new Date();
      const setFields = { updated_at: now };
      if (next_follow_up) setFields.next_follow_up = new Date(next_follow_up);

      const updated = await oppCol.findOneAndUpdate(
        { _id: new ObjectId(id), trang_thai: { $ne: "deleted" } },
        {
          $set: setFields,
          $push: {
            activities: {
              id: `ACT-${Date.now()}`,
              type,
              content: String(content).trim(),
              next_follow_up: next_follow_up ? new Date(next_follow_up) : null,
              by: user ? user.ho_ten || user.tai_khoan : "Hệ thống",
              at: now,
            },
          },
        },
        { returnDocument: "after" }
      );
      if (!updated) return { error: new Error("Không tìm thấy cơ hội bán hàng") };
      return { ok: true, doc: updated };
    } catch (err) {
      logger.error("CrmPipelineDAO.addActivity error", { error: err.message });
      return { error: err };
    }
  }

  /**
   * 1-Click chuyển Cơ hội bán hàng sang Báo giá B2B (`/quotations`).
   */
  static async convertToQuotation(id, user = null) {
    try {
      if (!ObjectId.isValid(id)) return { error: new Error("ID cơ hội không hợp lệ") };
      const opp = await oppCol.findOne({ _id: new ObjectId(id), trang_thai: { $ne: "deleted" } });
      if (!opp) return { error: new Error("Không tìm thấy cơ hội bán hàng") };

      const quoteItems =
        Array.isArray(opp.items) && opp.items.length > 0
          ? opp.items
          : [
              {
                ten_sp: opp.title,
                so_luong: 1,
                don_gia: Math.max(0, Number(opp.expected_value || 0)),
                chiet_khau_phan_tram: 0,
              },
            ];

      const validUntil = new Date(Date.now() + 14 * 86_400_000).toISOString();
      const qRes = await QuotationDAO.create({
        khach_hang: {
          ten: opp.customer_name,
          so_dien_thoai: opp.customer_phone || "",
          email: opp.customer_email || "",
        },
        ngay_het_han: validUntil,
        items: quoteItems,
        thue_vat: 8,
        ghi_chu: `Chuyển đổi từ Cơ hội CRM ${opp.ma_co_hoi}: ${opp.title}`,
        user: user || {},
      });

      if (qRes?.error) return { error: qRes.error };
      const maBaoGia = qRes.ma_bao_gia || qRes.doc?.ma_bao_gia || qRes.data?.ma_bao_gia || "";

      const now = new Date();
      const updated = await oppCol.findOneAndUpdate(
        { _id: opp._id },
        {
          $set: {
            stage: opp.stage === "won" ? "won" : "proposal",
            probability: opp.stage === "won" ? 100 : 60,
            quotation_code: maBaoGia,
            updated_at: now,
          },
          $push: {
            activities: {
              id: `ACT-${Date.now()}`,
              type: "quotation",
              content: `Đã chuyển đổi sang Báo giá B2B ${maBaoGia}`,
              by: user ? user.ho_ten || user.tai_khoan : "Hệ thống",
              at: now,
            },
          },
        },
        { returnDocument: "after" }
      );

      return { ok: true, doc: updated, quotation: qRes };
    } catch (err) {
      logger.error("CrmPipelineDAO.convertToQuotation error", { error: err.message });
      return { error: err };
    }
  }
}
