import logger from "./logger.js";

/**
 * Enterprise Webhook & Bot Notification Hub
 * Supports:
 * - Generic Webhook URLs (Slack, Discord, Teams, Custom ERP endpoints)
 * - Direct Telegram Bot messaging (if TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID are set, or if WEBHOOK_URL points to Telegram)
 */
export async function sendWebhookNotification({
  event = "SYSTEM_ALERT",
  title = "Thông báo hệ thống SME",
  message = "",
  data = null,
  link = "",
}) {
  const webhookUrl = process.env.WEBHOOK_URL || process.env.ALERT_WEBHOOK_URL;
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;

  if (!webhookUrl && (!telegramToken || !telegramChatId)) {
    // Webhook not configured; silent return
    return { ok: false, reason: "NO_WEBHOOK_CONFIGURED" };
  }

  const timestamp = new Date().toISOString();
  const formattedTime = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

  try {
    // 1. Direct Telegram Bot API if configured
    if (telegramToken && telegramChatId) {
      const tgUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
      const tgText = `🔔 *[SME ERP ALERT]*: *${escapeTg(title)}*\n` +
        `⏱ _Thời gian_: ${escapeTg(formattedTime)}\n` +
        `📌 _Sự kiện_: \`${escapeTg(event)}\`\n\n` +
        `${escapeTg(message)}\n` +
        (link ? `\n🔗 [Chi tiết liên kết](${link})` : "");

      await fetch(tgUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: tgText,
          parse_mode: "Markdown",
        }),
        signal: AbortSignal.timeout(5000),
      }).catch((err) => logger.warn(`Telegram alert send failed: ${err.message}`));
    }

    // 2. Generic Webhook (Slack, Discord, Zapier, Custom backend)
    if (webhookUrl) {
      const payload = {
        event,
        title,
        message,
        timestamp,
        formatted_time: formattedTime,
        link,
        data,
        // Standard Slack/Discord compatible fallback
        text: `*[${title}]* ${message}`,
      };

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        logger.warn(`Webhook endpoint responded with status: ${res.status}`);
      }
    }

    return { ok: true };
  } catch (err) {
    logger.warn(`Failed to dispatch webhook notification: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

function escapeTg(str = "") {
  return String(str)
    .replace(/_/g, "\\_")
    .replace(/\*/g, "\\*")
    .replace(/\[/g, "\\[")
    .replace(/`/g, "\\`");
}

export default {
  sendWebhookNotification,
};
