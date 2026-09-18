"use server";

import { http } from "@/lib/http";

export interface AiQueryResult {
  answer: string;
  action?: {
    title: string;
    url: string;
  };
  suggestions?: Array<{
    text: string;
    category: string;
  }>;
}

export async function askAiCopilotAction(query: string): Promise<AiQueryResult | null> {
  try {
    const res = await http.post<{ success: boolean; data: AiQueryResult }>("/ai-copilot/query", { query });
    return res?.data || null;
  } catch (err: any) {
    console.error("askAiCopilotAction error", err);
    return {
      answer: "Xin lỗi, không thể kết nối tới máy chủ AI Copilot lúc này. Vui lòng kiểm tra lại kết nối.",
    };
  }
}

export async function fetchAiSuggestionsAction(): Promise<Array<{ text: string; category: string }>> {
  try {
    const res = await http.get<{ success: boolean; data: Array<{ text: string; category: string }> }>("/ai-copilot/suggestions");
    return res?.data || [];
  } catch (err) {
    console.error("fetchAiSuggestionsAction error", err);
    return [];
  }
}

export interface AiConfig {
  provider: "gemini" | "openai";
  model: string;
  has_key: boolean;
  masked_key: string;
  is_active: boolean;
  updated_at?: string | null;
}

export async function fetchAiConfigAction(): Promise<AiConfig | null> {
  try {
    const res = await http.get<{ success: boolean; data: AiConfig }>("/ai-copilot/config");
    return res?.data || null;
  } catch (err) {
    console.error("fetchAiConfigAction error", err);
    return null;
  }
}

export async function saveAiConfigAction(payload: {
  provider: "gemini" | "openai";
  api_key?: string;
  model?: string;
  is_active?: boolean;
}): Promise<{ success: boolean; data?: AiConfig; message?: string }> {
  try {
    const res = await http.post<{ success: boolean; data: AiConfig; message: string }>("/ai-copilot/config", payload);
    return { success: true, data: res?.data, message: res?.message };
  } catch (err: any) {
    console.error("saveAiConfigAction error", err);
    return { success: false, message: err?.message || "Lỗi lưu cấu hình AI" };
  }
}

export async function testAiConnectionAction(payload: {
  provider: "gemini" | "openai";
  api_key?: string;
  model?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const res = await http.post<{ success: boolean; data: { success: boolean; message: string }; message: string }>(
      "/ai-copilot/config/test",
      payload
    );
    const data = res?.data;
    return {
      success: Boolean(data?.success),
      message: data?.message || res?.message || "Kiểm tra hoàn tất",
    };
  } catch (err: any) {
    console.error("testAiConnectionAction error", err);
    return { success: false, message: err?.message || "Lỗi kiểm tra kết nối" };
  }
}

