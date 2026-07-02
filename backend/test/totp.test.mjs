import test from "node:test";
import assert from "node:assert/strict";
import { generateSecret, totp, verifyTotp, otpauthUri } from "../src/lib/totp.js";

// RFC 6238 test vector: ASCII secret "12345678901234567890" in base32.
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

test("matches the RFC 6238 SHA-1 test vectors (6-digit)", () => {
  // T=59s → 8-digit 94287082 → last 6 digits 287082
  assert.equal(totp(RFC_SECRET, { timestamp: 59_000 }), "287082");
  // T=1111111109s → 07081804 → 081804
  assert.equal(totp(RFC_SECRET, { timestamp: 1_111_111_109_000 }), "081804");
});

test("verifyTotp accepts the current code and ±1 step of drift", () => {
  const secret = generateSecret();
  const now = Date.now();
  assert.equal(verifyTotp(secret, totp(secret, { timestamp: now })), true);
  assert.equal(verifyTotp(secret, totp(secret, { timestamp: now - 30_000 })), true);
  assert.equal(verifyTotp(secret, "000000") && verifyTotp(secret, "999999"), false);
  assert.equal(verifyTotp(secret, "12345"), false);   // wrong length
  assert.equal(verifyTotp(secret, null), false);
  assert.equal(verifyTotp(null, "123456"), false);
});

test("secrets are valid base32 and the otpauth URI is well-formed", () => {
  const secret = generateSecret();
  assert.match(secret, /^[A-Z2-7]{32}$/);
  const uri = otpauthUri(secret, { label: "user@example.com" });
  assert.ok(uri.startsWith("otpauth://totp/ExecUI:user%40example.com?secret="));
  assert.ok(uri.includes(`secret=${secret}`));
});
