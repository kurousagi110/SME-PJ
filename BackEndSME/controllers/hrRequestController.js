import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import HrRequestDAO from "../models/hrRequestDAO.js";
import SystemSettingsDAO from "../models/systemSettingsDAO.js";
import LuongDAO from "../models/luongDAO.js";
import {
  generateAttendanceQrToken,
  verifyAttendanceQrToken,
  evaluateGeofence,
} from "../utils/hrEssEngine.js";
import { notifyDepartment, notifyAdmin } from "../utils/socketManager.js";
import { logAction } from "../utils/auditLogger.js";
import { performedByOf } from "../utils/auditIdentity.js";
import { isAdminUser } from "../middleware/auth.js";
import { inferRoleCode, hasPermission } from "../utils/permissions.js";

export default class HrRequestController {
  /** GET /api/v1/hr-requests */
  static list = asyncHandler(async (req, res) => {
    const { status = "", type = "", mine = "", page = 1, limit = 50 } = req.query;
    const isManager =
      isAdminUser(req.user) ||
      inferRoleCode(req.user) === "hr_manager" ||
      hasPermission(req.user, ["hr.manage", "approvals.view"]);

    const filterUserId = mine === "true" || !isManager ? String(req.user?._id || "") : "";
    const data = await HrRequestDAO.list({ userId: filterUserId, status, type, page, limit });
    if (data?.error) throw ApiError.internal(data.error.message);
    return sendSuccess(res, data, "Lấy danh sách đơn từ nhân sự thành công");
  });

  /** GET /api/v1/hr-requests/leave-balance */
  static getLeaveBalance = asyncHandler(async (req, res) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    const balance = await HrRequestDAO.getLeaveBalance(String(req.user?._id || ""), year);
    return sendSuccess(res, balance, "Lấy số ngày phép năm thành công");
  });

  /** POST /api/v1/hr-requests */
  static create = asyncHandler(async (req, res) => {
    const result = await HrRequestDAO.create(req.body || {}, req.user);
    if (result?.error) throw ApiError.badRequest(result.error.message);

    const doc = result.doc;
    notifyDepartment("nhan_su", {
      type: "HR_REQUEST_CREATED",
      title: "Đơn từ nhân sự mới chờ duyệt",
      message: `${doc.ho_ten} vừa gửi đơn ${doc.ma_don} (${doc.loai_don})`,
      created_by: performedByOf(req),
    });
    notifyAdmin({
      type: "HR_REQUEST_CREATED",
      id: doc._id,
      ma_don: doc.ma_don,
      created_by: performedByOf(req),
    });
    logAction("CREATE_HR_REQUEST", "hr_request", String(doc._id), `Gửi đơn ${doc.ma_don} (${doc.loai_don})`, performedByOf(req), req.ip);

    return sendSuccess(res, doc, `Đã gửi đơn ${doc.ma_don} thành công`, 201);
  });

  /** POST /api/v1/hr-requests/:id/decide */
  static decide = asyncHandler(async (req, res) => {
    const isHrApprover =
      isAdminUser(req.user) ||
      inferRoleCode(req.user) === "hr_manager" ||
      hasPermission(req.user, ["hr.manage", "approvals.view"]);
    if (!isHrApprover) {
      throw ApiError.forbidden("Bạn không có quyền phê duyệt đơn từ nhân sự");
    }

    const existing = await HrRequestDAO.getById(req.params.id);
    if (!existing) throw ApiError.notFound("Không tìm thấy đơn từ nhân sự");

    const approve = req.body?.hanh_dong === "approve" || req.body?.approve === true;
    if (approve && !isAdminUser(req.user) && String(existing.user_id) === String(req.user?._id)) {
      throw ApiError.forbidden("Không thể tự duyệt đơn từ nhân sự của chính mình", "SELF_APPROVE_FORBIDDEN");
    }

    const result = await HrRequestDAO.decide(req.params.id, {
      approve,
      note: req.body?.ghi_chu || req.body?.note || "",
      approver: req.user,
    });
    if (result?.error) throw ApiError.badRequest(result.error.message);

    logAction(
      approve ? "APPROVE_HR_REQUEST" : "REJECT_HR_REQUEST",
      "hr_request",
      String(req.params.id),
      `${approve ? "Duyệt" : "Từ chối"} đơn ${existing.ma_don}`,
      performedByOf(req),
      req.ip
    );

    return sendSuccess(res, result.doc, approve ? "Đã phê duyệt đơn từ nhân sự" : "Đã từ chối đơn từ nhân sự");
  });

  /** GET /api/v1/hr-requests/attendance/qr-token — Sinh mã QR chấm công xoay vòng theo thời gian */
  static generateQrToken = asyncHandler(async (req, res) => {
    const settings = await SystemSettingsDAO.getSettings();
    const rotationSeconds = settings?.attendance?.qr_rotation_seconds || 120;
    const qr = generateAttendanceQrToken({ rotationSeconds });
    return sendSuccess(res, qr, "Tạo mã QR chấm công động thành công");
  });

  /** POST /api/v1/hr-requests/attendance/smart-check-in — Chấm công tự phục vụ bằng QR động + GPS Geofencing */
  static smartCheckIn = asyncHandler(async (req, res) => {
    const { mode = "check_in", qr_token = "", lat = null, lng = null, ghi_chu = "" } = req.body || {};
    const settings = await SystemSettingsDAO.getSettings();
    const attCfg = settings?.attendance || {};

    // 1. Nếu có qr_token thì xác thực chữ ký & thời hạn QR động
    if (qr_token && String(qr_token).trim()) {
      const qrCheck = verifyAttendanceQrToken(qr_token, {
        rotationSeconds: attCfg.qr_rotation_seconds || 120,
      });
      if (!qrCheck.valid) {
        throw ApiError.badRequest(qrCheck.message, "INVALID_ATTENDANCE_QR");
      }
    }

    // 2. Đánh giá bán kính GPS Geofence
    const geoCheck = evaluateGeofence(lat, lng, attCfg);
    if (!geoCheck.withinRadius) {
      throw ApiError.badRequest(geoCheck.message, "OUT_OF_GEOFENCE");
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const maNv = String(req.user?.ma_nv || req.user?._id || "");

    const payload = {
      ma_nv: maNv,
      ngay_thang: todayStr,
      ghi_chu: `${ghi_chu ? `${ghi_chu} | ` : ""}Smart Check-in (${qr_token ? "QR" : "GPS"}${
        geoCheck.distanceMeters !== null ? `, ${geoCheck.distanceMeters}m` : ""
      })`,
    };
    if (mode === "check_out") {
      payload.gio_check_out = hhmm;
    } else {
      payload.gio_check_in = hhmm;
    }

    const saveRes = await LuongDAO.createOrUpdateChamCong(payload);
    if (saveRes?.error) {
      throw ApiError.badRequest(saveRes.error.message || "Không thể ghi nhận chấm công");
    }

    logAction(
      "SMART_ATTENDANCE",
      "attendance",
      maNv,
      `${mode === "check_out" ? "Check-out" : "Check-in"} thông minh lúc ${hhmm} (${geoCheck.message})`,
      performedByOf(req),
      req.ip
    );

    return sendSuccess(
      res,
      {
        ma_nv: maNv,
        ngay_thang: todayStr,
        time: hhmm,
        mode,
        geofence: geoCheck,
      },
      `Đã ghi nhận ${mode === "check_out" ? "tan ca" : "vào ca"} lúc ${hhmm}`
    );
  });
}
