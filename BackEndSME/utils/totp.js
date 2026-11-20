/**
 * totp.js — Xác thực 2 lớp (2FA) chuẩn RFC 6238 (TOTP) & RFC 4226 (HOTP)
 * Chỉ dùng Node.js built-in `node:crypto`, không phụ thuộc thư viện ngoài.
 * Hỗ trợ:
 * - Mã hóa/giải mã secret bằng AES-256-GCM
 * - Kiểm tra OTP an toàn timing-safe với cửa sổ lệch ±1 chu kỳ (30s)
 * - Sinh 8 mã khôi phục (Recovery Codes) dạng XXXX-XXXX
 */

import crypto from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buffer) {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(str) {
  const clean = String(str || "")
    .toUpperCase()
    .replace(/=+$/g, "")
    .replace(/\s+/g, "");

  let bits = 0;
  let value = 0;
  const bytes = [];

  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) {
      throw new Error("Invalid Base32 character in TOTP secret");
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export function generateTotpSecret(numBytes = 20) {
  return base32Encode(crypto.randomBytes(numBytes));
}

export function generateHotp(secretBase32, counter, digits = 6) {
  const key = base32Decode(secretBase32);
  const counterBuf = Buffer.alloc(8);
  const bigCounter = BigInt(counter);
  counterBuf.writeBigUInt64BE(bigCounter);

  const hmac = crypto.createHmac("sha1", key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const mod = 10 ** digits;
  return String(binary % mod).padStart(digits, "0");
}

export function generateTotp(
  secretBase32,
  timestampMs = Date.now(),
  stepSeconds = 30,
  digits = 6
) {
  const counter = Math.floor(timestampMs / 1000 / stepSeconds);
  return generateHotp(secretBase32, counter, digits);
}

export function verifyTotp(
  secretBase32,
  token,
  { timestampMs = Date.now(), window = 1, stepSeconds = 30, digits = 6 } = {}
) {
  const cleanToken = String(token || "").trim().replace(/\s+/g, "");
  if (!/^\d+$/.test(cleanToken) || cleanToken.length !== digits) {
    return false;
  }

  const baseCounter = Math.floor(timestampMs / 1000 / stepSeconds);
  const tokenBuf = Buffer.from(cleanToken, "utf8");

  for (let delta = -window; delta <= window; delta++) {
    const candidateCounter = baseCounter + delta;
    if (candidateCounter < 0) continue;
    const expected = generateHotp(secretBase32, candidateCounter, digits);
    const expectedBuf = Buffer.from(expected, "utf8");
    if (
      expectedBuf.length === tokenBuf.length &&
      crypto.timingSafeEqual(expectedBuf, tokenBuf)
    ) {
      return true;
    }
  }
  return false;
}

export function buildOtpAuthUri({
  secret,
  accountName,
  issuer = "SME ERP",
}) {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

function deriveAesKey(keyMaterial) {
  const raw = keyMaterial || process.env.TOTP_ENC_KEY || process.env.JWT_SECRET;
  if (!raw) {
    throw new Error("Missing TOTP_ENC_KEY or JWT_SECRET for TOTP encryption");
  }
  return crypto.createHash("sha256").update(String(raw)).digest();
}

export function encryptTotpSecret(secretBase32, keyMaterial) {
  const key = deriveAesKey(keyMaterial);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(secretBase32), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptTotpSecret(payload, keyMaterial) {
  if (!payload || typeof payload !== "string") {
    throw new Error("Invalid encrypted TOTP secret");
  }
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted TOTP secret");
  }
  const [ivHex, tagHex, dataHex] = parts;
  const key = deriveAesKey(keyMaterial);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function generateRecoveryCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}

export function normalizeRecoveryCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}
