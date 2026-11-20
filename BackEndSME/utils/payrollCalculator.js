/**
 * Pure KPI Payroll Calculation Helpers (zero external dependencies)
 * Tính toán cấu phần lương KPI: Lương cơ bản theo giờ + Hoa hồng kinh doanh + Lương khoán sản xuất - Khấu trừ đi muộn.
 */

export const DEFAULT_PAYROLL_KPI_CONFIG = {
  GIO_TIEU_CHUAN: 160,
  LUONG_CO_SO: 1_000_000,
  TY_LE_HOA_HONG_KD: 0.02, // 2% doanh thu thuần đơn bán hoàn thành
  DON_GIA_KHOAN_SX: 50_000, // 50.000đ / thành phẩm hoàn thành đạt chuẩn
  MUC_PHAT_DI_TRE: 50_000, // 50.000đ / buổi đi trễ
};

/**
 * Tính toán chi tiết bảng lương KPI cho 1 nhân viên.
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
  don_gia_gio_override = null,
  thuong_khac = 0,
  phat_khac = 0,
  doanh_so_ban_hang = 0,
  san_luong_sx = 0,
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

  // 1. Hoa hồng kinh doanh (2% doanh thu đơn bán hoàn thành)
  const doanhSo = Math.max(0, Number(doanh_so_ban_hang) || 0);
  const hoa_hong_kd = Math.round(doanhSo * cfg.TY_LE_HOA_HONG_KD);

  // 2. Thưởng năng suất / Lương khoán sản xuất
  const sanLuong = Math.max(0, Number(san_luong_sx) || 0);
  const thuong_nang_suat_sx = Math.round(sanLuong * cfg.DON_GIA_KHOAN_SX);

  // 3. Khấu trừ đi muộn tự động
  const soBuoiTre = Math.max(0, Number(so_ngay_di_tre) || 0);
  const khau_tru_di_tre = Math.round(soBuoiTre * cfg.MUC_PHAT_DI_TRE);

  const thuongKhac = Number(thuong_khac) || 0;
  const phatKhac = Number(phat_khac) || 0;

  const thuong = thuongKhac + hoa_hong_kd + thuong_nang_suat_sx;
  const phat = phatKhac + khau_tru_di_tre;
  const luong_thuc_nhan = luong_theo_cong + thuong - phat;

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
    ghi_chu,
    luong_thuc_nhan,
  };
}
