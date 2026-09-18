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
