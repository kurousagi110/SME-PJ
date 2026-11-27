"use server";

import { http } from "@/lib/http";

export interface CrmActivity {
  id: string;
  type: string;
  content: string;
  by: string;
  at: string;
  next_follow_up?: string | null;
}

export interface CrmOpportunity {
  _id: string;
  ma_co_hoi: string;
  title: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  source?: string;
  stage: "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
  expected_value: number;
  probability: number;
  expected_close_date?: string | null;
  next_follow_up?: string | null;
  quotation_code?: string | null;
  lost_reason?: string;
  notes?: string;
  owner_name?: string;
  activities: CrmActivity[];
  created_at: string;
}

export interface CrmPipelineMetrics {
  total_opportunities: number;
  open_pipeline_value: number;
  weighted_forecast_value: number;
  won_count: number;
  won_value: number;
  lost_count: number;
  win_rate_pct: number;
  overdue_follow_ups: number;
  stages: { code: string; label: string; count: number; total_value: number; weighted_value: number }[];
}

export async function fetchCrmPipelineAction(q = ""): Promise<{
  success: boolean;
  items?: CrmOpportunity[];
  metrics?: CrmPipelineMetrics;
  error?: string;
}> {
  try {
    const query = q ? `?q=${encodeURIComponent(q)}` : "";
    const res = await http.get<{ data: { items: CrmOpportunity[]; metrics: CrmPipelineMetrics } }>(
      `/crm-pipeline${query}`
    );
    return { success: true, items: res?.data?.items || [], metrics: res?.data?.metrics };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Không thể tải phễu cơ hội CRM" };
  }
}

export async function createCrmOpportunityAction(payload: {
  title: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  source?: string;
  stage?: string;
  expected_value: number;
  next_follow_up?: string;
  notes?: string;
}): Promise<{ success: boolean; data?: CrmOpportunity; error?: string }> {
  try {
    const res = await http.post<{ data: CrmOpportunity }>("/crm-pipeline", payload);
    return { success: true, data: res?.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Tạo cơ hội bán hàng thất bại" };
  }
}

export async function updateCrmStageAction(
  id: string,
  stage: string,
  lost_reason = ""
): Promise<{ success: boolean; error?: string }> {
  try {
    await http.put(`/crm-pipeline/${id}/stage`, { stage, lost_reason });
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Cập nhật giai đoạn thất bại" };
  }
}

export async function addCrmActivityAction(
  id: string,
  payload: { type: string; content: string; next_follow_up?: string | null }
): Promise<{ success: boolean; error?: string }> {
  try {
    await http.post(`/crm-pipeline/${id}/activities`, payload);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Ghi nhận chăm sóc thất bại" };
  }
}

export async function convertCrmToQuotationAction(id: string): Promise<{
  success: boolean;
  quotationCode?: string;
  error?: string;
}> {
  try {
    const res = await http.post<{ data: { doc?: { quotation_code?: string } } }>(
      `/crm-pipeline/${id}/convert-to-quotation`,
      {}
    );
    return { success: true, quotationCode: res?.data?.doc?.quotation_code || "" };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Chuyển sang báo giá thất bại" };
  }
}
