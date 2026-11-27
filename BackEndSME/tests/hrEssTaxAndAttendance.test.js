import test from "node:test";
import assert from "node:assert/strict";
import {
  computeVietnamProgressivePit,
  computeVietnamTaxAndInsurance,
  computeLeaveDaysBetween,
  computeOvertimePay,
  haversineDistanceMeters,
  evaluateGeofence,
  generateAttendanceQrToken,
  verifyAttendanceQrToken,
} from "../utils/hrEssEngine.js";
import { computeKpiPayrollRow } from "../utils/payrollCalculator.js";

test("Vietnam PIT - computes 7-bracket progressive personal income tax accurately", () => {
  assert.equal(computeVietnamProgressivePit(0), 0);
  // Bracket 1: 5M * 5% = 250k
  assert.equal(computeVietnamProgressivePit(5_000_000), 250_000);
  // Bracket 2: 250k + 5M * 10% = 750k
  assert.equal(computeVietnamProgressivePit(10_000_000), 750_000);
  // Bracket 3: 750k + 5M * 15% = 1,500,000 for 15M taxable
  assert.equal(computeVietnamProgressivePit(15_000_000), 1_500_000);
});

test("Vietnam Social Insurance & PIT - applies insurance cap and dependent deductions", () => {
  const res = computeVietnamTaxAndInsurance({
    grossIncome: 30_000_000,
    baseSalaryForInsurance: 20_000_000,
    dependents: 1,
    config: {
      BHXH_NLD_PCT: 8,
      BHYT_NLD_PCT: 1.5,
      BHTN_NLD_PCT: 1,
      BH_DN_PCT: 21.5,
      MUC_TRAN_BHXH: 46_800_000,
      GIAM_TRU_BAN_THAN: 11_000_000,
      GIAM_TRU_PHU_THUOC: 4_400_000,
    },
  });

  // 10.5% of 20M = 2.1M
  assert.equal(res.tong_bh_nld, 2_100_000);
  // 21.5% of 20M = 4.3M
  assert.equal(res.tong_bh_dn, 4_300_000);
  // Deduction: 11M + 4.4M = 15.4M -> Taxable: 30M - 2.1M - 15.4M = 12.5M
  assert.equal(res.thu_nhap_tinh_thue, 12_500_000);
  // Tax on 12.5M = 250k + 500k + 2.5M * 15% (375k) = 1,125,000
  assert.equal(res.thue_tncn, 1_125_000);
});

test("HR ESS - leave days calculation and overtime pay with multiplier", () => {
  assert.equal(computeLeaveDaysBetween("2026-11-10", "2026-11-12", false), 3);
  assert.equal(computeLeaveDaysBetween("2026-11-10", "2026-11-10", true), 0.5);
  // Base 16M / 160h = 100k/h * 4h * 2.0 (weekend) = 800k
  assert.equal(
    computeOvertimePay({ baseSalary: 16_000_000, standardHours: 160, otHours: 4, multiplier: 2.0 }),
    800_000
  );
});

test("PayrollCalculator - integrates OT pay, excused late days, BHXH and PIT when enabled", () => {
  const row = computeKpiPayrollRow({
    ma_nv: "NV02",
    nv: { ho_ten: "Trần Thị B", chuc_vu: { heSoluong: 20 }, so_nguoi_phu_thuoc: 1 },
    thang: 11,
    nam: 2026,
    so_ngay_cong: 22,
    tong_gio_lam: 160,
    so_ngay_di_tre: 3,
    excused_late_days: 2, // 2 buổi có đơn duyệt -> chỉ phạt 1 buổi (50k)
    ot_hours: 4,
    ot_weighted_hours: 6, // 4h * 1.5
    config: {
      ENABLE_SOCIAL_INSURANCE: true,
    },
  });

  // Base 20M -> hourly 125k -> OT 6 weighted hours = 750k
  assert.equal(row.luong_tang_ca, 750_000);
  assert.equal(row.khau_tru_di_tre, 50_000);
  assert.equal(row.tong_thu_nhap_gross, 20_700_000);
  assert.equal(row.tong_bh_nld, 2_100_000);
  assert.ok(row.thue_tncn > 0);
  assert.equal(row.luong_thuc_nhan, row.tong_thu_nhap_gross - row.tong_bh_nld - row.thue_tncn);
});

test("Smart Attendance - Haversine geofence and rotating HMAC QR token verification", () => {
  const distSame = haversineDistanceMeters(21.028511, 105.804817, 21.028511, 105.804817);
  assert.equal(distSame, 0);

  const inside = evaluateGeofence(21.0289, 105.8049, {
    office_lat: 21.028511,
    office_lng: 105.804817,
    radius_meters: 250,
    enforce_geofence: true,
  });
  assert.equal(inside.withinRadius, true);

  const farAway = evaluateGeofence(10.776889, 106.700806, {
    office_lat: 21.028511,
    office_lng: 105.804817,
    radius_meters: 250,
    enforce_geofence: true,
  });
  assert.equal(farAway.withinRadius, false);

  const now = 1_700_000_000_000;
  const qr = generateAttendanceQrToken({ secret: "test-secret", now, rotationSeconds: 120 });
  assert.equal(verifyAttendanceQrToken(qr.token, { secret: "test-secret", now, rotationSeconds: 120 }).valid, true);
  // Expired after 10 minutes
  assert.equal(
    verifyAttendanceQrToken(qr.token, { secret: "test-secret", now: now + 600_000, rotationSeconds: 120 }).valid,
    false
  );
  // Tampered signature
  assert.equal(
    verifyAttendanceQrToken(`${qr.token.slice(0, -4)}FFFF`, { secret: "test-secret", now, rotationSeconds: 120 }).valid,
    false
  );
});
