"use server";

import { http } from "@/lib/http";

export interface PosShiftSummary {
  opening_cash: number;
  order_count: number;
  cash_sales: number;
  transfer_sales: number;
  cash_refunds: number;
  total_sales: number;
  expected_cash: number;
  actual_cash: number | null;
  variance: number;
  reconciliation_status: "open" | "balanced" | "over" | "short";
}

export interface PosShiftItem {
  _id: string;
  ma_ca: string;
  register_name: string;
  cashier_id: string;
  cashier_name: string;
  status: "open" | "closed";
  opening_cash: number;
  actual_cash: number | null;
  variance: number;
  opened_at: string;
  closed_at?: string | null;
  opening_notes?: string;
  closing_notes?: string;
  summary: PosShiftSummary;
}

export async function fetchActivePosShiftAction(): Promise<{
  success: boolean;
  data?: PosShiftItem | null;
  error?: string;
}> {
  try {
    const res = await http.get<{ data: PosShiftItem | null }>("/pos-shifts/active");
    return { success: true, data: res?.data ?? null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Không thể tải ca thu ngân hiện tại" };
  }
}

export async function openPosShiftAction(payload: {
  opening_cash: number;
  register_name?: string;
  notes?: string;
}): Promise<{ success: boolean; data?: PosShiftItem; error?: string }> {
  try {
    const res = await http.post<{ data: PosShiftItem }>("/pos-shifts/open", payload);
    return { success: true, data: res?.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Mở ca thu ngân thất bại" };
  }
}

export async function closePosShiftAction(
  shiftId: string,
  payload: { actual_cash: number; notes?: string }
): Promise<{ success: boolean; data?: PosShiftItem; error?: string }> {
  try {
    const res = await http.post<{ data: PosShiftItem }>(`/pos-shifts/${shiftId}/close`, payload);
    return { success: true, data: res?.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Kết ca thu ngân thất bại" };
  }
}

export async function fetchPosShiftHistoryAction(limit = 20): Promise<{
  success: boolean;
  items?: PosShiftItem[];
  error?: string;
}> {
  try {
    const res = await http.get<{ data: { items: PosShiftItem[] } }>(`/pos-shifts?limit=${limit}`);
    return { success: true, items: res?.data?.items || [] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Không thể tải lịch sử ca thu ngân" };
  }
}
