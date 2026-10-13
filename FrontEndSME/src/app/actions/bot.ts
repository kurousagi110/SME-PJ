"use server";

import { http } from "@/lib/http";

export async function fetchBotStatusAction(): Promise<{
  success: boolean;
  data?: { isConfigured: boolean; chatId: string; hasToken: boolean };
  error?: string;
}> {
  try {
    const res: any = await http.get("/bot/telegram/status");
    return { success: true, data: res?.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Không thể tải trạng thái Bot" };
  }
}

export async function updateBotConfigAction(payload: { bot_token: string; chat_id: string }): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await http.post("/bot/telegram/config", payload);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Lưu cấu hình Bot thất bại" };
  }
}

export async function testBotMessageAction(message?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await http.post("/bot/telegram/test", { message });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Gửi tin nhắn test thất bại" };
  }
}

export async function triggerMorningBriefingAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await http.post("/bot/telegram/morning-briefing", {});
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Khởi chạy báo cáo sáng thất bại" };
  }
}
