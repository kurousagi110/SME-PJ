import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import PosShiftDAO from "../models/posShiftDAO.js";
import { logAction } from "../utils/auditLogger.js";
import { performedByOf } from "../utils/auditIdentity.js";
import { isAdminUser } from "../middleware/auth.js";

export default class PosShiftController {
  /** GET /api/v1/pos-shifts/active */
  static getActive = asyncHandler(async (req, res) => {
    const shift = await PosShiftDAO.getActiveShift(req.user?._id);
    return sendSuccess(res, shift, shift ? "Đang có ca thu ngân hoạt động" : "Chưa mở ca thu ngân");
  });

  /** POST /api/v1/pos-shifts/open */
  static open = asyncHandler(async (req, res) => {
    const { opening_cash = 0, register_name = "Quầy POS #1", notes = "" } = req.body || {};
    const result = await PosShiftDAO.openShift({
      cashier: req.user,
      openingCash: opening_cash,
      registerName: register_name,
      notes,
    });
    if (result?.error) throw ApiError.badRequest(result.error.message);

    logAction(
      "OPEN_POS_SHIFT",
      "pos_shift",
      String(result.doc._id),
      `Mở ca thu ngân ${result.doc.ma_ca} (quỹ đầu ca: ${Number(opening_cash || 0).toLocaleString("vi-VN")} đ)`,
      performedByOf(req),
      req.ip
    );

    return sendSuccess(res, result.doc, `Đã mở ca thu ngân ${result.doc.ma_ca}`, 201);
  });

  /** POST /api/v1/pos-shifts/:id/close */
  static close = asyncHandler(async (req, res) => {
    const { actual_cash = 0, notes = "" } = req.body || {};
    const result = await PosShiftDAO.closeShift({
      shiftId: req.params.id,
      cashier: req.user,
      actualCash: actual_cash,
      notes,
    });
    if (result?.error) throw ApiError.badRequest(result.error.message);

    const variance = result.doc.summary?.variance || 0;
    logAction(
      "CLOSE_POS_SHIFT",
      "pos_shift",
      String(result.doc._id),
      `Kết ca thu ngân ${result.doc.ma_ca} (chênh lệch quỹ: ${variance.toLocaleString("vi-VN")} đ)`,
      performedByOf(req),
      req.ip,
      { severity: variance !== 0 ? "warning" : "info" }
    );

    return sendSuccess(res, result.doc, `Đã chốt ca thu ngân ${result.doc.ma_ca}`);
  });

  /** GET /api/v1/pos-shifts */
  static list = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status = "", mine = "" } = req.query;
    const onlyMine = mine === "true" || !isAdminUser(req.user);
    const data = await PosShiftDAO.listShifts({
      page,
      limit,
      status,
      cashierId: onlyMine ? String(req.user?._id || "") : "",
    });
    if (data?.error) throw ApiError.internal(data.error.message);
    return sendSuccess(res, data, "Lấy lịch sử ca thu ngân thành công");
  });
}
