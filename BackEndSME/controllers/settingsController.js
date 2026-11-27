import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import SystemSettingsDAO from "../models/systemSettingsDAO.js";
import { logAction } from "../utils/auditLogger.js";
import { performedByOf } from "../utils/auditIdentity.js";

export default class SettingsController {
  /** GET /api/v1/settings — Lấy cấu hình doanh nghiệp & tham số hệ thống */
  static getSettings = asyncHandler(async (req, res) => {
    const settings = await SystemSettingsDAO.getSettings();
    return sendSuccess(res, settings, "Lấy cấu hình hệ thống thành công");
  });

  /** PUT /api/v1/settings — Cập nhật cấu hình hệ thống (Chỉ Admin / Ban Giám Đốc) */
  static updateSettings = asyncHandler(async (req, res) => {
    const before = await SystemSettingsDAO.getSettings({ bypassCache: true });
    const result = await SystemSettingsDAO.updateSettings(req.body || {}, req.user);
    if (result?.error) {
      throw ApiError.badRequest(result.error.message || "Không thể cập nhật cấu hình hệ thống");
    }

    logAction(
      "UPDATE_SETTINGS",
      "system_settings",
      "company_settings_default",
      "Cập nhật cấu hình doanh nghiệp & tham số nghiệp vụ",
      performedByOf(req),
      req.ip,
      { before, after: result.data, severity: "warning" }
    );

    return sendSuccess(res, result.data, "Cập nhật cấu hình hệ thống thành công");
  });
}
