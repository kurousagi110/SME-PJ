// Phase 5 (2026-07-09): wire SanXuatService vào HTTP layer.
// Pattern y hệt controllers/dieuChinhKhoController.js + bomControllers.js:
//   - asyncHandler bọc try/catch
//   - sendSuccess / sendError + ApiError cho error flow đồng nhất
//   - Service nhận mongoClient từ req.app.locals để dùng transaction
//   - Sau khi OK: notify Thủ kho (NL đã bị trừ) + logAction audit
//
// Validation flow:
//   1. requireBody (route) — chắc chắn field có mặt
//   2. Controller-level — kiểm ObjectId, qty > 0
//   3. Service-level — kiểm SP tồn tại, có BOM, đủ NL (transaction-safe)

import { ObjectId } from "mongodb";
import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess, buildPagination } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import SanXuatService from "../services/sanXuatService.js";
import { notifyApprover } from "../utils/socketManager.js";
import { logAction } from "../utils/auditLogger.js";
import { performedByOf } from "../utils/auditIdentity.js";

export default class ProductionController {
  /* ─── PRODUCE (tạo lệnh sản xuất) ─── */
  static produce = asyncHandler(async (req, res) => {
    const body = req.body || {};
    const san_pham_id = body.san_pham_id || body.product_id;
    const so_luong_sx = body.so_luong_sx ?? body.quantity ?? body.produce_qty;
    const ghi_chu = body.ghi_chu || body.note || "";

    // Validation tier 1 — shape cơ bản
    if (!ObjectId.isValid(san_pham_id)) {
      throw ApiError.badRequest("san_pham_id (product_id) không phải ObjectId hợp lệ", "VALIDATION_ERROR");
    }
    const qty = Number(so_luong_sx);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw ApiError.badRequest("so_luong_sx (quantity) phải là số dương", "VALIDATION_ERROR");
    }

    // Pass mongoClient để service dùng transaction (preferred).
    // Nếu app chưa inject (test/migration) → service tự fallback compensation.
    const mongoClient = req.app?.locals?.mongoClient || null;

    const result = await SanXuatService.produce({
      san_pham_id,
      so_luong_sx: qty,
      ghi_chu: String(ghi_chu).trim(),
      mongoClient,
    });

    if (result?.error) {
      const msg = result.error.message || "Tạo lệnh sản xuất thất bại";
      // "Không đủ nguyên liệu" kèm `lack` — truyền data đính kèm cho FE xử lý.
      if (msg === "Không đủ nguyên liệu") {
        throw ApiError.badRequest(msg, "INSUFFICIENT_STOCK", result.lack || null);
      }
      // Các lỗi user-facing còn lại (BOM thiếu, SP không tồn tại, ...)
      throw ApiError.badRequest(msg, "VALIDATION_ERROR");
    }

    // Side effects sau khi ghi kho thành công
    const createdBy = performedByOf(req);

    notifyApprover({
      type: "SX_CREATED",
      id:   result.logId,
      san_pham_id,
      so_luong_sx: qty,
      unit_cost:   result.unitCost,
      total_cost:  result.totalCost,
      ghi_chu:     String(ghi_chu).trim(),
      created_by:  createdBy,
    });

    logAction(
      "CREATE",
      "san_xuat",
      result.logId?.toString(),
      `Sản xuất ${qty} SP (san_pham_id=${san_pham_id}) — tổng chi phí ${result.totalCost}`,
      createdBy,
      req.ip
    );

    return sendSuccess(res, result, "Tạo lệnh sản xuất thành công", 201);
  });

  /* ─── GET LOGS (lịch sử lô sản xuất / tra cứu lô) ─── */
  static getLogs = asyncHandler(async (req, res) => {
    const { san_pham_id, search, page = 1, limit = 20 } = req.query;

    if (san_pham_id && !ObjectId.isValid(san_pham_id)) {
      throw ApiError.badRequest("san_pham_id không phải ObjectId hợp lệ", "VALIDATION_ERROR");
    }

    const result = await SanXuatService.getLogs({
      san_pham_id: san_pham_id || undefined,
      search: search || undefined,
      page:  Number(page)  || 1,
      limit: Number(limit) || 20,
    });

    const pagination = buildPagination(result.page, result.limit, result.total);
    return sendSuccess(res, result.items, "Lấy lịch sử sản xuất thành công", 200, pagination);
  });

  /* ─── GET BY MA LO (tra cứu chi tiết nguồn gốc lô) ─── */
  static getByMaLo = asyncHandler(async (req, res) => {
    const { ma_lo } = req.params;
    if (!ma_lo) throw ApiError.badRequest("Thiếu mã lô hàng");

    const item = await SanXuatService.getByMaLo(ma_lo);
    if (!item) throw ApiError.notFound("Không tìm thấy thông tin lô hàng");

    return sendSuccess(res, item, "Lấy thông tin nguồn gốc lô hàng thành công", 200);
  });

  /* ─── KANBAN: Lấy danh sách lệnh SX phân nhóm theo 6 công đoạn ─── */
  static getKanbanBoard = asyncHandler(async (req, res) => {
    const { getDB } = await import("../config/database.js");
    const db = getDB();
    const donHangCol = db.collection("don_hang");

    const orders = await donHangCol
      .find({
        loai_don: "production_receipt",
        trang_thai: { $nin: ["deleted", "cancelled"] },
      })
      .sort({ updated_at: -1, created_at: -1 })
      .limit(100)
      .toArray();

    const STAGE_KEYS = [
      "pending",
      "raw_material_prep",
      "machining",
      "finishing",
      "assembly_qc",
      "completed",
    ];

    const columns = {
      pending: [],
      raw_material_prep: [],
      machining: [],
      finishing: [],
      assembly_qc: [],
      completed: [],
    };

    for (const o of orders) {
      let stage = o.cong_doan_hien_tai;
      if (!stage || !STAGE_KEYS.includes(stage)) {
        if (o.trang_thai === "completed") stage = "completed";
        else if (o.trang_thai === "producing") stage = "machining";
        else stage = "pending";
      }

      columns[stage].push({
        _id: o._id,
        ma_dh: o.ma_dh,
        san_pham: o.san_pham || [],
        tong_tien: o.tong_tien,
        trang_thai: o.trang_thai,
        cong_doan_hien_tai: stage,
        created_at: o.created_at,
        updated_at: o.updated_at,
        ghi_chu: o.ghi_chu || "",
        lich_su_cong_doan: o.lich_su_cong_doan || [],
        tong_phe_pham: (o.scrap_records || []).reduce((s, r) => s + Number(r.qty || 0), 0),
      });
    }

    return sendSuccess(res, { columns, totalOrders: orders.length }, "Lấy bảng Kanban sản xuất thành công");
  });

  /* ─── KANBAN: Cập nhật công đoạn sản xuất & ghi nhận phế phẩm/hao hụt ─── */
  static updateOrderStage = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { stage, scrap_qty = 0, scrap_reason = "", notes = "" } = req.body;

    if (!ObjectId.isValid(orderId)) {
      throw ApiError.badRequest("Mã đơn hàng không hợp lệ");
    }

    const VALID_STAGES = [
      "pending",
      "raw_material_prep",
      "machining",
      "finishing",
      "assembly_qc",
      "completed",
    ];

    if (!VALID_STAGES.includes(stage)) {
      throw ApiError.badRequest(`Công đoạn không hợp lệ. Chọn 1 trong: ${VALID_STAGES.join(", ")}`);
    }

    const { getDB } = await import("../config/database.js");
    const db = getDB();
    const donHangCol = db.collection("don_hang");

    const order = await donHangCol.findOne({ _id: new ObjectId(orderId) });
    if (!order) throw ApiError.notFound("Không tìm thấy lệnh sản xuất");

    const actor = performedByOf(req);
    const now = new Date();

    const stageEntry = {
      from_stage: order.cong_doan_hien_tai || "pending",
      to_stage: stage,
      timestamp: now,
      by: actor?.name || actor?.username || "Thợ xưởng",
      notes: String(notes).trim(),
    };

    const updateDoc = {
      $set: {
        cong_doan_hien_tai: stage,
        updated_at: now,
      },
      $push: {
        lich_su_cong_doan: stageEntry,
      },
    };

    // Nếu có báo phế phẩm hao hụt
    const scrapNum = Number(scrap_qty || 0);
    if (scrapNum > 0) {
      updateDoc.$push.scrap_records = {
        stage,
        qty: scrapNum,
        reason: String(scrap_reason).trim() || "Lỗi gia công/vật tư",
        recorded_at: now,
        recorded_by: actor?.name || "Thợ xưởng",
      };
    }

    // Nếu chuyển sang completed -> đồng bộ trạng thái đơn hàng
    if (stage === "completed" && order.trang_thai !== "completed") {
      updateDoc.$set.trang_thai = "completed";
      updateDoc.$set.completed_at = now;
    } else if (stage !== "completed" && order.trang_thai === "pending" && stage !== "pending") {
      updateDoc.$set.trang_thai = "producing";
    }

    await donHangCol.updateOne({ _id: new ObjectId(orderId) }, updateDoc);

    // Bắn realtime Socket.io thông báo chuyển công đoạn
    try {
      const { getIO } = await import("../utils/socketManager.js");
      const io = getIO();
      if (io) {
        io.emit("PRODUCTION_STAGE_CHANGED", {
          orderId,
          orderCode: order.ma_dh,
          stage,
          actor: actor?.name || "Thợ xưởng",
          timestamp: now,
        });
      }
    } catch {}

    return sendSuccess(res, { orderId, stage }, `Đã chuyển công đoạn sang: ${stage}`);
  });

  /* ─── SCRAP REPORT: Báo cáo tỷ lệ hao hụt & năng suất sản xuất (Yield Rate) ─── */
  static getScrapReport = asyncHandler(async (req, res) => {
    const { getDB } = await import("../config/database.js");
    const db = getDB();
    const donHangCol = db.collection("don_hang");

    const orders = await donHangCol
      .find({
        loai_don: "production_receipt",
        $or: [
          { scrap_records: { $exists: true, $not: { $size: 0 } } },
          { trang_thai: "completed" },
        ],
      })
      .toArray();

    let totalProduced = 0;
    let totalScrap = 0;
    const stageBreakdown = {
      raw_material_prep: 0,
      machining: 0,
      finishing: 0,
      assembly_qc: 0,
    };
    const productStats = new Map();

    for (const o of orders) {
      const orderQty = (o.san_pham || []).reduce((sum, sp) => sum + Number(sp.so_luong || 0), 0);
      totalProduced += orderQty;

      const pCode = o.san_pham?.[0]?.ma_sp || "SP-KHAC";
      const pName = o.san_pham?.[0]?.ten_sp || "Sản phẩm khác";

      if (!productStats.has(pCode)) {
        productStats.set(pCode, { code: pCode, name: pName, produced: 0, scrap: 0 });
      }
      const pCur = productStats.get(pCode);
      pCur.produced += orderQty;

      if (Array.isArray(o.scrap_records)) {
        for (const sr of o.scrap_records) {
          const sq = Number(sr.qty || 0);
          totalScrap += sq;
          if (stageBreakdown[sr.stage] !== undefined) {
            stageBreakdown[sr.stage] += sq;
          }
          pCur.scrap += sq;
        }
      }
    }

    const yieldRate = totalProduced + totalScrap > 0
      ? Math.round((totalProduced / (totalProduced + totalScrap)) * 1000) / 10
      : 100;
    const scrapRate = Math.round((100 - yieldRate) * 10) / 10;

    return sendSuccess(
      res,
      {
        totalProduced,
        totalScrap,
        yieldRate,
        scrapRate,
        stageBreakdown,
        productStats: Array.from(productStats.values()),
      },
      "Lấy báo cáo tỷ lệ hao hụt thành công"
    );
  });
}

export const SanXuatController = ProductionController;