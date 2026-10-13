"use server";

import { http } from "@/lib/http";

export interface PnLSummary {
  grossRevenue: number;
  totalDiscounts: number;
  totalSalesReturns: number;
  netRevenue: number;
  totalCogs: number;
  grossProfit: number;
  grossMarginPct: number;
  opex: {
    payroll: number;
    shipping: number;
    rentAndUtilities: number;
    other: number;
    total: number;
  };
  netOperatingProfit: number;
  netMarginPct: number;
  totalOrders: number;
}

export interface MonthlyTimelineItem {
  month: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  opex: number;
  netProfit: number;
  orderCount: number;
}

export interface PnLReportResponse {
  period: {
    start: string;
    end: string;
    year: number;
  };
  summary: PnLSummary;
  monthlyTimeline: MonthlyTimelineItem[];
}

export interface ProductProfitabilityItem {
  code: string;
  name: string;
  qty: number;
  revenue: number;
  totalCost: number;
  grossProfit: number;
  marginPct: number;
  classification: string;
}

export interface AgingDebtorItem {
  partnerId: string;
  code: string;
  name: string;
  phone: string;
  creditLimit: number;
  paymentTerms: number;
  totalDebt: number;
  current: number;
  days_31_60: number;
  days_61_90: number;
  days_over_90: number;
  maxDaysOverdue: number;
  unpaidOrderCount: number;
}

export interface AgingDebtSummary {
  totalDebt: number;
  current: number;
  days_31_60: number;
  days_61_90: number;
  days_over_90: number;
  badDebtPercentage: number;
  totalDebtors: number;
}

export interface AgingDebtResponse {
  type: "customer" | "supplier";
  summary: AgingDebtSummary;
  items: AgingDebtorItem[];
}

export interface CreditLimitCheckResult {
  allowed: boolean;
  isOverLimit?: boolean;
  partnerName?: string;
  creditLimit: number;
  currentDebt: number;
  newOrderAmount: number;
  projectedDebt: number;
  excessAmount?: number;
  isUnlimited?: boolean;
  khoa_no_khi_qua_han?: boolean;
}

/**
 * Lấy Báo Cáo Lãi - Lỗ (P&L)
 */
export async function getProfitAndLossAction(params?: {
  date_from?: string;
  date_to?: string;
  year?: number | string;
  month?: number | string;
}): Promise<{ success: boolean; data?: PnLReportResponse; error?: string }> {
  try {
    const q = new URLSearchParams();
    if (params?.date_from) q.append("date_from", params.date_from);
    if (params?.date_to) q.append("date_to", params.date_to);
    if (params?.year) q.append("year", String(params.year));
    if (params?.month) q.append("month", String(params.month));

    const res: any = await http.get(`/financial/pnl?${q.toString()}`);
    return {
      success: true,
      data: res?.data as PnLReportResponse,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Không thể tải báo cáo P&L",
    };
  }
}

/**
 * Lấy Hiệu quả Sinh lời Sản phẩm
 */
export async function getProductProfitabilityAction(params?: {
  date_from?: string;
  date_to?: string;
  limit?: number;
}): Promise<{ success: boolean; items?: ProductProfitabilityItem[]; error?: string }> {
  try {
    const q = new URLSearchParams();
    if (params?.date_from) q.append("date_from", params.date_from);
    if (params?.date_to) q.append("date_to", params.date_to);
    if (params?.limit) q.append("limit", String(params.limit));

    const res: any = await http.get(`/financial/product-profitability?${q.toString()}`);
    return {
      success: true,
      items: (res?.data?.items || []) as ProductProfitabilityItem[],
    };
  } catch (err: any) {
    return {
      success: false,
      items: [],
      error: err?.message || "Không thể tải hiệu quả sản phẩm",
    };
  }
}

/**
 * Lấy Báo Cáo Tuổi Nợ (Aging Debt)
 */
export async function getAgingDebtAction(params?: {
  type?: "customer" | "supplier";
  partner_id?: string;
}): Promise<{ success: boolean; data?: AgingDebtResponse; error?: string }> {
  try {
    const q = new URLSearchParams();
    if (params?.type) q.append("type", params.type);
    if (params?.partner_id) q.append("partner_id", params.partner_id);

    const res: any = await http.get(`/financial/aging-debt?${q.toString()}`);
    return {
      success: true,
      data: res?.data as AgingDebtResponse,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Không thể tải báo cáo tuổi nợ",
    };
  }
}

/**
 * Kiểm tra hạn mức công nợ của đối tác
 */
export async function checkCreditLimitAction(
  partnerId: string,
  orderAmount: number = 0
): Promise<{ success: boolean; data?: CreditLimitCheckResult; error?: string }> {
  try {
    const res: any = await http.get(`/financial/credit-limit/${partnerId}?orderAmount=${orderAmount}`);
    return {
      success: true,
      data: res?.data as CreditLimitCheckResult,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Không thể kiểm tra hạn mức công nợ",
    };
  }
}

/**
 * Quét tính toán lại COGS cho đơn hàng
 */
export async function recalculateCOGSAction(): Promise<{
  success: boolean;
  updatedOrders?: number;
  error?: string;
}> {
  try {
    const res: any = await http.post("/financial/recalculate-cogs", {});
    return {
      success: true,
      updatedOrders: res?.data?.updatedOrders || 0,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Thao tác cập nhật lại giá vốn thất bại",
    };
  }
}
