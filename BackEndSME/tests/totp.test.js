import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  generateTotp,
  verifyTotp,
  buildOtpAuthUri,
  encryptTotpSecret,
  decryptTotpSecret,
  generateRecoveryCodes,
  normalizeRecoveryCode,
} from "../utils/totp.js";

describe("TOTP 2FA (RFC 6238) & AES-256-GCM Helpers", () => {
  // Official RFC 6238 SHA-1 test secret: "12345678901234567890"
  const rfcSecretBase32 = base32Encode(Buffer.from("12345678901234567890", "ascii"));

  it("matches official RFC 6238 SHA-1 test vectors", () => {
    assert.equal(rfcSecretBase32, "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    assert.equal(generateTotp(rfcSecretBase32, 59 * 1000, 30, 8), "94287082");
    assert.equal(generateTotp(rfcSecretBase32, 1111111109 * 1000, 30, 8), "07081804");
    assert.equal(generateTotp(rfcSecretBase32, 1111111111 * 1000, 30, 8), "14050471");
    assert.equal(generateTotp(rfcSecretBase32, 1234567890 * 1000, 30, 8), "89005924");
    assert.equal(generateTotp(rfcSecretBase32, 2000000000 * 1000, 30, 8), "69279037");
  });

  it("verifies valid TOTP within +/-1 step window and rejects out-of-window codes", () => {
    const nowMs = 1_700_000_000_000;
    const prevCode = generateTotp(rfcSecretBase32, nowMs - 30_000, 30, 6);
    const currCode = generateTotp(rfcSecretBase32, nowMs, 30, 6);
    const nextCode = generateTotp(rfcSecretBase32, nowMs + 30_000, 30, 6);
    const oldCode = generateTotp(rfcSecretBase32, nowMs - 90_000, 30, 6);

    assert.equal(verifyTotp(rfcSecretBase32, prevCode, { timestampMs: nowMs, window: 1 }), true);
    assert.equal(verifyTotp(rfcSecretBase32, currCode, { timestampMs: nowMs, window: 1 }), true);
    assert.equal(verifyTotp(rfcSecretBase32, nextCode, { timestampMs: nowMs, window: 1 }), true);
    assert.equal(verifyTotp(rfcSecretBase32, oldCode, { timestampMs: nowMs, window: 1 }), false);
    assert.equal(verifyTotp(rfcSecretBase32, "abcdef", { timestampMs: nowMs, window: 1 }), false);
  });

  it("round-trips Base32 and AES-256-GCM secret encryption", () => {
    const secret = generateTotpSecret();
    const decoded = base32Decode(secret);
    assert.equal(decoded.length, 20);
    assert.equal(base32Encode(decoded), secret);

    const encKey = "test-totp-encryption-key-2026";
    const encrypted = encryptTotpSecret(secret, encKey);
    assert.notEqual(encrypted, secret);
    assert.equal(decryptTotpSecret(encrypted, encKey), secret);

    assert.throws(() => decryptTotpSecret(encrypted, "wrong-key"));
  });

  it("builds valid otpauth URI and unique single-use recovery codes", () => {
    const uri = buildOtpAuthUri({ secret: "JBSWY3DPEHPK3PXP", accountName: "admin", issuer: "SME ERP" });
    assert.match(uri, /^otpauth:\/\/totp\//);
    assert.match(uri, /secret=JBSWY3DPEHPK3PXP/);

    const codes = generateRecoveryCodes(8);
    assert.equal(codes.length, 8);
    assert.equal(new Set(codes).size, 8);
    for (const c of codes) {
      assert.match(c, /^[A-F0-9]{4}-[A-F0-9]{4}$/);
      assert.equal(normalizeRecoveryCode(c).length, 8);
    }
  });
});
