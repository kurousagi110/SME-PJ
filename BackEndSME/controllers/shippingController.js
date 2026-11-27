import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import VanChuyenDAO from "../models/vanChuyenDAO.js";
import SoQuyDAO from "../models/soQuyDAO.js";
import { LogisticsService } from "../services/logisticsService.js";
import { getDB } from "../config/database.js";
import { getIO } from "../utils/socketManager.js";
import { timingSafeEqualStrings } from "../utils/securityHelpers.js";
import { logAction } from "../utils/auditLogger.js";
import { performedByOf } from "../utils/auditIdentity.js";

export default class ShippingController {
  static list = asyncHandler(async (req, res) => {
    const trang_thai = req.query.trang_thai || req.query.status;
    const don_vi = req.query.don_vi || req.query.carrier || req.query.provider;
    const search = req.query.search || req.query.q;
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const result = await VanChuyenDAO.layDanhSach({ trang_thai, don_vi, search, page, limit });
    if (result.error) {
      throw ApiError.internal("Không thể lấy danh sách vận đơn: " + result.error.message);
    }
    return sendSuccess(res, result, "Lấy danh sách vận đơn thành công");
  });

  static getTongQuan = asyncHandler(async (req, res) => {
    const result = await VanChuyenDAO.layTongQuan();
    if (result.error) {
      throw ApiError.internal("Không thể lấy tổng quan vận chuyển: " + result.error.message);
    }
    return sendSuccess(res, result, "Lấy tổng quan vận chuyển thành công");
  });

  static getById = asyncHandler(async (req, res) => {
    const item = await VanChuyenDAO.layChiTiet(req.params.id);
    if (!item) {
      throw ApiError.notFound("Không tìm thấy vận đơn");
    }
    return sendSuccess(res, item, "Lấy thông tin vận đơn thành công");
  });

  static create = asyncHandler(async (req, res) => {
    const result = await VanChuyenDAO.taoVanDon({
      ...req.body,
      user: req.user,
    });

    if (result.error) {
      throw ApiError.internal("Không thể tạo vận đơn: " + result.error.message);
    }

    await logAction({
      action: "CREATE_WAYBILL",
      module: "SHIPPING",
      performedBy: performedByOf(req.user),
      target: result.ma_van_don,
      details: {
        ma_don_hang: req.body.ma_don_hang,
        don_vi: req.body.don_vi_van_chuyen,
        tien_cod: req.body.tien_thu_ho_cod,
      },
    });

    return sendSuccess(res, result, "Tạo vận đơn thành công", 201);
  });

  static updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { trang_thai, ghi_chu, vi_tri } = req.body;

    if (!trang_thai) {
      throw ApiError.badRequest("Trạng thái mới là bắt buộc");
    }

    const result = await VanChuyenDAO.capNhatTrangThai(id, {
      trang_thai,
      ghi_chu,
      vi_tri,
      user: req.user,
    });

    if (result.error) {
      throw ApiError.badRequest(result.error.message);
    }

    await logAction({
      action: "UPDATE_WAYBILL_STATUS",
      module: "SHIPPING",
      performedBy: performedByOf(req.user),
      target: id,
      details: { trang_thai, ghi_chu },
    });

    return sendSuccess(res, { success: true }, "Cập nhật trạng thái vận đơn thành công");
  });

  static calculateFee = asyncHandler(async (req, res) => {
    const { carrier, weightGram, fromProvince, toProvince, isCOD, codAmount } = req.query;
    const { LogisticsService } = await import("../services/logisticsService.js");
    const result = LogisticsService.calculateShippingFee({
      carrier,
      weightGram: Number(weightGram) || 1000,
      fromProvince,
      toProvince,
      isCOD: isCOD === "true",
      codAmount: Number(codAmount) || 0,
    });
    return sendSuccess(res, result, "Ước tính phí vận chuyển thành công");
  });

  static pushCarrier = asyncHandler(async (req, res) => {
    const result = await LogisticsService.pushOrderToCarrier(req.body);
    return sendSuccess(res, result, "Đẩy đơn hàng sang hãng vận chuyển thành công", 201);
  });

  /**
   * POST /api/v1/shipping/webhook — Nhận cập nhật trạng thái vận đơn & đối soát COD tự động từ GHN / GHTK / Viettel Post
   */
  static handleCarrierWebhook = asyncHandler(async (req, res) => {
    const configuredSecret = process.env.SHIPPING_WEBHOOK_SECRET || "";
    if (!configuredSecret) {
      if (process.env.NODE_ENV === "production") {
        throw ApiError.serviceUnavailable("Webhook vận chuyển chưa cấu hình SHIPPING_WEBHOOK_SECRET trong production");
      }
    } else {
      const incoming = String(
        req.headers["x-webhook-secret"] ||
          req.headers["x-api-key"] ||
          req.headers["authorization"]?.replace(/^Bearer\s+/i, "") ||
          ""
      );
      if (!timingSafeEqualStrings(incoming, configuredSecret)) {
        throw ApiError.unauthorized("Chữ ký webhook vận chuyển không hợp lệ", "INVALID_WEBHOOK_SECRET");
      }
    }

    const body = req.body || {};
    const trackingCode = String(body.tracking_code || body.OrderCode || body.label_id || body.ma_van_don || "").trim();
    const rawStatus = body.status || body.Status || body.trang_thai || "";
    const codAmount = Math.max(0, Number(body.cod_amount ?? body.CODAmount ?? body.tien_cod ?? 0));
    const codSettled = Boolean(body.cod_settled || body.is_cod_transferred);
    const eventId = String(body.event_id || `${trackingCode}:${rawStatus}:${codSettled}`);

    if (!trackingCode) {
      throw ApiError.badRequest("Thiếu mã vận đơn (tracking_code)");
    }

    const db = getDB();
    const webhookCol = db ? db.collection("shipping_webhooks") : null;
    if (webhookCol) {
      const dup = await webhookCol.findOne({ event_id: eventId });
      if (dup) {
        return sendSuccess(res, { processed: true, idempotent: true, tracking_code: trackingCode });
      }
    }

    const normalizedStatus = LogisticsService.normalizeWebhookStatus(rawStatus);
    const vanChuyenCol = db ? db.collection("van_chuyen") : null;
    const waybill = vanChuyenCol ? await vanChuyenCol.findOne({ ma_van_don: trackingCode }) : null;

    let codReceiptCode = null;
    if (waybill && vanChuyenCol) {
      await vanChuyenCol.updateOne(
        { _id: waybill._id },
        {
          $set: {
            trang_thai: normalizedStatus,
            cod_settled: codSettled || waybill.cod_settled || false,
            updated_at: new Date(),
          },
        }
      );

      // Tự động hạch toán Phiếu Thu đối soát COD về Sổ Quỹ nếu hãng xác nhận đã chuyển tiền COD
      const amountToPost = codAmount || Number(waybill.tien_thu_ho_cod || 0);
      if ((codSettled || normalizedStatus === "da_giao") && amountToPost > 0 && !waybill.cod_receipt_code) {
        const sqRes = await SoQuyDAO.taoPhieu({
          loai_phieu: "thu",
          hang_muc: "thu_tien_ban_hang",
          so_tien: amountToPost,
          phuong_thuc: "chuyen_khoan",
          doi_tuong: { loai: "khach_hang", ten: waybill.don_vi_van_chuyen || "Đối soát COD Hãng VC" },
          ma_chung_tu: trackingCode,
          ghi_chu: `Đối soát thu hộ COD tự động vận đơn ${trackingCode} (Đơn ${waybill.ma_don_hang || ""})`,
          user: { _id: "system_logistics", ho_ten: "Webhook Vận Chuyển" },
        });
        codReceiptCode = sqRes?.doc?.ma_phieu || null;
        if (codReceiptCode) {
          await vanChuyenCol.updateOne({ _id: waybill._id }, { $set: { cod_receipt_code: codReceiptCode, cod_settled: true } });
        }
      }
    }

    if (webhookCol) {
      await webhookCol.insertOne({
        event_id: eventId,
        tracking_code: trackingCode,
        raw_status: rawStatus,
        normalized_status: normalizedStatus,
        cod_receipt_code: codReceiptCode,
        received_at: new Date(),
      });
    }

    try {
      const io = getIO();
      if (io) {
        io.emit("shipping:webhook_updated", {
          trackingCode,
          status: normalizedStatus,
          codReceiptCode,
          timestamp: new Date(),
        });
      }
    } catch {
      // non-fatal socket emit
    }

    return sendSuccess(
      res,
      {
        processed: true,
        tracking_code: trackingCode,
        normalized_status: normalizedStatus,
        waybill_found: Boolean(waybill),
        cod_receipt_code: codReceiptCode,
      },
      "Đã xử lý webhook vận đơn thành công"
    );
  });
}


export const VanChuyenController = ShippingController;
