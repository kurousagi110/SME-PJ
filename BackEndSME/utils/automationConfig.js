/**
 * Pure Automation & Multi-Channel (Telegram / Zalo) Config Helpers
 * (Zero external dependencies)
 */

export const VALID_JOB_CHANNELS = ["telegram", "zalo", "both", "in_app"];
export const VALID_ZALO_MODES = ["oa_api", "zns", "webhook"];

export const DEFAULT_AUTOMATION_CONFIG = {
  channels: {
    telegram: {
      enabled: false,
      bot_token: "",
      chat_id: "",
    },
    zalo: {
      enabled: false,
      mode: "oa_api", // "oa_api" | "zns" | "webhook"
      oa_access_token: "",
      recipient_id: "",
      template_id: "",
      webhook_url: "",
    },
  },
  jobs: {
    morning_briefing: {
      enabled: false,
      time: "07:30",
      channel: "both",
    },
    low_stock_fefo_alert: {
      enabled: false,
      interval_minutes: 120,
      fefo_days_threshold: 15,
      channel: "both",
    },
    overdue_debt_contract_alert: {
      enabled: false,
      time: "08:00",
      channel: "both",
    },
    production_bottleneck_alert: {
      enabled: false,
      interval_minutes: 180,
      threshold_hours: 48,
      channel: "both",
    },
    auto_reorder: {
      enabled: false,
      time: "08:30",
      channel: "both",
    },
    anomaly_detection: {
      enabled: false,
      interval_minutes: 240,
      revenue_drop_pct: 40,
      discount_alert_pct: 25,
      scrap_rate_alert_pct: 10,
      channel: "both",
    },
  },
};

export function maskSecret(val = "") {
  const str = String(val || "").trim();
  if (!str) return "";
  if (str.length <= 8) return "****";
  return `${str.slice(0, 4)}****${str.slice(-4)}`;
}

/**
 * Chuẩn hóa & gộp cấu hình Admin gửi lên với cấu hình hiện tại (giữ nguyên secret nếu Admin không nhập lại).
 */
export function mergeAutomationConfig(existing = {}, incoming = {}) {
  const base = structuredClone(DEFAULT_AUTOMATION_CONFIG);
  const curChannels = existing?.channels || {};
  const inChannels = incoming?.channels || {};

  const keepOrSet = (newVal, oldVal) => {
    const trimmed = typeof newVal === "string" ? newVal.trim() : "";
    if (!trimmed || trimmed.includes("****")) return String(oldVal || "");
    return trimmed;
  };

  base.channels.telegram = {
    enabled: Boolean(inChannels.telegram?.enabled ?? curChannels.telegram?.enabled ?? false),
    bot_token: keepOrSet(inChannels.telegram?.bot_token, curChannels.telegram?.bot_token),
    chat_id: String(inChannels.telegram?.chat_id ?? curChannels.telegram?.chat_id ?? "").trim(),
  };

  const zaloMode = VALID_ZALO_MODES.includes(inChannels.zalo?.mode)
    ? inChannels.zalo.mode
    : VALID_ZALO_MODES.includes(curChannels.zalo?.mode)
    ? curChannels.zalo.mode
    : "oa_api";

  base.channels.zalo = {
    enabled: Boolean(inChannels.zalo?.enabled ?? curChannels.zalo?.enabled ?? false),
    mode: zaloMode,
    oa_access_token: keepOrSet(inChannels.zalo?.oa_access_token, curChannels.zalo?.oa_access_token),
    recipient_id: String(inChannels.zalo?.recipient_id ?? curChannels.zalo?.recipient_id ?? "").trim(),
    template_id: String(inChannels.zalo?.template_id ?? curChannels.zalo?.template_id ?? "").trim(),
    webhook_url: String(inChannels.zalo?.webhook_url ?? curChannels.zalo?.webhook_url ?? "").trim(),
  };

  const curJobs = existing?.jobs || {};
  const inJobs = incoming?.jobs || {};

  const normalizeChannel = (ch, fallback) =>
    VALID_JOB_CHANNELS.includes(ch) ? ch : VALID_JOB_CHANNELS.includes(fallback) ? fallback : "both";

  const normalizeTime = (t, fallback) =>
    typeof t === "string" && /^\d{2}:\d{2}$/.test(t.trim()) ? t.trim() : fallback;

  base.jobs.morning_briefing = {
    enabled: Boolean(inJobs.morning_briefing?.enabled ?? curJobs.morning_briefing?.enabled ?? false),
    time: normalizeTime(inJobs.morning_briefing?.time, curJobs.morning_briefing?.time || "07:30"),
    channel: normalizeChannel(inJobs.morning_briefing?.channel, curJobs.morning_briefing?.channel),
  };

  base.jobs.low_stock_fefo_alert = {
    enabled: Boolean(inJobs.low_stock_fefo_alert?.enabled ?? curJobs.low_stock_fefo_alert?.enabled ?? false),
    interval_minutes: Math.max(
      15,
      Math.min(1440, Number(inJobs.low_stock_fefo_alert?.interval_minutes ?? curJobs.low_stock_fefo_alert?.interval_minutes ?? 120) || 120)
    ),
    fefo_days_threshold: Math.max(
      1,
      Math.min(90, Number(inJobs.low_stock_fefo_alert?.fefo_days_threshold ?? curJobs.low_stock_fefo_alert?.fefo_days_threshold ?? 15) || 15)
    ),
    channel: normalizeChannel(inJobs.low_stock_fefo_alert?.channel, curJobs.low_stock_fefo_alert?.channel),
  };

  base.jobs.overdue_debt_contract_alert = {
    enabled: Boolean(inJobs.overdue_debt_contract_alert?.enabled ?? curJobs.overdue_debt_contract_alert?.enabled ?? false),
    time: normalizeTime(inJobs.overdue_debt_contract_alert?.time, curJobs.overdue_debt_contract_alert?.time || "08:00"),
    channel: normalizeChannel(inJobs.overdue_debt_contract_alert?.channel, curJobs.overdue_debt_contract_alert?.channel),
  };

  base.jobs.production_bottleneck_alert = {
    enabled: Boolean(inJobs.production_bottleneck_alert?.enabled ?? curJobs.production_bottleneck_alert?.enabled ?? false),
    interval_minutes: Math.max(
      15,
      Math.min(1440, Number(inJobs.production_bottleneck_alert?.interval_minutes ?? curJobs.production_bottleneck_alert?.interval_minutes ?? 180) || 180)
    ),
    threshold_hours: Math.max(
      1,
      Math.min(720, Number(inJobs.production_bottleneck_alert?.threshold_hours ?? curJobs.production_bottleneck_alert?.threshold_hours ?? 48) || 48)
    ),
    channel: normalizeChannel(inJobs.production_bottleneck_alert?.channel, curJobs.production_bottleneck_alert?.channel),
  };

  base.jobs.auto_reorder = {
    enabled: Boolean(inJobs.auto_reorder?.enabled ?? curJobs.auto_reorder?.enabled ?? false),
    time: normalizeTime(inJobs.auto_reorder?.time, curJobs.auto_reorder?.time || "08:30"),
    channel: normalizeChannel(inJobs.auto_reorder?.channel, curJobs.auto_reorder?.channel),
  };

  base.jobs.anomaly_detection = {
    enabled: Boolean(inJobs.anomaly_detection?.enabled ?? curJobs.anomaly_detection?.enabled ?? false),
    interval_minutes: Math.max(
      30,
      Math.min(
        1440,
        Number(inJobs.anomaly_detection?.interval_minutes ?? curJobs.anomaly_detection?.interval_minutes ?? 240) || 240
      )
    ),
    revenue_drop_pct: Math.max(
      10,
      Math.min(90, Number(inJobs.anomaly_detection?.revenue_drop_pct ?? curJobs.anomaly_detection?.revenue_drop_pct ?? 40) || 40)
    ),
    discount_alert_pct: Math.max(
      5,
      Math.min(80, Number(inJobs.anomaly_detection?.discount_alert_pct ?? curJobs.anomaly_detection?.discount_alert_pct ?? 25) || 25)
    ),
    scrap_rate_alert_pct: Math.max(
      1,
      Math.min(50, Number(inJobs.anomaly_detection?.scrap_rate_alert_pct ?? curJobs.anomaly_detection?.scrap_rate_alert_pct ?? 10) || 10)
    ),
    channel: normalizeChannel(inJobs.anomaly_detection?.channel, curJobs.anomaly_detection?.channel),
  };

  return base;
}

/**
 * Tạo bản trả về an toàn cho Frontend (ẩn token nhạy cảm).
 */
export function toPublicAutomationConfig(cfg = DEFAULT_AUTOMATION_CONFIG) {
  return {
    channels: {
      telegram: {
        enabled: Boolean(cfg.channels?.telegram?.enabled),
        has_token: Boolean(cfg.channels?.telegram?.bot_token),
        masked_token: maskSecret(cfg.channels?.telegram?.bot_token),
        chat_id: cfg.channels?.telegram?.chat_id || "",
      },
      zalo: {
        enabled: Boolean(cfg.channels?.zalo?.enabled),
        mode: cfg.channels?.zalo?.mode || "oa_api",
        has_token: Boolean(cfg.channels?.zalo?.oa_access_token),
        masked_token: maskSecret(cfg.channels?.zalo?.oa_access_token),
        recipient_id: cfg.channels?.zalo?.recipient_id || "",
        template_id: cfg.channels?.zalo?.template_id || "",
        webhook_url: cfg.channels?.zalo?.webhook_url || "",
      },
    },
    jobs: cfg.jobs,
  };
}

/**
 * Xác định danh sách kênh ngoại vi thực sự được phép gửi cho 1 job.
 */
export function resolveTargetChannels(jobChannel = "both", channelsCfg = {}) {
  const targets = [];
  const wantsTelegram = jobChannel === "telegram" || jobChannel === "both";
  const wantsZalo = jobChannel === "zalo" || jobChannel === "both";

  if (wantsTelegram && channelsCfg?.telegram?.enabled) {
    targets.push("telegram");
  }
  if (wantsZalo && channelsCfg?.zalo?.enabled) {
    targets.push("zalo");
  }
  return targets;
}

/**
 * Kiểm tra job chạy theo giờ cố định hàng ngày ("HH:mm") có nên chạy tại thời điểm `now` không.
 */
export function shouldDailyJobRunNow(timeStr = "07:30", now = new Date(), lastRunDateKey = null) {
  if (!/^\d{2}:\d{2}$/.test(String(timeStr))) return false;
  const [hh, mm] = timeStr.split(":").map(Number);
  const curHH = now.getHours();
  const curMM = now.getMinutes();
  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (lastRunDateKey === dateKey) return false;
  return curHH > hh || (curHH === hh && curMM >= mm);
}
