"use server";

import { http } from "@/lib/http";

export interface EcommercePolicy {
  code: string;
  name: string;
  logo_color: string;
  phi_thanh_toan_pct: number;
  phi_co_dinh_pct: number;
  phi_dich_vu_pct: number;
  phi_dich_vu_cap?: number;
  phi_affiliate_koc_pct?: number;
  phi_dong_goi_co_dinh: number;
  ty_le_hoan_du_kien_pct: number;
  chi_phi_van_chuyen_hoan: number;
  thue_vat_tncn_pct: number;
  mo_ta: string;
}

export interface PricingBreakdown {
  kenh_ban: string;
  kenh_ten: string;
  gia_niem_yet: number;
  gia_von: number;
  chi_tiet_phi: {
    phi_thanh_toan: number;
    phi_hoa_hong: number;
    phi_dich_vu: number;
    phi_affiliate: number;
    tong_phi_san: number;
    ty_le_phi_san_pct: number;
    phi_dong_goi: number;
    rui_ro_hoan_hang: number;
    tong_khau_hao: number;
  };
  doanh_thu_thuc_nhan: number;
  loi_nhuan_rong: number;
  margin_pct: number;
  danh_gia: "excellent" | "safe" | "warning" | "danger";
  danh_gia_label: string;
}

export interface OmnichannelComparison {
  direct: PricingBreakdown;
  shopee: PricingBreakdown;
  tiktok: PricingBreakdown;
  lazada: PricingBreakdown;
}

export interface ProductPricingMatrixItem {
  id: string;
  ma_sp: string;
  ten_sp: string;
  ton_kho: number;
  gia_niem_yet: number;
  gia_von_uoc_tinh: number;
  channels: OmnichannelComparison;
}

/* ── Actions ─────────────────────────────────────────────────────────────── */

export async function fetchEcommercePoliciesAction(): Promise<{
  success: boolean;
  data: Record<string, EcommercePolicy> | null;
  error?: string;
}> {
  try {
    const res: any = await http.get("/planning/ecommerce/policies");
    const data = res?.data ?? res ?? null;
    return { success: true, data };
  } catch (e: any) {
    return { success: false, data: null, error: e?.message ?? "Lỗi tải chính sách sàn TMĐT" };
  }
}

export async function calculateEcommercePricingAction(payload: {
  gia_niem_yet: number;
  gia_von: number;
  kenh_ban: "shopee" | "tiktok" | "lazada";
  custom_policy?: Partial<EcommercePolicy>;
}): Promise<{
  success: boolean;
  data: PricingBreakdown | null;
  error?: string;
}> {
  try {
    const res: any = await http.post("/planning/ecommerce/calculate", payload);
    const data = res?.data ?? res ?? null;
    return { success: true, data };
  } catch (e: any) {
    return { success: false, data: null, error: e?.message ?? "Lỗi tính toán khấu hao giá" };
  }
}

export async function compareEcommerceChannelsAction(payload: {
  gia_niem_yet: number;
  gia_von: number;
}): Promise<{
  success: boolean;
  data: OmnichannelComparison | null;
  error?: string;
}> {
  try {
    const res: any = await http.post("/planning/ecommerce/compare", payload);
    const data = res?.data ?? res ?? null;
    return { success: true, data };
  } catch (e: any) {
    return { success: false, data: null, error: e?.message ?? "Lỗi so sánh các kênh bán" };
  }
}

export async function fetchEcommerceMatrixAction(): Promise<{
  success: boolean;
  items: ProductPricingMatrixItem[];
  error?: string;
}> {
  try {
    const res: any = await http.get("/planning/ecommerce/matrix");
    const items = res?.data ?? res ?? [];
    return { success: true, items };
  } catch (e: any) {
    return { success: false, items: [], error: e?.message ?? "Lỗi tải ma trận giá sàn TMĐT" };
  }
}
