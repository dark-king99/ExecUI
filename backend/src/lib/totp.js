/**
 * TOTP two-factor auth (RFC 6238 / RFC 4226) — plain node:crypto, no deps.
 * Compatible with Google Authenticator, Authy, 1Password, etc.
 */
import crypto from "crypto";

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Random base32 secret suitable for authenticator apps. */
export function generateSecret(bytes = 20) {
  const buf = crypto.randomBytes(bytes);
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str) {
  const clean = String(str).toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0, value = 0;
  const out = [];
  for (const c of clean) {
    value = (value << 5) | B32.indexOf(c);
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

/** Current 6-digit code for a secret (step offsets support clock drift). */
export function totp(secret, { period = 30, digits = 6, timestamp = Date.now(), step = 0 } = {}) {
  const counter = Math.floor(timestamp / 1000 / period) + step;
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", base32Decode(secret)).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits;
  return String(code).padStart(digits, "0");
}

/** Verify a user-supplied code, allowing ±window steps of clock drift. */
export function verifyTotp(secret, token, window = 1) {
  if (!secret || !token) return false;
  const t = String(token).replace(/\s/g, "");
  if (!/^\d{6}$/.test(t)) return false;
  for (let s = -window; s <= window; s++) {
    const expected = totp(secret, { step: s });
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(t))) return true;
  }
  return false;
}

/** otpauth:// provisioning URI (paste into an authenticator app or QR encoder). */
export function otpauthUri(secret, { label, issuer = "ExecUI" } = {}) {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label ?? "user")}` +
    `?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
