"use server";

import { http } from "@/lib/http";

export interface SystemSettingsData {
  _id?: string;
  company: {
    ten_cong_ty: string;
    ten_viet_tat: string;
    ma_so_thue: string;
    dia_chi: string;
    so_dien_thoai: string;
    email: string;
    website: string;
    logo_url: string;
    thue_vat_mac_dinh: number;
  };
  vietqr: {
    bank_bin: string;
    account_number: string;
    account_name: string;
    template: string;
  };
  payroll: {
    gio_tieu_chuan: number;
    luong_co_so: number;
    ty_le_hoa_hong_kd: number;
    don_gia_khoan_sx: number;
    muc_phat_di_tre: number;
    enable_social_insurance: boolean;
    bhxh_nld_pct: number;
    bhyt_nld_pct: number;
    bhtn_nld_pct: number;
    bh_dn_pct: number;
    muc_tran_bhxh: number;
    giam_tru_ban_than: number;
    giam_tru_phu_thuoc: number;
    annual_leave_days_default: number;
  };
  loyalty: {
    enabled: boolean;
    vnd_per_point: number;
    vnd_per_redeem_point: number;
    max_redeem_pct: number;
    tier_silver: number;
    tier_gold: number;
    tier_platinum: number;
  };
  attendance: {
    work_start_time: string;
    work_end_time: string;
    office_lat: number;
    office_lng: number;
    radius_meters: number;
    qr_rotation_seconds: number;
    enforce_geofence: boolean;
  };
  integrations: {
    einvoice_provider: string;
    einvoice_mode: string;
    einvoice_series: string;
    logistics_default_carrier: string;
    logistics_mode: string;
    sepay_enabled: boolean;
  };
  updated_at?: string | null;
}

export async function fetchSystemSettingsAction(): Promise<{
  success: boolean;
  data?: SystemSettingsData;
  error?: string;
}> {
  try {
    const res = await http.get<{ data: SystemSettingsData }>("/settings");
    return { success: true, data: res?.data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Không thể tải cấu hình hệ thống";
    return { success: false, error: msg };
  }
}

export async function updateSystemSettingsAction(
  payload: Partial<SystemSettingsData>
): Promise<{ success: boolean; data?: SystemSettingsData; error?: string }> {
  try {
    const res = await http.put<{ data: SystemSettingsData }>("/settings", payload);
    return { success: true, data: res?.data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Không thể lưu cấu hình hệ thống";
    return { success: false, error: msg };
  }
}
