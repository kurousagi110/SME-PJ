import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import PromotionDAO from "../models/promotionDAO.js";
import { logAction } from "../utils/auditLogger.js";
import { performedByOf } from "../utils/auditIdentity.js";

export default class PromotionController {
  /** GET /api/v1/promotions */
  static list = asyncHandler(async (req, res) => {
    const { q = "", activeOnly = "", page = 1, limit = 50 } = req.query;
    const data = await PromotionDAO.list({
      q,
      activeOnly: activeOnly === "true" || activeOnly === "1",
      page,
      limit,
    });
    if (data?.error) throw ApiError.internal(data.error.message);
    return sendSuccess(res, data, "Lấy danh sách khuyến mãi thành công");
  });

  /** POST /api/v1/promotions */
  static create = asyncHandler(async (req, res) => {
    const resCreate = await PromotionDAO.create(req.body || {}, req.user);
    if (resCreate?.error) throw ApiError.badRequest(resCreate.error.message);
    logAction(
      "CREATE_PROMOTION",
      "promotion",
      String(resCreate.doc._id),
      `Tạo mã khuyến mãi ${resCreate.doc.code}`,
      performedByOf(req),
      req.ip
    );
    return sendSuccess(res, resCreate.doc, "Tạo chương trình khuyến mãi thành công", 201);
  });

  /** PUT /api/v1/promotions/:id */
  static update = asyncHandler(async (req, res) => {
    const resUpdate = await PromotionDAO.update(req.params.id, req.body || {});
    if (resUpdate?.error) throw ApiError.badRequest(resUpdate.error.message);
    logAction(
      "UPDATE_PROMOTION",
      "promotion",
      String(req.params.id),
      `Cập nhật mã khuyến mãi ${resUpdate.doc.code}`,
      performedByOf(req),
      req.ip
    );
    return sendSuccess(res, resUpdate.doc, "Cập nhật khuyến mãi thành công");
  });

  /** DELETE /api/v1/promotions/:id */
  static remove = asyncHandler(async (req, res) => {
    const resDel = await PromotionDAO.remove(req.params.id);
    if (resDel?.error) throw ApiError.badRequest(resDel.error.message);
    logAction("DELETE_PROMOTION", "promotion", String(req.params.id), "Xóa chương trình khuyến mãi", performedByOf(req), req.ip);
    return sendSuccess(res, { deleted: true }, "Đã xóa chương trình khuyến mãi");
  });

  /** POST /api/v1/promotions/validate */
  static validate = asyncHandler(async (req, res) => {
    const { code = "", orderAmount = 0, customerGroup = "", customerKey = "" } = req.body || {};
    const result = await PromotionDAO.validateCode({ code, orderAmount, customerGroup, customerKey });
    if (!result.valid) {
      throw ApiError.badRequest(result.message || "Mã khuyến mãi không hợp lệ", result.code || "INVALID_COUPON");
    }
    return sendSuccess(res, result, result.message || "Áp dụng mã khuyến mãi thành công");
  });

  /** GET /api/v1/promotions/loyalty/members */
  static listLoyaltyMembers = asyncHandler(async (req, res) => {
    const { q = "", limit = 50 } = req.query;
    const members = await PromotionDAO.listLoyaltyMembers({ q, limit });
    return sendSuccess(res, members, "Lấy danh sách thành viên tích điểm thành công");
  });

  /** GET /api/v1/promotions/loyalty/lookup?phone=...&partnerId=... */
  static lookupCustomerLoyalty = asyncHandler(async (req, res) => {
    const { phone = "", partnerId = "" } = req.query;
    const data = await PromotionDAO.getCustomerLoyalty({ partnerId: partnerId || null, phone });
    return sendSuccess(res, data, "Tra cứu điểm tích lũy thành công");
  });
}
