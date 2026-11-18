"use server";

import { http } from "@/lib/http";

export type ZaloMode = "oa_api" | "zns" | "webhook";
export type JobChannel = "telegram" | "zalo" | "both" | "in_app";

export interface AutomationConfigPayload {
  channels: {
    telegram: {
      enabled: boolean;
      bot_token?: string;
      has_token?: boolean;
      masked_token?: string;
      chat_id: string;
    };
    zalo: {
      enabled: boolean;
      mode: ZaloMode;
      oa_access_token?: string;
      has_token?: boolean;
      masked_token?: string;
      recipient_id: string;
      template_id: string;
      webhook_url: string;
    };
  };
  jobs: {
    morning_briefing: {
      enabled: boolean;
      time: string;
      channel: JobChannel;
    };
    low_stock_fefo_alert: {
      enabled: boolean;
      interval_minutes: number;
      fefo_days_threshold: number;
      channel: JobChannel;
    };
    overdue_debt_contract_alert: {
      enabled: boolean;
      time: string;
      channel: JobChannel;
    };
    production_bottleneck_alert: {
      enabled: boolean;
      interval_minutes: number;
      threshold_hours: number;
      channel: JobChannel;
    };
    auto_reorder?: {
      enabled: boolean;
      time: string;
      channel: JobChannel;
    };
  };
}

export async function fetchAutomationConfigAction() {
  try {
    const res: any = await http.get("/bot/automation-config");
    return { success: true, data: res?.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Không thể tải cấu hình tự động hóa" };
  }
}

export async function saveAutomationConfigAction(payload: AutomationConfigPayload) {
  try {
    const res: any = await http.put("/bot/automation-config", payload);
    return { success: true, data: res?.data, message: res?.message };
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi lưu cấu hình tự động hóa" };
  }
}

export async function testBotChannelAction(channel: "telegram" | "zalo", message?: string) {
  try {
    const res: any = await http.post("/bot/test-channel", { channel, message });
    return { success: true, message: res?.message || "Gửi test thành công" };
  } catch (err: any) {
    return { success: false, error: err?.message || "Gửi tin nhắn test thất bại" };
  }
}

export async function runAutomationJobNowAction(jobKey: string) {
  try {
    const res: any = await http.post("/bot/run-job", { jobKey });
    return { success: true, data: res?.data, message: res?.message || "Đã chạy tác vụ" };
  } catch (err: any) {
    return { success: false, error: err?.message || "Chạy tác vụ thất bại" };
  }
}
