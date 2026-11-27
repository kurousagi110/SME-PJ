"use server";

import { http } from "@/lib/http";

export interface PurchaseRequestItem {
  _id: string;
  ma_pr: string;
  title: string;
  department: string;
  priority: "normal" | "high" | "urgent";
  items: { item_name: string; quantity: number; unit: string; estimated_price: number; estimated_total: number }[];
  estimated_budget: number;
  reason?: string;
  trang_thai: "pending" | "approved" | "rejected" | "rfq_created";
  rfq_code?: string | null;
  created_by?: { ho_ten?: string };
  created_at: string;
}

export interface RfqRankedQuote {
  quote_id: string;
  vendor_name: string;
  total_price: number;
  lead_time_days: number;
  payment_terms_days: number;
  notes?: string;
  is_lowest_price: boolean;
  is_fastest: boolean;
  composite_score: number;
  rank: number;
  is_recommended: boolean;
}

export interface RfqItem {
  _id: string;
  ma_rfq: string;
  ma_pr?: string | null;
  title: string;
  items: { item_name: string; quantity: number; unit: string; estimated_price?: number }[];
  ranked_quotes: RfqRankedQuote[];
  trang_thai: "open" | "awarded" | "cancelled";
  awarded_vendor?: string | null;
  po_code?: string | null;
  created_at: string;
}

export interface VendorScoreRow {
  vendor_name: string;
  total_orders: number;
  completed_orders: number;
  total_spend: number;
  on_time_rate: number;
  quality_rate: number;
  score: number;
  grade: "A" | "B" | "C" | "D";
}

export interface ThreeWayMatchResult {
  status: "MATCHED" | "QTY_MISMATCH" | "PRICE_MISMATCH" | "BOTH_MISMATCH";
  approved_for_payment: boolean;
  po_total: number;
  received_total: number;
  invoiced_total: number;
  qty_variance_vs_receipt: number;
  price_variance: number;
  price_variance_pct: number;
  message: string;
}

export async function fetchPurchaseRequestsAction(): Promise<{
  success: boolean;
  items?: PurchaseRequestItem[];
  error?: string;
}> {
  try {
    const res = await http.get<{ data: { items: PurchaseRequestItem[] } }>("/procurement/prs");
    return { success: true, items: res?.data?.items || [] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Không thể tải danh sách PR" };
  }
}

export async function createPurchaseRequestAction(payload: {
  title: string;
  department?: string;
  priority?: string;
  reason?: string;
  items: { item_name: string; quantity: number; unit?: string; estimated_price: number }[];
}): Promise<{ success: boolean; data?: PurchaseRequestItem; error?: string }> {
  try {
    const res = await http.post<{ data: PurchaseRequestItem }>("/procurement/prs", payload);
    return { success: true, data: res?.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Tạo đề xuất mua hàng thất bại" };
  }
}

export async function decidePurchaseRequestAction(
  id: string,
  hanh_dong: "approve" | "reject"
): Promise<{ success: boolean; error?: string }> {
  try {
    await http.post(`/procurement/prs/${id}/decide`, { hanh_dong });
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Xử lý PR thất bại" };
  }
}

export async function fetchRfqsAction(): Promise<{ success: boolean; items?: RfqItem[]; error?: string }> {
  try {
    const res = await http.get<{ data: { items: RfqItem[] } }>("/procurement/rfqs");
    return { success: true, items: res?.data?.items || [] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Không thể tải danh sách RFQ" };
  }
}

export async function createRfqFromPrAction(pr_id: string): Promise<{
  success: boolean;
  data?: RfqItem;
  error?: string;
}> {
  try {
    const res = await http.post<{ data: RfqItem }>("/procurement/rfqs", { pr_id });
    return { success: true, data: res?.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Tạo RFQ thất bại" };
  }
}

export async function submitVendorQuoteAction(
  rfqId: string,
  payload: { vendor_name: string; total_price: number; lead_time_days: number; payment_terms_days: number; notes?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    await http.post(`/procurement/rfqs/${rfqId}/quotes`, payload);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Thêm báo giá NCC thất bại" };
  }
}

export async function awardRfqAction(
  rfqId: string,
  vendor_name: string
): Promise<{ success: boolean; poCode?: string; error?: string }> {
  try {
    const res = await http.post<{ data: { po_code?: string } }>(`/procurement/rfqs/${rfqId}/award`, { vendor_name });
    return { success: true, poCode: res?.data?.po_code };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Chọn thầu & tạo PO thất bại" };
  }
}

export async function fetchVendorScorecardAction(): Promise<{
  success: boolean;
  items?: VendorScoreRow[];
  error?: string;
}> {
  try {
    const res = await http.get<{ data: VendorScoreRow[] }>("/procurement/vendor-scorecard");
    return { success: true, items: res?.data || [] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Không thể tải bảng điểm NCC" };
  }
}

export async function runThreeWayMatchAction(payload: {
  po_qty: number;
  po_unit_price: number;
  received_qty: number;
  invoiced_qty: number;
  invoiced_unit_price: number;
  price_tolerance_pct?: number;
}): Promise<{ success: boolean; data?: ThreeWayMatchResult; error?: string }> {
  try {
    const res = await http.post<{ data: ThreeWayMatchResult }>("/procurement/three-way-match", payload);
    return { success: true, data: res?.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Đối soát 3 chiều thất bại" };
  }
}
