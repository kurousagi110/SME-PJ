"use server";

import { http } from "@/lib/http";

export interface PromotionItem {
  _id: string;
  code: string;
  name: string;
  type: "percent" | "fixed" | "freeship";
  value: number;
  max_discount: number;
  min_order_amount: number;
  max_usage: number;
  per_customer_limit: number;
  customer_groups: string[];
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
  description?: string;
  used_count: number;
  created_at?: string;
}

export interface LoyaltyMemberItem {
  _id: string;
  ma_doi_tac: string;
  ten: string;
  so_dien_thoai: string;
  nhom: string;
  loyalty_points: number;
  lifetime_points: number;
  tier: { code: string; label: string };
}

export interface CustomerLoyaltyLookup {
  partner_id?: string;
  partner_name?: string;
  phone?: string;
  points: number;
  lifetime_points: number;
  tier: { code: string; label: string };
  config?: {
    enabled: boolean;
    vnd_per_point: number;
    vnd_per_redeem_point: number;
    max_redeem_pct: number;
  };
}

export async function fetchPromotionsAction(params: { q?: string; activeOnly?: boolean } = {}): Promise<{
  success: boolean;
  items?: PromotionItem[];
  total?: number;
  error?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.activeOnly) query.set("activeOnly", "true");
    const res = await http.get<{ data: { items: PromotionItem[]; total: number } }>(`/promotions?${query.toString()}`);
    return { success: true, items: res?.data?.items || [], total: res?.data?.total || 0 };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Không thể tải danh sách khuyến mãi" };
  }
}

export async function createPromotionAction(payload: Partial<PromotionItem>): Promise<{
  success: boolean;
  data?: PromotionItem;
  error?: string;
}> {
  try {
    const res = await http.post<{ data: PromotionItem }>("/promotions", payload);
    return { success: true, data: res?.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Tạo khuyến mãi thất bại" };
  }
}

export async function updatePromotionAction(
  id: string,
  payload: Partial<PromotionItem>
): Promise<{ success: boolean; data?: PromotionItem; error?: string }> {
  try {
    const res = await http.put<{ data: PromotionItem }>(`/promotions/${id}`, payload);
    return { success: true, data: res?.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Cập nhật khuyến mãi thất bại" };
  }
}

export async function deletePromotionAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await http.delete(`/promotions/${id}`);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Xóa khuyến mãi thất bại" };
  }
}

export async function validatePromotionAction(payload: {
  code: string;
  orderAmount: number;
  customerGroup?: string;
  customerKey?: string;
}): Promise<{
  success: boolean;
  data?: { code: string; discountAmount: number; message: string; type?: string };
  error?: string;
}> {
  try {
    const res = await http.post<{ data: { code: string; discountAmount: number; message: string; type?: string } }>(
      "/promotions/validate",
      payload
    );
    return { success: true, data: res?.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Mã ưu đãi không hợp lệ" };
  }
}

export async function fetchLoyaltyMembersAction(q = ""): Promise<{
  success: boolean;
  items?: LoyaltyMemberItem[];
  error?: string;
}> {
  try {
    const query = q ? `?q=${encodeURIComponent(q)}` : "";
    const res = await http.get<{ data: LoyaltyMemberItem[] }>(`/promotions/loyalty/members${query}`);
    return { success: true, items: res?.data || [] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Không thể tải danh sách tích điểm" };
  }
}

export async function lookupCustomerLoyaltyAction(phone: string): Promise<{
  success: boolean;
  data?: CustomerLoyaltyLookup;
  error?: string;
}> {
  try {
    const res = await http.get<{ data: CustomerLoyaltyLookup }>(
      `/promotions/loyalty/lookup?phone=${encodeURIComponent(phone)}`
    );
    return { success: true, data: res?.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Không thể tra cứu điểm tích lũy" };
  }
}
