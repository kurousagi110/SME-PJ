/**
 * HR Employee Self-Service (ESS), Vietnam Tax/Social Insurance & QR/GPS Attendance Engine.
 * Thuần logic tính toán, không phụ thuộc trực tiếp DB.
 */

import crypto from "crypto";

/* ══════════════════ 1. BIỂU THUẾ TNCN LŨY TIẾN 7 BẬC VIỆT NAM ══════════════════ */
const VN_PIT_BRACKETS = [
  { upTo: 5_000_000, rate: 0.05 },
  { upTo: 10_000_000, rate: 0.10 },
  { upTo: 18_000_000, rate: 0.15 },
  { upTo: 32_000_000, rate: 0.20 },
  { upTo: 52_000_000, rate: 0.25 },
  { upTo: 80_000_000, rate: 0.30 },
  { upTo: Infinity, rate: 0.35 },
];

/**
 * Tính thuế TNCN hàng tháng theo biểu lũy tiến từng phần 7 bậc (Luật Thuế TNCN VN).
 * @param {number} taxableIncome - Thu nhập tính thuế (đã trừ BH bắt buộc và giảm trừ gia cảnh)
 */
export function computeVietnamProgressivePit(taxableIncome = 0) {
  const income = Math.max(0, Number(taxableIncome) || 0);
  if (income <= 0) return 0;

  let tax = 0;
  let prevCap = 0;

  for (const bracket of VN_PIT_BRACKETS) {
    if (income <= prevCap) break;
    const slice = Math.min(income, bracket.upTo) - prevCap;
    if (slice > 0) {
      tax += slice * bracket.rate;
    }
    prevCap = bracket.upTo;
  }

  return Math.round(tax);
}

/**
 * Tính đầy đủ các khoản khấu trừ BHXH (8%), BHYT (1.5%), BHTN (1%), phần DN đóng (21.5%)
 * và Thuế TNCN theo cấu hình hệ thống.
 */
export function computeVietnamTaxAndInsurance({
  grossIncome = 0,
  baseSalaryForInsurance = 0,
  dependents = 0,
  config = {},
} = {}) {
  const gross = Math.max(0, Number(grossIncome) || 0);
  const cap = Math.max(0, Number(config.MUC_TRAN_BHXH ?? 46_800_000));
  const rawInsBase = Math.max(0, Number(baseSalaryForInsurance) || 0);
  const insBase = cap > 0 ? Math.min(rawInsBase, cap) : rawInsBase;

  const bhxhPct = Math.max(0, Number(config.BHXH_NLD_PCT ?? 8)) / 100;
  const bhytPct = Math.max(0, Number(config.BHYT_NLD_PCT ?? 1.5)) / 100;
  const bhtnPct = Math.max(0, Number(config.BHTN_NLD_PCT ?? 1)) / 100;
  const dnPct = Math.max(0, Number(config.BH_DN_PCT ?? 21.5)) / 100;

  const bhxh_nld = Math.round(insBase * bhxhPct);
  const bhyt_nld = Math.round(insBase * bhytPct);
  const bhtn_nld = Math.round(insBase * bhtnPct);
  const tong_bh_nld = bhxh_nld + bhyt_nld + bhtn_nld;
  const tong_bh_dn = Math.round(insBase * dnPct);

  const giamTruBanThan = Math.max(0, Number(config.GIAM_TRU_BAN_THAN ?? 11_000_000));
  const giamTruPhuThuoc = Math.max(0, Number(config.GIAM_TRU_PHU_THUOC ?? 4_400_000));
  const soNguoiPhuThuoc = Math.max(0, Math.floor(Number(dependents) || 0));
  const tong_giam_tru = giamTruBanThan + soNguoiPhuThuoc * giamTruPhuThuoc;

  const thu_nhap_tinh_thue = Math.max(0, gross - tong_bh_nld - tong_giam_tru);
  const thue_tncn = computeVietnamProgressivePit(thu_nhap_tinh_thue);

  return {
    muc_dong_bh: insBase,
    bhxh_nld,
    bhyt_nld,
    bhtn_nld,
    tong_bh_nld,
    tong_bh_dn,
    so_nguoi_phu_thuoc: soNguoiPhuThuoc,
    tong_giam_tru,
    thu_nhap_tinh_thue,
    thue_tncn,
    tong_khau_tru_luat: tong_bh_nld + thue_tncn,
  };
}

/* ══════════════════ 2. NGHỈ PHÉP & TĂNG CA (OT) ══════════════════ */

/**
 * Tính số ngày nghỉ giữa 2 mốc ngày (tính cả 2 đầu, hỗ trợ nửa ngày = 0.5).
 */
export function computeLeaveDaysBetween(startDate, endDate, isHalfDay = false) {
  if (isHalfDay) return 0.5;
  const start = new Date(startDate);
  const end = new Date(endDate || startDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  const sUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const eUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  if (eUtc < sUtc) return 0;

  return Math.floor((eUtc - sUtc) / 86_400_000) + 1;
}

/**
 * Tính tiền tăng ca (OT) theo hệ số luật lao động (1.5 ngày thường, 2.0 cuối tuần, 3.0 lễ/tết).
 */
export function computeOvertimePay({
  baseSalary = 0,
  standardHours = 160,
  otHours = 0,
  multiplier = 1.5,
} = {}) {
  const std = Math.max(1, Number(standardHours) || 160);
  const hourly = Math.max(0, Number(baseSalary) || 0) / std;
  const hrs = Math.max(0, Number(otHours) || 0);
  const mult = Math.max(1, Number(multiplier) || 1.5);
  return Math.round(hourly * hrs * mult);
}

/* ══════════════════ 3. GPS GEOFENCING & QR CHẤM CÔNG ĐỘNG ══════════════════ */

/**
 * Tính khoảng cách giữa 2 tọa độ GPS (đơn vị: mét) theo công thức Haversine.
 */
export function haversineDistanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (Number(deg) * Math.PI) / 180;
  const R = 6_371_000; // bán kính trái đất (mét)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Đánh giá nhân viên có nằm trong bán kính chấm công văn phòng hay không.
 */
export function evaluateGeofence(lat, lng, attendanceSettings = {}) {
  const officeLat = Number(attendanceSettings.office_lat ?? 21.028511);
  const officeLng = Number(attendanceSettings.office_lng ?? 105.804817);
  const radius = Math.max(20, Number(attendanceSettings.radius_meters ?? 250));
  const enforce = Boolean(attendanceSettings.enforce_geofence);

  if (lat === null || lat === undefined || lng === null || lng === undefined || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
    return {
      withinRadius: !enforce,
      distanceMeters: null,
      radiusMeters: radius,
      enforce,
      message: enforce ? "Thiếu tọa độ GPS để xác thực vị trí chấm công" : "Chấm công không kèm GPS",
    };
  }

  const distanceMeters = haversineDistanceMeters(Number(lat), Number(lng), officeLat, officeLng);
  const withinRadius = distanceMeters <= radius;
  return {
    withinRadius: enforce ? withinRadius : true,
    isInsideFence: withinRadius,
    distanceMeters,
    radiusMeters: radius,
    enforce,
    message: withinRadius
      ? `Hợp lệ (cách văn phòng ${distanceMeters}m / giới hạn ${radius}m)`
      : `Ngoài phạm vi chấm công (${distanceMeters}m > giới hạn ${radius}m)`,
  };
}

function signQrSlot(slot, secret) {
  return crypto
    .createHmac("sha256", String(secret || "sme-qr-attendance-secret"))
    .update(`SME-ATTENDANCE-SLOT:${slot}`)
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
}

/**
 * Tạo mã QR chấm công xoay vòng theo thời gian (chống chụp ảnh gửi hộ).
 */
export function generateAttendanceQrToken({
  secret = process.env.JWT_SECRET || "sme-qr-attendance-secret",
  now = Date.now(),
  rotationSeconds = 120,
} = {}) {
  const stepMs = Math.max(30, Number(rotationSeconds) || 120) * 1000;
  const slot = Math.floor(Number(now) / stepMs);
  const sig = signQrSlot(slot, secret);
  const token = `SMEQR-${slot}-${sig}`;
  const expiresAt = new Date((slot + 1) * stepMs);
  return {
    token,
    slot,
    rotationSeconds: Math.round(stepMs / 1000),
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Xác thực mã QR chấm công (chấp nhận khe thời gian hiện tại và +/- 1 khe liền kề để tránh lệch đồng hồ).
 */
export function verifyAttendanceQrToken(
  token = "",
  {
    secret = process.env.JWT_SECRET || "sme-qr-attendance-secret",
    now = Date.now(),
    rotationSeconds = 120,
  } = {}
) {
  const clean = String(token || "").trim().toUpperCase();
  const parts = clean.split("-");
  if (parts.length !== 3 || parts[0] !== "SMEQR") {
    return { valid: false, message: "Định dạng mã QR chấm công không hợp lệ" };
  }
  const tokenSlot = Number(parts[1]);
  const sig = parts[2];
  if (!Number.isInteger(tokenSlot)) {
    return { valid: false, message: "Mã QR chấm công không hợp lệ" };
  }

  const stepMs = Math.max(30, Number(rotationSeconds) || 120) * 1000;
  const currentSlot = Math.floor(Number(now) / stepMs);
  if (Math.abs(currentSlot - tokenSlot) > 1) {
    return { valid: false, message: "Mã QR chấm công đã hết hạn, vui lòng quét mã mới tại quầy" };
  }

  const expected = signQrSlot(tokenSlot, secret);
  if (sig !== expected) {
    return { valid: false, message: "Chữ ký mã QR chấm công không khớp" };
  }

  return { valid: true, slot: tokenSlot, message: "Xác thực QR chấm công thành công" };
}
