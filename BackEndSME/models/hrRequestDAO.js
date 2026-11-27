/**
 * HrRequestDAO — Quản lý Đơn Từ Nhân Sự Tự Phục Vụ (ESS):
 * Nghỉ phép năm / không lương, Tăng ca (OT 150/200/300%), Đi muộn / Về sớm, Công tác.
 */

import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";
import SystemSettingsDAO from "./systemSettingsDAO.js";
import { computeLeaveDaysBetween } from "../utils/hrEssEngine.js";

export const HR_REQUEST_TYPES = {
  LEAVE: "leave", // Nghỉ phép (có lương / không lương)
  OVERTIME: "overtime", // Đăng ký tăng ca OT
  LATE_EARLY: "late_early", // Xin đi muộn / về sớm (miễn phạt đi trễ)
  BUSINESS_TRIP: "business_trip", // Công tác
};

let hrReqCol = null;

function genReqCode(type = "leave") {
  const prefixMap = {
    leave: "NP",
    overtime: "OT",
    late_early: "DM",
    business_trip: "CT",
  };
  const prefix = prefixMap[type] || "HR";
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${prefix}-${ymd}-${rand}`;
}

export default class HrRequestDAO {
  static async injectDB(conn) {
    if (hrReqCol) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
    if (!dbName) throw new Error("HrRequestDAO.injectDB: missing SME_DB_NAME env var");
    hrReqCol = conn.db(dbName).collection("hr_requests");

    try {
      await hrReqCol.createIndex({ ma_don: 1 }, { unique: true });
      await hrReqCol.createIndex({ user_id: 1, trang_thai: 1, created_at: -1 });
      await hrReqCol.createIndex({ trang_thai: 1, loai_don: 1, created_at: -1 });
      await hrReqCol.createIndex({ tu_ngay: 1, den_ngay: 1 });
    } catch (err) {
      logger.warn("HrRequestDAO index warning", { error: err.message });
    }
  }

  /**
   * Tính quỹ phép năm còn lại của 1 nhân viên trong năm chỉ định.
   */
  static async getLeaveBalance(userId, year = new Date().getFullYear()) {
    const settings = await SystemSettingsDAO.getSettings();
    const totalAnnual = Number(settings?.payroll?.annual_leave_days_default || 12);
    if (!hrReqCol || !userId) {
      return { year, total_annual: totalAnnual, used_days: 0, pending_days: 0, remaining_days: totalAnnual };
    }

    const startYear = new Date(year, 0, 1);
    const endYear = new Date(year, 11, 31, 23, 59, 59, 999);

    const reqs = await hrReqCol
      .find({
        user_id: String(userId),
        loai_don: HR_REQUEST_TYPES.LEAVE,
        hinh_thuc_nghi: { $ne: "khong_luong" },
        trang_thai: { $in: ["approved", "pending"] },
        tu_ngay: { $gte: startYear, $lte: endYear },
      })
      .toArray();

    let usedDays = 0;
    let pendingDays = 0;
    for (const r of reqs) {
      const days = Number(r.so_ngay || 0);
      if (r.trang_thai === "approved") usedDays += days;
      else if (r.trang_thai === "pending") pendingDays += days;
    }

    return {
      year,
      total_annual: totalAnnual,
      used_days: usedDays,
      pending_days: pendingDays,
      remaining_days: Math.max(0, totalAnnual - usedDays - pendingDays),
    };
  }

  static async create(payload = {}, user = null) {
    try {
      const userId = String(user?._id || user?.id || payload.user_id || "");
      if (!userId) return { error: new Error("Không xác định được nhân viên tạo đơn") };

      const loai_don = Object.values(HR_REQUEST_TYPES).includes(payload.loai_don)
        ? payload.loai_don
        : HR_REQUEST_TYPES.LEAVE;

      const tuNgay = new Date(payload.tu_ngay || new Date());
      const denNgay = new Date(payload.den_ngay || payload.tu_ngay || new Date());
      if (Number.isNaN(tuNgay.getTime()) || Number.isNaN(denNgay.getTime())) {
        return { error: new Error("Ngày bắt đầu / kết thúc không hợp lệ") };
      }
      if (denNgay < tuNgay) {
        return { error: new Error("Ngày kết thúc không được nhỏ hơn ngày bắt đầu") };
      }

      const isHalfDay = Boolean(payload.nua_ngay);
      const soNgay =
        loai_don === HR_REQUEST_TYPES.OVERTIME
          ? 0
          : computeLeaveDaysBetween(tuNgay, denNgay, isHalfDay);

      const hinhThucNghi = payload.hinh_thuc_nghi || "phep_nam"; // "phep_nam" | "khong_luong" | "om_dau"
      if (loai_don === HR_REQUEST_TYPES.LEAVE && hinhThucNghi === "phep_nam") {
        const balance = await this.getLeaveBalance(userId, tuNgay.getFullYear());
        if (soNgay > balance.remaining_days) {
          return {
            error: new Error(
              `Số ngày phép năm còn lại không đủ (còn ${balance.remaining_days} ngày, yêu cầu ${soNgay} ngày)`
            ),
          };
        }
      }

      const soGioOt = loai_don === HR_REQUEST_TYPES.OVERTIME ? Math.max(0.5, Number(payload.so_gio_ot || 0)) : 0;
      const heSoOt =
        loai_don === HR_REQUEST_TYPES.OVERTIME
          ? [1.5, 2, 3].includes(Number(payload.he_so_ot))
            ? Number(payload.he_so_ot)
            : 1.5
          : 1;

      const lyDo = String(payload.ly_do || "").trim();
      if (!lyDo) return { error: new Error("Vui lòng nhập lý do gửi đơn") };

      const now = new Date();
      const doc = {
        ma_don: genReqCode(loai_don),
        loai_don,
        user_id: userId,
        ma_nv: user?.ma_nv || userId,
        ho_ten: user?.ho_ten || user?.tai_khoan || "Nhân viên",
        phong_ban: user?.phong_ban?.ten || "",
        chuc_vu: user?.chuc_vu?.ten || "",
        tu_ngay: tuNgay,
        den_ngay: denNgay,
        nua_ngay: isHalfDay,
        so_ngay: soNgay,
        hinh_thuc_nghi: loai_don === HR_REQUEST_TYPES.LEAVE ? hinhThucNghi : null,
        so_gio_ot: soGioOt,
        he_so_ot: heSoOt,
        ly_do: lyDo,
        trang_thai: "pending", // "pending" | "approved" | "rejected" | "cancelled"
        nguoi_lap_id: userId,
        nguoi_lap_tai_khoan: user?.tai_khoan || null,
        created_by: {
          user_id: userId,
          tai_khoan: user?.tai_khoan || null,
          ho_ten: user?.ho_ten || user?.tai_khoan || "Nhân viên",
        },
        approved_by: null,
        approved_at: null,
        ghi_chu_duyet: "",
        created_at: now,
        updated_at: now,
      };

      const res = await hrReqCol.insertOne(doc);
      return { ok: true, doc: { ...doc, _id: res.insertedId } };
    } catch (err) {
      logger.error("HrRequestDAO.create error", { error: err.message });
      return { error: err };
    }
  }

  static async list({ userId = "", status = "", type = "", page = 1, limit = 50 } = {}) {
    try {
      const filter = {};
      if (userId) filter.user_id = String(userId);
      if (status) filter.trang_thai = status;
      if (type) filter.loai_don = type;

      const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
      const [items, total] = await Promise.all([
        hrReqCol.find(filter).sort({ created_at: -1 }).skip(skip).limit(Number(limit)).toArray(),
        hrReqCol.countDocuments(filter),
      ]);

      return { items, total, page: Number(page), limit: Number(limit) };
    } catch (err) {
      logger.error("HrRequestDAO.list error", { error: err.message });
      return { error: err };
    }
  }

  static async getById(id) {
    if (!hrReqCol || !ObjectId.isValid(id)) return null;
    return await hrReqCol.findOne({ _id: new ObjectId(id) });
  }

  static async decide(id, { approve = true, note = "", approver = null }) {
    try {
      if (!ObjectId.isValid(id)) return { error: new Error("ID đơn từ không hợp lệ") };
      const nextStatus = approve ? "approved" : "rejected";
      const updated = await hrReqCol.findOneAndUpdate(
        { _id: new ObjectId(id), trang_thai: "pending" },
        {
          $set: {
            trang_thai: nextStatus,
            approved_by: approver
              ? {
                  user_id: String(approver._id || approver.id || ""),
                  ho_ten: approver.ho_ten || approver.tai_khoan || "Quản lý",
                }
              : null,
            approved_at: new Date(),
            ghi_chu_duyet: String(note || "").trim(),
            updated_at: new Date(),
          },
        },
        { returnDocument: "after" }
      );
      if (!updated) return { error: new Error("Không tìm thấy đơn đang chờ duyệt") };
      return { ok: true, doc: updated };
    } catch (err) {
      logger.error("HrRequestDAO.decide error", { error: err.message });
      return { error: err };
    }
  }

  /**
   * Tổng hợp các đơn OT và miễn phạt đi muộn đã được duyệt trong 1 tháng cho LuongDAO.
   * Trả về Map keyed theo user_id / ma_nv.
   */
  static async getApprovedMonthlyPayrollAdjustments(thang, nam) {
    const map = new Map();
    if (!hrReqCol) return map;
    try {
      const start = new Date(Number(nam), Number(thang) - 1, 1);
      const end = new Date(Number(nam), Number(thang), 0, 23, 59, 59, 999);

      const docs = await hrReqCol
        .find({
          trang_thai: "approved",
          loai_don: { $in: [HR_REQUEST_TYPES.OVERTIME, HR_REQUEST_TYPES.LATE_EARLY] },
          tu_ngay: { $gte: start, $lte: end },
        })
        .toArray();

      for (const d of docs) {
        const keys = [d.user_id, d.ma_nv].filter(Boolean).map(String);
        for (const k of keys) {
          if (!map.has(k)) {
            map.set(k, { ot_hours: 0, ot_weighted_hours: 0, excused_late_days: 0 });
          }
          const rec = map.get(k);
          if (d.loai_don === HR_REQUEST_TYPES.OVERTIME) {
            const hrs = Number(d.so_gio_ot || 0);
            const mult = Number(d.he_so_ot || 1.5);
            rec.ot_hours += hrs;
            rec.ot_weighted_hours += hrs * mult;
          } else if (d.loai_don === HR_REQUEST_TYPES.LATE_EARLY) {
            rec.excused_late_days += Math.max(1, Math.ceil(Number(d.so_ngay || 1)));
          }
        }
      }
      return map;
    } catch (err) {
      logger.warn("HrRequestDAO.getApprovedMonthlyPayrollAdjustments warning", { error: err.message });
      return map;
    }
  }
}
