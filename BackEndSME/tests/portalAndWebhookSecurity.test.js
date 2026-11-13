import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  timingSafeEqualStrings,
  validateExternalWebhookUrl,
  escapeSafeRegexPattern,
} from "../utils/securityHelpers.js";
import { DEFAULT_AUTOMATION_CONFIG, mergeAutomationConfig } from "../utils/automationConfig.js";
import { computeAuditDiff, inferAuditSeverity } from "../utils/auditDiff.js";

/**
 * Bộ kiểm thử Cổng Khách hàng (/portal), Tự động hóa Đa kênh & Bảo mật Webhook / Audit Diff
 */

function last4Digits(phone = "") {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : digits;
}

function verifyPortalLookupPhone(storedPhones = [], inputPhone = "") {
  const input = last4Digits(inputPhone);
  if (!input || input.length < 4) return false;
  return storedPhones.filter(Boolean).some((stored) => last4Digits(stored) === input);
}

function verifyTelegramWebhook({ expectedSecret, headerSecret, allowedChatIds, incomingChatId }) {
  if (!expectedSecret) {
    return { allowed: false, status: 503, reason: "WEBHOOK_SECRET_NOT_CONFIGURED" };
  }
  if (!timingSafeEqualStrings(headerSecret || "", expectedSecret)) {
    return { allowed: false, status: 403, reason: "INVALID_SECRET_TOKEN" };
  }
  if (Array.isArray(allowedChatIds) && allowedChatIds.length > 0) {
    if (!allowedChatIds.includes(String(incomingChatId))) {
      return { allowed: false, status: 403, reason: "UNAUTHORIZED_CHAT_ID" };
    }
  }
  return { allowed: true, status: 200 };
}

describe("Customer Portal, Automation Config & Webhook Security", () => {
  it("verifies last 4 digits of customer phone across formatting variations", () => {
    assert.equal(verifyPortalLookupPhone(["0901 234 567"], "4567"), true);
    assert.equal(verifyPortalLookupPhone(["+84901234567"], "0901234567"), true);
    assert.equal(verifyPortalLookupPhone(["0901234567"], "9999"), false);
    assert.equal(verifyPortalLookupPhone(["0901234567"], "567"), false);
    assert.equal(verifyPortalLookupPhone([], "4567"), false);
  });

  it("enforces fail-closed Telegram webhook verification (secret + chatId allowlist)", () => {
    assert.equal(
      verifyTelegramWebhook({
        expectedSecret: "",
        headerSecret: "anything",
        allowedChatIds: ["123"],
        incomingChatId: "123",
      }).status,
      503
    );

    assert.equal(
      verifyTelegramWebhook({
        expectedSecret: "super-secret",
        headerSecret: "wrong-secret",
        allowedChatIds: ["123"],
        incomingChatId: "123",
      }).status,
      403
    );

    assert.equal(
      verifyTelegramWebhook({
        expectedSecret: "super-secret",
        headerSecret: "super-secret",
        allowedChatIds: ["123"],
        incomingChatId: "999",
      }).status,
      403
    );

    assert.equal(
      verifyTelegramWebhook({
        expectedSecret: "super-secret",
        headerSecret: "super-secret",
        allowedChatIds: ["123"],
        incomingChatId: "123",
      }).allowed,
      true
    );
  });

  it("validates Zalo/External Webhook URL against SSRF and normalizes automation config", () => {
    assert.equal(validateExternalWebhookUrl("https://openapi.zalo.me/v3.0/oa/message/cs").valid, true);
    assert.equal(validateExternalWebhookUrl("http://127.0.0.1:5000/api/v1/users").valid, false);
    assert.equal(validateExternalWebhookUrl("http://10.0.0.5/internal").valid, false);

    const merged = mergeAutomationConfig(DEFAULT_AUTOMATION_CONFIG, {
      channels: {
        telegram: { enabled: true, chat_id: "123456" },
        zalo: { enabled: true, mode: "webhook", webhook_url: "https://hooks.company.vn/zalo-erp" },
      },
    });

    assert.equal(merged.channels.telegram.enabled, true);
    assert.equal(merged.channels.telegram.chat_id, "123456");
    assert.equal(merged.channels.zalo.enabled, true);
    assert.equal(merged.channels.zalo.webhook_url, "https://hooks.company.vn/zalo-erp");
  });

  it("computes visual audit diff, infers severity, and prevents ReDoS in safe regex escaping", () => {
    const diff = computeAuditDiff(
      { trang_thai: "cho_duyet", so_luong: 100 },
      { trang_thai: "da_duyet", so_luong: 95 }
    );
    assert.ok(diff && Array.isArray(diff.fields));
    const fields = diff.fields.map((d) => d.field);
    assert.ok(fields.includes("trang_thai"));
    assert.ok(fields.includes("so_luong"));
    assert.equal(inferAuditSeverity("APPROVE_ADJUSTMENT", "dieu_chinh_kho"), "critical");
    assert.equal(inferAuditSeverity("UPDATE", "san_pham"), "warning");

    const malicious = "(a+)+$".repeat(50);
    const escaped = escapeSafeRegexPattern(malicious);
    assert.ok(escaped.length <= 200);
    assert.doesNotThrow(() => new RegExp(escaped, "i"));
  });
});
