"use server";

import { http } from "@/lib/http";

/* ── Types ─────────────────────────────────────────────────────────────────── */

export type ForecastItem = {
  san_pham_id: string;
  ma_sp: string;
  ten_sp: string;
  don_gia: number;
  ton_kho: number;
  avg_monthly: number;
  forecast_t1: number;
  forecast_t2: number;
  forecast_t3: number;
  trang_thai_kho: "thieu_hut" | "can_nhap" | "du" | "du_thua";
  monthly_qty: number[];
  periods: string[];
};

export type MRPItem = {
  nguyen_lieu_id: string;
  ma_nl: string;
  ten_nl: string;
  don_vi: string;
  ton_kho_nl: number;
  tong_can: number;
  can_nhap: number;
  gia_nhap: number;
  du_kien_chi: number;
  suggested_order_date: string;
  da_du: boolean;
  san_pham_can: Array<{
    ma_sp: string;
    ten_sp: string;
    net_sp: number;
    nl_cho_sp: number;
  }>;
};

export type ABCItem = {
  rank: number;
  san_pham_id: string;
  ma_sp: string;
  ten_sp: string;
  total_revenue: number;
  total_qty: number;
  revenue_pct: number;
  cumulative_pct: number;
  abc_class: "A" | "B" | "C";
  monthly_revenue: number[];
};

export type AlertsData = {
  low_stock_sp: Array<{
    id: string;
    ma: string;
    ten: string;
    so_luong: number;
    ton_toi_thieu: number;
    thieu: number;
    loai: "san_pham";
  }>;
  low_stock_nl: Array<{
    id: string;
    ma: string;
    ten: string;
    so_luong: number;
    ton_toi_thieu: number;
    thieu: number;
    don_vi: string;
    loai: "nguyen_lieu";
  }>;
  slow_moving: Array<{
    id: string;
    ma: string;
    ten: string;
    so_luong: number;
    don_gia: number;
    gia_tri_ton: number;
  }>;
  turnover: Array<{
    san_pham_id: string;
    ma_sp: string;
    ten_sp: string;
    total_qty: number;
    ton_kho: number;
    turnover: number;
    days_on_hand: number | null;
  }>;
  summary: {
    tong_sp_thieu: number;
    tong_nl_thieu: number;
    tong_hang_u_dong: number;
    gia_tri_hang_u_dong: number;
  };
};

/* ── Server Actions ─────────────────────────────────────────────────────────── */

export async function fetchForecastAction(
  months = 6
): Promise<{ success: boolean; items: ForecastItem[]; error?: string }> {
  try {
    const res: any = await http.get(`/planning/forecast?months=${months}`);
    const items: ForecastItem[] = res?.data ?? res ?? [];
    return { success: true, items };
  } catch (e: any) {
    return { success: false, items: [], error: e?.message ?? "Lỗi tải dự báo" };
  }
}

export async function fetchMRPAction(
  lead_time = 7
): Promise<{ success: boolean; items: MRPItem[]; error?: string }> {
  try {
    const res: any = await http.get(`/planning/mrp?lead_time=${lead_time}`);
    const items: MRPItem[] = res?.data ?? res ?? [];
    return { success: true, items };
  } catch (e: any) {
    return { success: false, items: [], error: e?.message ?? "Lỗi tải MRP" };
  }
}

export async function fetchABCAction(
  months = 6
): Promise<{ success: boolean; items: ABCItem[]; error?: string }> {
  try {
    const res: any = await http.get(`/planning/abc?months=${months}`);
    const items: ABCItem[] = res?.data ?? res ?? [];
    return { success: true, items };
  } catch (e: any) {
    return { success: false, items: [], error: e?.message ?? "Lỗi tải ABC" };
  }
}

export async function fetchAlertsAction(
  months = 6
): Promise<{ success: boolean; data: AlertsData | null; error?: string }> {
  try {
    const res: any = await http.get(`/planning/alerts?months=${months}`);
    const data: AlertsData = res?.data ?? res ?? null;
    return { success: true, data };
  } catch (e: any) {
    return { success: false, data: null, error: e?.message ?? "Lỗi tải cảnh báo" };
  }
}
