/**
 * ProcurementDAO — Quy trình Mua Hàng Nâng Cao:
 * Đề xuất mua hàng (PR) → Yêu cầu báo giá nhiều NCC (RFQ Matrix) → 1-Click tạo PO → Vendor Scorecard & 3-Way Matching.
 */

import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";
import DonHangService from "../services/donHangService.js";
import {
  rankRfqVendorQuotes,
  evaluateThreeWayMatch,
  computeVendorScorecardRows,
} from "../utils/crmProcurementEngine.js";

let prCol = null;
let rfqCol = null;
let donHangCol = null;

function genCode(prefix) {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${prefix}-${ymd}-${rand}`;
}

export default class ProcurementDAO {
  static async injectDB(conn) {
    if (prCol) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
    if (!dbName) throw new Error("ProcurementDAO.injectDB: missing SME_DB_NAME env var");
    const db = conn.db(dbName);

    prCol = db.collection("purchase_requests");
    rfqCol = db.collection("rfqs");
    donHangCol = db.collection("don_hang");

    try {
      await prCol.createIndex({ ma_pr: 1 }, { unique: true });
      await prCol.createIndex({ trang_thai: 1, created_at: -1 });
      await rfqCol.createIndex({ ma_rfq: 1 }, { unique: true });
      await rfqCol.createIndex({ trang_thai: 1, created_at: -1 });
    } catch (err) {
      logger.warn("ProcurementDAO index warning", { error: err.message });
    }
  }

  /* ═══════════════════════ 1. PURCHASE REQUEST (PR) ═══════════════════════ */

  static async listPRs({ status = "", page = 1, limit = 50 } = {}) {
    try {
      const filter = {};
      if (status) filter.trang_thai = status;
      const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
      const [items, total] = await Promise.all([
        prCol.find(filter).sort({ created_at: -1 }).skip(skip).limit(Number(limit)).toArray(),
        prCol.countDocuments(filter),
      ]);
      return { items, total };
    } catch (err) {
      logger.error("ProcurementDAO.listPRs error", { error: err.message });
      return { error: err };
    }
  }

  static async getPRById(id) {
    if (!prCol || !ObjectId.isValid(id)) return null;
    return await prCol.findOne({ _id: new ObjectId(id) });
  }

  static async createPR(payload = {}, user = null) {
    try {
      const title = String(payload.title || "").trim();
      const items = Array.isArray(payload.items) ? payload.items : [];
      if (!title || items.length === 0) {
        return { error: new Error("Đề xuất mua hàng cần có tiêu đề và ít nhất 1 vật tư/hàng hóa") };
      }

      const normalizedItems = items.map((it) => {
        const qty = Math.max(1, Number(it.quantity || it.so_luong || 1));
        const estPrice = Math.max(0, Number(it.estimated_price || it.don_gia || 0));
        return {
          item_id: it.item_id || null,
          item_type: it.item_type || "nguyen_lieu",
          item_code: String(it.item_code || "").trim(),
          item_name: String(it.item_name || it.ten || "").trim(),
          unit: String(it.unit || it.don_vi || "cái").trim(),
          quantity: qty,
          estimated_price: estPrice,
          estimated_total: Math.round(qty * estPrice),
        };
      });

      const estimatedBudget = normalizedItems.reduce((s, it) => s + it.estimated_total, 0);
      const now = new Date();
      const userId = user ? String(user._id || user.id || "") : "";

      const doc = {
        ma_pr: genCode("PR"),
        title,
        department: payload.department || user?.phong_ban?.ten || "Phòng sản xuất",
        priority: ["normal", "high", "urgent"].includes(payload.priority) ? payload.priority : "normal",
        needed_by: payload.needed_by ? new Date(payload.needed_by) : null,
        items: normalizedItems,
        estimated_budget: estimatedBudget,
        reason: String(payload.reason || "").trim(),
        trang_thai: "pending", // "pending" | "approved" | "rejected" | "rfq_created"
        rfq_code: null,
        nguoi_lap_id: userId,
        nguoi_lap_tai_khoan: user?.tai_khoan || null,
        created_by: {
          user_id: userId,
          tai_khoan: user?.tai_khoan || null,
          ho_ten: user?.ho_ten || user?.tai_khoan || "Nhân viên",
        },
        created_at: now,
        updated_at: now,
      };

      const res = await prCol.insertOne(doc);
      return { ok: true, doc: { ...doc, _id: res.insertedId } };
    } catch (err) {
      logger.error("ProcurementDAO.createPR error", { error: err.message });
      return { error: err };
    }
  }

  static async decidePR(id, { approve = true, note = "", approver = null }) {
    try {
      if (!ObjectId.isValid(id)) return { error: new Error("ID đề xuất mua hàng không hợp lệ") };
      const updated = await prCol.findOneAndUpdate(
        { _id: new ObjectId(id), trang_thai: "pending" },
        {
          $set: {
            trang_thai: approve ? "approved" : "rejected",
            approved_by: approver ? { user_id: String(approver._id || ""), ho_ten: approver.ho_ten || approver.tai_khoan } : null,
            approved_at: new Date(),
            decision_note: String(note || "").trim(),
            updated_at: new Date(),
          },
        },
        { returnDocument: "after" }
      );
      if (!updated) return { error: new Error("Không tìm thấy đề xuất mua hàng đang chờ duyệt") };
      return { ok: true, doc: updated };
    } catch (err) {
      logger.error("ProcurementDAO.decidePR error", { error: err.message });
      return { error: err };
    }
  }

  /* ═══════════════════════ 2. RFQ & VENDOR QUOTE MATRIX ═══════════════════════ */

  static async listRFQs({ status = "", limit = 50 } = {}) {
    try {
      const filter = {};
      if (status) filter.trang_thai = status;
      const raw = await rfqCol.find(filter).sort({ created_at: -1 }).limit(Number(limit)).toArray();
      const items = raw.map((r) => ({
        ...r,
        ranked_quotes: rankRfqVendorQuotes(r.quotes || []),
      }));
      return { items, total: items.length };
    } catch (err) {
      logger.error("ProcurementDAO.listRFQs error", { error: err.message });
      return { error: err };
    }
  }

  static async createRFQ({ prId = null, title = "", items = [], deadline = null, invitedVendors = [], user = null }) {
    try {
      let prDoc = null;
      if (prId && ObjectId.isValid(prId)) {
        prDoc = await prCol.findOne({ _id: new ObjectId(prId) });
      }

      const finalItems = items.length > 0 ? items : prDoc?.items || [];
      if (finalItems.length === 0) {
        return { error: new Error("RFQ cần ít nhất 1 mặt hàng cần báo giá") };
      }

      const now = new Date();
      const doc = {
        ma_rfq: genCode("RFQ"),
        pr_id: prDoc ? prDoc._id : null,
        ma_pr: prDoc ? prDoc.ma_pr : null,
        title: String(title || prDoc?.title || "Yêu cầu báo giá NCC").trim(),
        items: finalItems,
        invited_vendors: Array.isArray(invitedVendors) ? invitedVendors : [],
        quotes: [],
        deadline: deadline ? new Date(deadline) : new Date(Date.now() + 5 * 86_400_000),
        trang_thai: "open", // "open" | "awarded" | "cancelled"
        awarded_vendor: null,
        po_code: null,
        created_by: user ? { user_id: String(user._id || ""), ho_ten: user.ho_ten || user.tai_khoan } : null,
        created_at: now,
        updated_at: now,
      };

      const res = await rfqCol.insertOne(doc);
      if (prDoc) {
        await prCol.updateOne(
          { _id: prDoc._id },
          { $set: { trang_thai: "rfq_created", rfq_code: doc.ma_rfq, updated_at: now } }
        );
      }

      return { ok: true, doc: { ...doc, _id: res.insertedId, ranked_quotes: [] } };
    } catch (err) {
      logger.error("ProcurementDAO.createRFQ error", { error: err.message });
      return { error: err };
    }
  }

  static async submitVendorQuote(rfqId, quotePayload = {}) {
    try {
      if (!ObjectId.isValid(rfqId)) return { error: new Error("ID RFQ không hợp lệ") };
      const vendorName = String(quotePayload.vendor_name || "").trim();
      const totalPrice = Math.max(0, Number(quotePayload.total_price || 0));
      if (!vendorName || totalPrice <= 0) {
        return { error: new Error("Cần nhập tên nhà cung cấp và tổng giá chào > 0") };
      }

      const quote = {
        quote_id: `VQ-${Date.now().toString(36).toUpperCase()}`,
        vendor_name: vendorName,
        total_price: totalPrice,
        lead_time_days: Math.max(1, Number(quotePayload.lead_time_days || 5)),
        payment_terms_days: Math.max(0, Number(quotePayload.payment_terms_days || 15)),
        notes: String(quotePayload.notes || "").trim(),
        submitted_at: new Date(),
      };

      const updated = await rfqCol.findOneAndUpdate(
        { _id: new ObjectId(rfqId), trang_thai: "open" },
        { $push: { quotes: quote }, $set: { updated_at: new Date() } },
        { returnDocument: "after" }
      );
      if (!updated) return { error: new Error("Không tìm thấy RFQ đang mở") };
      return { ok: true, doc: { ...updated, ranked_quotes: rankRfqVendorQuotes(updated.quotes || []) } };
    } catch (err) {
      logger.error("ProcurementDAO.submitVendorQuote error", { error: err.message });
      return { error: err };
    }
  }

  /**
   * Chọn NCC thắng thầu trong RFQ và tự động sinh Đơn Mua Hàng (PO nháp trong don_hang).
   */
  static async awardAndConvertToPO(rfqId, vendorName, user = null) {
    try {
      if (!ObjectId.isValid(rfqId)) return { error: new Error("ID RFQ không hợp lệ") };
      const rfq = await rfqCol.findOne({ _id: new ObjectId(rfqId), trang_thai: "open" });
      if (!rfq) return { error: new Error("Không tìm thấy RFQ đang mở để chọn thầu") };

      const winningQuote = (rfq.quotes || []).find((q) => q.vendor_name === vendorName);
      if (!winningQuote) return { error: new Error(`Không tìm thấy báo giá của nhà cung cấp "${vendorName}"`) };

      const totalQty = Math.max(1, rfq.items.reduce((s, it) => s + Number(it.quantity || 1), 0));
      const avgUnitPrice = Math.round(winningQuote.total_price / totalQty);

      const poItems = rfq.items.map((it) => ({
        loai_hang: it.item_type === "san_pham" ? "san_pham" : "nguyen_lieu",
        ...(it.item_id ? { nguyen_lieu_id: it.item_id, san_pham_id: it.item_id } : {}),
        ten_sp: it.item_name,
        ma_sp: it.item_code || "",
        so_luong: Number(it.quantity || 1),
        don_gia: it.estimated_price > 0 ? it.estimated_price : avgUnitPrice,
        don_vi: it.unit || "cái",
      }));

      let poCode = `PO-${rfq.ma_rfq}`;
      try {
        const poRes = await DonHangService.create(
          {
            loai_don: "purchase_receipt",
            nha_cung_cap_ten: vendorName,
            san_pham: poItems,
            ghi_chu: `Tự động tạo từ RFQ ${rfq.ma_rfq} (Giá trúng thầu: ${winningQuote.total_price.toLocaleString("vi-VN")} đ, giao ${winningQuote.lead_time_days} ngày)`,
            trang_thai: "draft",
          },
          user?._id || null
        );
        if (poRes?.ma_dh) poCode = poRes.ma_dh;
      } catch (poErr) {
        logger.warn("RFQ convert to PO fallback warning", { error: poErr.message });
      }

      const updated = await rfqCol.findOneAndUpdate(
        { _id: rfq._id },
        {
          $set: {
            trang_thai: "awarded",
            awarded_vendor: vendorName,
            awarded_price: winningQuote.total_price,
            po_code: poCode,
            awarded_at: new Date(),
            updated_at: new Date(),
          },
        },
        { returnDocument: "after" }
      );

      return { ok: true, doc: updated, po_code: poCode };
    } catch (err) {
      logger.error("ProcurementDAO.awardAndConvertToPO error", { error: err.message });
      return { error: err };
    }
  }

  /* ═══════════════════════ 3. VENDOR SCORECARD & 3-WAY MATCHING ═══════════════════════ */

  static async getVendorScorecard() {
    try {
      const agg = await donHangCol
        .aggregate([
          { $match: { loai_don: "purchase_receipt", trang_thai: { $ne: "deleted" } } },
          {
            $group: {
              _id: { $ifNull: ["$nha_cung_cap_ten", "Nhà cung cấp lẻ"] },
              total_orders: { $sum: 1 },
              completed_orders: {
                $sum: { $cond: [{ $in: ["$trang_thai", ["completed", "paid"]] }, 1, 0] },
              },
              defect_orders: {
                $sum: { $cond: [{ $eq: ["$trang_thai", "cancelled"] }, 1, 0] },
              },
              total_spend: { $sum: { $ifNull: ["$tong_tien", 0] } },
            },
          },
        ])
        .toArray();

      const rows = computeVendorScorecardRows(
        agg.map((a) => ({
          vendor_name: a._id,
          total_orders: a.total_orders,
          completed_orders: a.completed_orders,
          on_time_orders: a.completed_orders,
          defect_orders: a.defect_orders,
          total_spend: a.total_spend,
        }))
      );
      return rows;
    } catch (err) {
      logger.error("ProcurementDAO.getVendorScorecard error", { error: err.message });
      return [];
    }
  }

  static runThreeWayMatch(payload = {}) {
    return evaluateThreeWayMatch({
      poQty: payload.po_qty,
      poUnitPrice: payload.po_unit_price,
      receivedQty: payload.received_qty,
      invoicedQty: payload.invoiced_qty,
      invoicedUnitPrice: payload.invoiced_unit_price,
      priceTolerancePct: payload.price_tolerance_pct ?? 2,
    });
  }
}
