"use server";

import { http } from "@/lib/http";

export interface EcommerceChannel {
  _id: string;
  platform: "shopee" | "tiktok" | "lazada";
  shop_id: string;
  shop_name: string;
  platform_fee_pct: number;
  payment_fee_pct: number;
  default_buffer_stock: number;
  auto_sync_inventory: boolean;
  is_active: boolean;
  last_synced_at?: string | null;
}

export interface EcommerceSkuMapping {
  _id: string;
  channel_id: string;
  channel_sku: string;
  san_pham_id: string;
  ma_sp: string;
  ten_sp: string;
  buffer_stock: number;
  max_publish_qty: number;
  last_physical_qty?: number | null;
  last_pushed_qty?: number | null;
  last_synced_at?: string | null;
}

export interface EcommerceSyncOverview {
  channels: EcommerceChannel[];
  mappings: EcommerceSkuMapping[];
  logs: { _id?: string; platform: string; shop_name: string; action: string; summary: string; created_at: string }[];
  adapters?: {
    einvoice?: { mode: string; provider: string; series: string; configured_for_live: boolean };
    logistics?: { mode: string; default_carrier: string; carriers: { code: string; name: string; live_ready: boolean }[] };
  };
}

export async function fetchEcommerceSyncOverviewAction(): Promise<{
  success: boolean;
  data?: EcommerceSyncOverview;
  error?: string;
}> {
  try {
    const res = await http.get<{ data: EcommerceSyncOverview }>("/ecommerce-sync/overview");
    return { success: true, data: res?.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Không thể tải dữ liệu đồng bộ TMĐT" };
  }
}

export async function upsertEcommerceChannelAction(payload: {
  platform: string;
  shop_id: string;
  shop_name: string;
  platform_fee_pct: number;
  payment_fee_pct: number;
  default_buffer_stock: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await http.post("/ecommerce-sync/channels", payload);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Lưu gian hàng thất bại" };
  }
}

export async function upsertEcommerceMappingAction(payload: {
  channel_id: string;
  channel_sku: string;
  san_pham_id: string;
  buffer_stock: number;
  max_publish_qty?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await http.post("/ecommerce-sync/mappings", payload);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Lưu ánh xạ SKU thất bại" };
  }
}

export async function syncChannelInventoryAction(channelId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const res = await http.post<{ message?: string }>(`/ecommerce-sync/channels/${channelId}/sync-inventory`, {});
    return { success: true, message: res?.message };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Đồng bộ tồn kho thất bại" };
  }
}

export async function settleChannelPayoutAction(
  channelId: string,
  payload: {
    gross_sales: number;
    return_amount?: number;
    shop_voucher_cost?: number;
    shipping_subsidy?: number;
    settlement_ref?: string;
  }
): Promise<{ success: boolean; message?: string; data?: any; error?: string }> {
  try {
    const res = await http.post<{ message?: string; data?: any }>(
      `/ecommerce-sync/channels/${channelId}/settle-payout`,
      payload
    );
    return { success: true, message: res?.message, data: res?.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Quyết toán tiền sàn thất bại" };
  }
}
