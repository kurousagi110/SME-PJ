import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  timingSafeEqualStrings,
  validateExternalWebhookUrl,
  escapeSafeRegexPattern,
} from "../utils/securityHelpers.js";

describe("Security Helpers", () => {
  it("timingSafeEqualStrings compares secrets safely", () => {
    assert.equal(timingSafeEqualStrings("secret-123", "secret-123"), true);
    assert.equal(timingSafeEqualStrings("secret-123", "secret-124"), false);
    assert.equal(timingSafeEqualStrings("short", "much-longer-secret"), false);
    assert.equal(timingSafeEqualStrings("", ""), false);
    assert.equal(timingSafeEqualStrings(null, "secret"), false);
  });

  it("validateExternalWebhookUrl blocks SSRF targets and allows valid HTTPS webhooks", () => {
    assert.equal(validateExternalWebhookUrl("https://hooks.example.com/zalo").valid, true);
    assert.equal(validateExternalWebhookUrl("http://localhost:5000/api").valid, false);
    assert.equal(validateExternalWebhookUrl("http://127.0.0.1:8080/hook").valid, false);
    assert.equal(validateExternalWebhookUrl("http://169.254.169.254/latest/meta-data/").valid, false);
    assert.equal(validateExternalWebhookUrl("http://db:27017/").valid, false);
    assert.equal(validateExternalWebhookUrl("http://192.168.1.10/admin").valid, false);
    assert.equal(validateExternalWebhookUrl("https://user:pass@hooks.example.com/zalo").valid, false);
    assert.equal(validateExternalWebhookUrl("ftp://hooks.example.com/file").valid, false);
  });

  it("escapeSafeRegexPattern escapes metacharacters and enforces length cap", () => {
    const escaped = escapeSafeRegexPattern("DH-[2026].*(test)?");
    assert.equal(escaped, "DH-\\[2026\\]\\.\\*\\(test\\)\\?");
    assert.doesNotThrow(() => new RegExp(escaped, "i"));

    const longInput = "a".repeat(250);
    assert.equal(escapeSafeRegexPattern(longInput).length, 100);
  });
});
