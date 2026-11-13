/**
 * Security Helpers (zero external dependencies except Node built-in crypto)
 * - Timing-safe secret comparison
 * - SSRF validation for external webhook URLs
 * - Safe MongoDB regex builder (ReDoS & injection protection)
 */

import crypto from "node:crypto";

/**
 * So sánh 2 chuỗi bí mật an toàn chống timing attack.
 */
export function timingSafeEqualStrings(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^\[::1\]$/,
  /^fe80:/i,
  /^fc00:/i,
  /^fd[0-9a-f]{2}:/i,
  /\.local$/i,
  /\.internal$/i,
  /^(db|api|frontend|redis|mongo|mongodb|nginx|sme_api|sme_db|sme_frontend|sme_nginx)$/i,
];

/**
 * Kiểm tra URL Webhook bên ngoài chống lỗ hổng SSRF.
 * @returns {{ valid: boolean, reason?: string, normalizedUrl?: string }}
 */
export function validateExternalWebhookUrl(urlStr, { allowHttpInDev = true } = {}) {
  if (!urlStr || typeof urlStr !== "string") {
    return { valid: false, reason: "Webhook URL không được để trống" };
  }

  let parsed;
  try {
    parsed = new URL(urlStr.trim());
  } catch {
    return { valid: false, reason: "Webhook URL không đúng định dạng" };
  }

  const isProd = process.env.NODE_ENV === "production";
  const allowedProtocols = !isProd && allowHttpInDev ? ["https:", "http:"] : ["https:"];
  if (!allowedProtocols.includes(parsed.protocol)) {
    return {
      valid: false,
      reason: isProd
        ? "Chỉ cho phép giao thức HTTPS trong môi trường production"
        : "Giao thức URL không hợp lệ (chỉ hỗ trợ HTTP/HTTPS)",
    };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, reason: "URL không được chứa thông tin đăng nhập (userinfo)" };
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
  if (PRIVATE_HOSTNAME_PATTERNS.some((rx) => rx.test(hostname))) {
    return { valid: false, reason: "Không cho phép trỏ Webhook tới địa chỉ mạng nội bộ / localhost" };
  }

  return { valid: true, normalizedUrl: parsed.toString() };
}

/**
 * Escape ký tự đặc biệt và giới hạn độ dài để tạo RegExp an toàn (chống ReDoS).
 */
export function escapeSafeRegexPattern(raw, maxLen = 100) {
  const s = String(raw || "").trim().slice(0, maxLen);
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
