/**
 * SystemSettingsDAO — Quản lý cấu hình doanh nghiệp & tham số nghiệp vụ tập trung.
 * Thay thế các hằng số hardcode (thông tin công ty, VietQR, tham số lương KPI, Loyalty, chấm công GPS/QR, tích hợp).
 */

import logger from "../utils/logger.js";
import { setRuntimeSettings } from "../utils/runtimeSettingsStore.js";
import { DEFAULT_PAYROLL_KPI_CONFIG } from "../utils/payrollCalculator.js";
import { DEFAULT_LOYALTY_CONFIG } from "../utils/promotionEngine.js";

export const SETTINGS_DOC_ID = "company_settings_default";

export const DEFAULT_SYSTEM_SETTINGS = {
  _id: SETTINGS_DOC_ID,
  company: {
    ten_cong_ty: "CÔNG TY TNHH SME ERP VIỆT NAM",
    ten_viet_tat: "SME ERP",
    ma_so_thue: "0109876543",
    dia_chi: "Tầng 5, Tòa nhà Doanh Nghiệp, Cầu Giấy, Hà Nội",
    so_dien_thoai: "024 3999 8888",
    email: "contact@sme-erp.vn",
    website: "https://sme-erp.vn",
    logo_url: "",
    thue_vat_mac_dinh: 8,
  },
  vietqr: {
    bank_bin: process.env.PAYMENT_BANK_BIN || process.env.VIETQR_BANK_ID || "MB",
    account_number: process.env.PAYMENT_ACCOUNT_NO || process.env.VIETQR_ACCOUNT_NO || "0987654321",
    account_name: process.env.PAYMENT_ACCOUNT_NAME || process.env.VIETQR_ACCOUNT_NAME || "CONG TY SME ERP",
    template: "compact2",
  },
  payroll: {
    gio_tieu_chuan: DEFAULT_PAYROLL_KPI_CONFIG.GIO_TIEU_CHUAN,
    luong_co_so: DEFAULT_PAYROLL_KPI_CONFIG.LUONG_CO_SO,
    ty_le_hoa_hong_kd: DEFAULT_PAYROLL_KPI_CONFIG.TY_LE_HOA_HONG_KD,
    don_gia_khoan_sx: DEFAULT_PAYROLL_KPI_CONFIG.DON_GIA_KHOAN_SX,
    muc_phat_di_tre: DEFAULT_PAYROLL_KPI_CONFIG.MUC_PHAT_DI_TRE,
    // Tham số bảo hiểm & thuế TNCN (dùng cho Giai đoạn 2)
    enable_social_insurance: true,
    bhxh_nld_pct: 8,
    bhyt_nld_pct: 1.5,
    bhtn_nld_pct: 1,
    bh_dn_pct: 21.5,
    muc_tran_bhxh: 46_800_000,
    giam_tru_ban_than: 11_000_000,
    giam_tru_phu_thuoc: 4_400_000,
    annual_leave_days_default: 12,
  },
  loyalty: {
    ...DEFAULT_LOYALTY_CONFIG,
  },
  attendance: {
    work_start_time: "08:00",
    work_end_time: "17:30",
    office_lat: 21.028511,
    office_lng: 105.804817,
    radius_meters: 250,
    qr_rotation_seconds: 120,
    enforce_geofence: false,
  },
  integrations: {
    einvoice_provider: "mock", // "mock" | "misa" | "vnpt" | "viettel"
    einvoice_mode: process.env.EINVOICE_MODE || "mock",
    einvoice_series: `1C${String(new Date().getFullYear()).slice(-2)}TMM`,
    logistics_default_carrier: "GHN",
    logistics_mode: "sandbox", // "sandbox" | "live"
    sepay_enabled: false,
  },
};

let settingsCol = null;
let cachedSettings = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 30_000;

function mergeSettings(stored = {}) {
  return {
    _id: SETTINGS_DOC_ID,
    company: { ...DEFAULT_SYSTEM_SETTINGS.company, ...(stored.company || {}) },
    vietqr: { ...DEFAULT_SYSTEM_SETTINGS.vietqr, ...(stored.vietqr || {}) },
    payroll: { ...DEFAULT_SYSTEM_SETTINGS.payroll, ...(stored.payroll || {}) },
    loyalty: { ...DEFAULT_SYSTEM_SETTINGS.loyalty, ...(stored.loyalty || {}) },
    attendance: { ...DEFAULT_SYSTEM_SETTINGS.attendance, ...(stored.attendance || {}) },
    integrations: { ...DEFAULT_SYSTEM_SETTINGS.integrations, ...(stored.integrations || {}) },
    updated_at: stored.updated_at || null,
    updated_by: stored.updated_by || null,
  };
}

export default class SystemSettingsDAO {
  static async injectDB(conn) {
    if (settingsCol) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
    if (!dbName) throw new Error("SystemSettingsDAO.injectDB: missing SME_DB_NAME env var");
    settingsCol = conn.db(dbName).collection("company_settings");

    try {
      const existing = await settingsCol.findOne({ _id: SETTINGS_DOC_ID });
      if (!existing) {
        await settingsCol.insertOne({
          ...DEFAULT_SYSTEM_SETTINGS,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
      cachedSettings = mergeSettings(existing || DEFAULT_SYSTEM_SETTINGS);
      setRuntimeSettings(cachedSettings);
      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    } catch (err) {
      logger.warn("SystemSettingsDAO init warning", { error: err.message });
    }
  }

  /**
   * Trả về bản cấu hình đồng bộ từ bộ nhớ đệm (dùng cho helper đồng bộ như PaymentService).
   */
  static getCachedSync() {
    return cachedSettings || mergeSettings({});
  }

  /**
   * Lấy cấu hình hệ thống hiện tại (có cache 30s).
   */
  static async getSettings({ bypassCache = false } = {}) {
    if (!bypassCache && cachedSettings && Date.now() < cacheExpiresAt) {
      return cachedSettings;
    }
    if (!settingsCol) {
      return mergeSettings({});
    }
    try {
      const doc = await settingsCol.findOne({ _id: SETTINGS_DOC_ID });
      const merged = mergeSettings(doc || {});
      cachedSettings = merged;
      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      return merged;
    } catch (err) {
      logger.error("SystemSettingsDAO.getSettings error", { error: err.message });
      return cachedSettings || mergeSettings({});
    }
  }

  /**
   * Cập nhật từng phân mục cấu hình (chỉ cho phép các section hợp lệ).
   */
  static async updateSettings(patch = {}, user = null) {
    if (!settingsCol) {
      return { error: new Error("SystemSettingsDAO chưa được khởi tạo") };
    }
    try {
      const current = await this.getSettings({ bypassCache: true });
      const allowedSections = ["company", "vietqr", "payroll", "loyalty", "attendance", "integrations"];
      const next = { ...current };

      for (const section of allowedSections) {
        if (patch[section] && typeof patch[section] === "object") {
          next[section] = {
            ...current[section],
            ...patch[section],
          };
        }
      }

      // Chuẩn hóa kiểu số cho các trường quan trọng
      next.company.thue_vat_mac_dinh = Math.min(30, Math.max(0, Number(next.company.thue_vat_mac_dinh ?? 8)));
      next.payroll.gio_tieu_chuan = Math.max(1, Number(next.payroll.gio_tieu_chuan) || 160);
      next.payroll.luong_co_so = Math.max(0, Number(next.payroll.luong_co_so) || 1_000_000);
      next.payroll.ty_le_hoa_hong_kd = Math.min(1, Math.max(0, Number(next.payroll.ty_le_hoa_hong_kd) || 0));
      next.payroll.don_gia_khoan_sx = Math.max(0, Number(next.payroll.don_gia_khoan_sx) || 0);
      next.payroll.muc_phat_di_tre = Math.max(0, Number(next.payroll.muc_phat_di_tre) || 0);
      next.loyalty.vnd_per_point = Math.max(100, Number(next.loyalty.vnd_per_point) || 10_000);
      next.loyalty.vnd_per_redeem_point = Math.max(1, Number(next.loyalty.vnd_per_redeem_point) || 1_000);
      next.loyalty.max_redeem_pct = Math.min(100, Math.max(0, Number(next.loyalty.max_redeem_pct) || 50));
      next.attendance.radius_meters = Math.max(20, Number(next.attendance.radius_meters) || 250);

      const now = new Date();
      const updatedBy = user
        ? {
            user_id: String(user._id || user.id || ""),
            ho_ten: user.ho_ten || user.tai_khoan || "Admin",
          }
        : null;

      await settingsCol.updateOne(
        { _id: SETTINGS_DOC_ID },
        {
          $set: {
            company: next.company,
            vietqr: next.vietqr,
            payroll: next.payroll,
            loyalty: next.loyalty,
            attendance: next.attendance,
            integrations: next.integrations,
            updated_at: now,
            updated_by: updatedBy,
          },
          $setOnInsert: { created_at: now },
        },
        { upsert: true }
      );

      cachedSettings = mergeSettings({ ...next, updated_at: now, updated_by: updatedBy });
      setRuntimeSettings(cachedSettings);
      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      return { ok: true, data: cachedSettings };
    } catch (err) {
      logger.error("SystemSettingsDAO.updateSettings error", { error: err.message });
      return { error: err };
    }
  }

  /**
   * Trả về cấu hình KPI payroll định dạng tương thích với payrollCalculator.js.
   */
  static async getPayrollKpiConfig() {
    const s = await this.getSettings();
    const p = s.payroll || {};
    return {
      GIO_TIEU_CHUAN: Number(p.gio_tieu_chuan) || DEFAULT_PAYROLL_KPI_CONFIG.GIO_TIEU_CHUAN,
      LUONG_CO_SO: Number(p.luong_co_so) || DEFAULT_PAYROLL_KPI_CONFIG.LUONG_CO_SO,
      TY_LE_HOA_HONG_KD: Number(p.ty_le_hoa_hong_kd ?? DEFAULT_PAYROLL_KPI_CONFIG.TY_LE_HOA_HONG_KD),
      DON_GIA_KHOAN_SX: Number(p.don_gia_khoan_sx ?? DEFAULT_PAYROLL_KPI_CONFIG.DON_GIA_KHOAN_SX),
      MUC_PHAT_DI_TRE: Number(p.muc_phat_di_tre ?? DEFAULT_PAYROLL_KPI_CONFIG.MUC_PHAT_DI_TRE),
      ENABLE_SOCIAL_INSURANCE: Boolean(p.enable_social_insurance ?? true),
      BHXH_NLD_PCT: Number(p.bhxh_nld_pct ?? 8),
      BHYT_NLD_PCT: Number(p.bhyt_nld_pct ?? 1.5),
      BHTN_NLD_PCT: Number(p.bhtn_nld_pct ?? 1),
      BH_DN_PCT: Number(p.bh_dn_pct ?? 21.5),
      MUC_TRAN_BHXH: Number(p.muc_tran_bhxh ?? 46_800_000),
      GIAM_TRU_BAN_THAN: Number(p.giam_tru_ban_than ?? 11_000_000),
      GIAM_TRU_PHU_THUOC: Number(p.giam_tru_phu_thuoc ?? 4_400_000),
    };
  }
}
