/**
 * Pure KPI Payroll Calculation Helpers (zero external dependencies)
 * Tính toán cấu phần lương KPI: Lương cơ bản theo giờ + Tăng ca OT + Hoa hồng KD + Lương khoán SX
 * - Khấu trừ đi muộn (trừ ngày đã có đơn duyệt) - BHXH/BHYT/BHTN & Thuế TNCN lũy tiến 7 bậc VN.
 */

import { computeVietnamTaxAndInsurance, computeOvertimePay } from "./hrEssEngine.js";

export const DEFAULT_PAYROLL_KPI_CONFIG = {
  GIO_TIEU_CHUAN: 160,
  LUONG_CO_SO: 1_000_000,
  TY_LE_HOA_HONG_KD: 0.02, // 2% doanh thu thuần đơn bán hoàn thành
  DON_GIA_KHOAN_SX: 50_000, // 50.000đ / thành phẩm hoàn thành đạt chuẩn
  MUC_PHAT_DI_TRE: 50_000, // 50.000đ / buổi đi trễ
  // Mặc định tắt khi gọi trực tiếp không truyền config để giữ tương thích ngược 100% các test cũ;
  // LuongDAO sẽ đọc bật/tắt động từ SystemSettingsDAO (company_settings).
  ENABLE_SOCIAL_INSURANCE: false,
  BHXH_NLD_PCT: 8,
  BHYT_NLD_PCT: 1.5,
  BHTN_NLD_PCT: 1,
  BH_DN_PCT: 21.5,
  MUC_TRAN_BHXH: 46_800_000,
  GIAM_TRU_BAN_THAN: 11_000_000,
  GIAM_TRU_PHU_THUOC: 4_400_000,
};

/**
 * Tính toán chi tiết bảng lương KPI + OT + BHXH/Thuế TNCN cho 1 nhân viên.
 * @param {object} params
 */
export function computeKpiPayrollRow({
  ma_nv,
  nv = {},
  thang,
  nam,
  so_ngay_cong = 0,
  tong_gio_lam = 0,
  so_ngay_di_tre = 0,
  excused_late_days = 0,
  ot_hours = 0,
  ot_weighted_hours = 0,
  don_gia_gio_override = null,
  thuong_khac = 0,
  phat_khac = 0,
  doanh_so_ban_hang = 0,
  san_luong_sx = 0,
  so_nguoi_phu_thuoc = null,
  ghi_chu = null,
  config = DEFAULT_PAYROLL_KPI_CONFIG,
}) {
  const cfg = { ...DEFAULT_PAYROLL_KPI_CONFIG, ...config };
  const heSoluong = Math.max(0, Number(nv?.chuc_vu?.heSoluong ?? 1)) || 1;
  const luong_co_ban = Math.round(heSoluong * cfg.LUONG_CO_SO);
  const ty_le_lam_viec = Math.min(1, Number(tong_gio_lam || 0) / cfg.GIO_TIEU_CHUAN);

  const luong_theo_cong =
    don_gia_gio_override !== null && don_gia_gio_override !== undefined
      ? Math.round(Number(don_gia_gio_override) * Number(tong_gio_lam || 0))
      : Math.round(luong_co_ban * ty_le_lam_viec);

  // 1. Hoa hồng kinh doanh (mặc định 2% doanh thu đơn bán hoàn thành)
  const doanhSo = Math.max(0, Number(doanh_so_ban_hang) || 0);
  const hoa_hong_kd = Math.round(doanhSo * cfg.TY_LE_HOA_HONG_KD);

  // 2. Thưởng năng suất / Lương khoán sản xuất
  const sanLuong = Math.max(0, Number(san_luong_sx) || 0);
  const thuong_nang_suat_sx = Math.round(sanLuong * cfg.DON_GIA_KHOAN_SX);

  // 3. Lương tăng ca OT (từ đơn OT đã duyệt)
  const otHoursNum = Math.max(0, Number(ot_hours) || 0);
  const otWeightedNum = Math.max(0, Number(ot_weighted_hours) || 0);
  const luong_tang_ca =
    otWeightedNum > 0
      ? computeOvertimePay({
          baseSalary: luong_co_ban,
          standardHours: cfg.GIO_TIEU_CHUAN,
          otHours: otWeightedNum,
          multiplier: 1,
        })
      : computeOvertimePay({
          baseSalary: luong_co_ban,
          standardHours: cfg.GIO_TIEU_CHUAN,
          otHours: otHoursNum,
          multiplier: 1.5,
        });

  // 4. Khấu trừ đi muộn tự động (miễn các buổi đã có đơn đi muộn được duyệt)
  const soBuoiTre = Math.max(0, Number(so_ngay_di_tre) || 0);
  const soBuoiMienPhat = Math.max(0, Number(excused_late_days) || 0);
  const soBuoiTreTinhPhat = Math.max(0, soBuoiTre - soBuoiMienPhat);
  const khau_tru_di_tre = Math.round(soBuoiTreTinhPhat * cfg.MUC_PHAT_DI_TRE);

  const thuongKhac = Number(thuong_khac) || 0;
  const phatKhac = Number(phat_khac) || 0;

  const thuong = thuongKhac + hoa_hong_kd + thuong_nang_suat_sx + luong_tang_ca;
  const phat = phatKhac + khau_tru_di_tre;
  const tong_thu_nhap_gross = Math.max(0, luong_theo_cong + thuong - phat);

  // 5. BHXH / BHYT / BHTN & Thuế TNCN lũy tiến (nếu bật trong cấu hình)
  const dependents =
    so_nguoi_phu_thuoc !== null && so_nguoi_phu_thuoc !== undefined
      ? Number(so_nguoi_phu_thuoc)
      : Number(nv?.so_nguoi_phu_thuoc || 0);

  const taxIns = cfg.ENABLE_SOCIAL_INSURANCE
    ? computeVietnamTaxAndInsurance({
        grossIncome: tong_thu_nhap_gross,
        baseSalaryForInsurance: luong_co_ban,
        dependents,
        config: cfg,
      })
    : {
        muc_dong_bh: 0,
        bhxh_nld: 0,
        bhyt_nld: 0,
        bhtn_nld: 0,
        tong_bh_nld: 0,
        tong_bh_dn: 0,
        so_nguoi_phu_thuoc: dependents,
        tong_giam_tru: 0,
        thu_nhap_tinh_thue: 0,
        thue_tncn: 0,
        tong_khau_tru_luat: 0,
      };

  const luong_thuc_nhan = Math.max(0, tong_thu_nhap_gross - taxIns.tong_khau_tru_luat);

  return {
    ma_nv,
    ho_ten: nv?.ho_ten || null,
    phong_ban: nv?.phong_ban?.ten || null,
    chuc_vu: nv?.chuc_vu?.ten || null,
    thang,
    nam,
    so_ngay_cong,
    tong_gio_lam,
    so_ngay_di_tre: soBuoiTre,
    so_ngay_di_tre_mien_phat: soBuoiMienPhat,
    so_gio_ot: otHoursNum,
    luong_tang_ca,
    he_so_luong: heSoluong,
    luong_co_ban,
    luong_theo_cong,
    don_gia_gio_override,
    doanh_so_ban_hang: doanhSo,
    hoa_hong_kd,
    san_luong_sx: sanLuong,
    thuong_nang_suat_sx,
    khau_tru_di_tre,
    thuong_khac: thuongKhac,
    phat_khac: phatKhac,
    thuong,
    phat,
    tong_thu_nhap_gross,
    bhxh_nld: taxIns.bhxh_nld,
    bhyt_nld: taxIns.bhyt_nld,
    bhtn_nld: taxIns.bhtn_nld,
    tong_bh_nld: taxIns.tong_bh_nld,
    tong_bh_dn: taxIns.tong_bh_dn,
    thue_tncn: taxIns.thue_tncn,
    ghi_chu,
    luong_thuc_nhan,
  };
}
