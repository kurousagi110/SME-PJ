"use server";

import { http } from "@/lib/http";

export interface VatInvoiceRow {
  ma_chung_tu: string;
  ngay: string | null;
  doi_tuong: string;
  doanh_thu_chua_thue?: number;
  gia_tri_chua_thue?: number;
  thue_suat: number;
  tien_thue_gtgt: number;
  tong_thanh_toan: number;
}

export interface VatReportData {
  period_label: string;
  summary: {
    output_invoice_count: number;
    input_invoice_count: number;
    total_output_taxable: number;
    total_output_vat: number;
    total_input_taxable: number;
    total_input_vat: number;
    vat_payable: number;
    vat_credit_carryforward: number;
    net_vat: number;
  };
  output_invoices: VatInvoiceRow[];
  input_invoices: VatInvoiceRow[];
}

export interface FixedAssetItem {
  _id: string;
  ma_tai_san: string;
  ten_tai_san: string;
  category: string;
  department: string;
  purchase_date: string;
  original_cost: number;
  salvage_value: number;
  useful_life_months: number;
  accumulated_depreciation: number;
  status: string;
  maintenance_logs?: { id: string; date: string; description: string; cost: number; technician: string }[];
  depreciation: {
    net_book_value: number;
    monthly_depreciation: number;
    remaining_months: number;
    is_fully_depreciated: boolean;
  };
}

export interface BudgetRow {
  _id?: string;
  department: string;
  category: string;
  planned_amount: number;
  actual_amount: number;
  remaining_amount: number;
  utilization_pct: number;
  alert_status: "OK" | "WARNING" | "EXCEEDED";
  note?: string;
}

export interface BudgetReportData {
  year: number;
  month: number;
  summary: {
    total_planned: number;
    total_actual: number;
    total_remaining: number;
    overall_utilization_pct: number;
    exceeded_count: number;
    warning_count: number;
  };
  rows: BudgetRow[];
}

export async function fetchVatReportAction(params: { year: number; month?: number; quarter?: number }): Promise<{
  success: boolean;
  data?: VatReportData;
  error?: string;
}> {
  try {
    const query = new URLSearchParams({ year: String(params.year) });
    if (params.month) query.set("month", String(params.month));
    if (params.quarter) query.set("quarter", String(params.quarter));
    const res = await http.get<{ data: VatReportData }>(`/accounting/vat-report?${query.toString()}`);
    return { success: true, data: res?.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Không thể tải bảng kê thuế GTGT" };
  }
}

export async function fetchFixedAssetsAction(): Promise<{
  success: boolean;
  items?: FixedAssetItem[];
  logs?: any[];
  error?: string;
}> {
  try {
    const res = await http.get<{ data: { items: FixedAssetItem[]; logs: any[] } }>("/accounting/assets");
    return { success: true, items: res?.data?.items || [], logs: res?.data?.logs || [] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Không thể tải danh mục TSCĐ" };
  }
}

export async function createFixedAssetAction(payload: {
  ten_tai_san: string;
  category: string;
  department: string;
  original_cost: number;
  salvage_value?: number;
  useful_life_months: number;
}): Promise<{ success: boolean; data?: FixedAssetItem; error?: string }> {
  try {
    const res = await http.post<{ data: FixedAssetItem }>("/accounting/assets", payload);
    return { success: true, data: res?.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Thêm tài sản cố định thất bại" };
  }
}

export async function addAssetMaintenanceAction(
  id: string,
  payload: { description: string; cost: number; technician?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    await http.post(`/accounting/assets/${id}/maintenance`, payload);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Ghi nhận bảo trì thất bại" };
  }
}

export async function runMonthlyDepreciationAction(payload: {
  month: number;
  year: number;
  post_to_cashbook?: boolean;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await http.post<{ message?: string }>("/accounting/assets/depreciate", payload);
    return { success: true, message: res?.message };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Chạy khấu hao tháng thất bại" };
  }
}

export async function fetchBudgetVsActualAction(year: number, month: number): Promise<{
  success: boolean;
  data?: BudgetReportData;
  error?: string;
}> {
  try {
    const res = await http.get<{ data: BudgetReportData }>(`/accounting/budgets?year=${year}&month=${month}`);
    return { success: true, data: res?.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Không thể tải dự toán ngân sách" };
  }
}

export async function upsertBudgetAction(payload: {
  department: string;
  category: string;
  year: number;
  month: number;
  planned_amount: number;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await http.post("/accounting/budgets", payload);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Lưu dự toán ngân sách thất bại" };
  }
}
