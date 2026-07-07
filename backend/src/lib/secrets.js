/**
 * Secret encryption for the outbound integration store.
 *
 * Credentials for EXTERNAL services (third-party API tokens, webhook signing
 * secrets) are encrypted at rest with AES-256-GCM. The database only ever
 * holds ciphertext; the master key lives in the environment (SECRETS_KEY),
 * never in the DB and never sent to the client.
 *
 * Set SECRETS_KEY in .env for production. If it's absent we derive a key from
 * JWT_SECRET so the feature works out of the box in development — but a
 * dedicated, rotated SECRETS_KEY is strongly recommended.
 */
import crypto from "crypto";

const RAW = process.env.SECRETS_KEY || process.env.JWT_SECRET || "execui-dev-secrets-key";
const KEY = crypto.createHash("sha256").update(RAW).digest(); // 32-byte key

if (!process.env.SECRETS_KEY) {
  console.warn("⚠️  SECRETS_KEY not set — deriving the integration encryption key from JWT_SECRET. Set a dedicated SECRETS_KEY in .env for production.");
}

/** Encrypt a plaintext secret. Returns base64 ciphertext + iv + auth tag. */
export function encryptSecret(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  return {
    ciphertext: ct.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

/** Decrypt a stored secret (server-side only). Throws if tampered/keys changed. */
export function decryptSecret({ ciphertext, iv, tag }) {
  if (!ciphertext || !iv || !tag) return null;
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
}

export const last4 = (s) => (s ? String(s).slice(-4) : null);
