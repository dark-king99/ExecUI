import crypto from "crypto";
import prisma from "../../config/database.js";

const KEY_PREFIX = "exk_live_";
const VALID_SCOPES = ["read", "write"];

const sha256 = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");

/** Mint a new secret. The plaintext is returned ONCE; only its hash is stored. */
function mint() {
  const secret = crypto.randomBytes(24).toString("base64url"); // ~32 chars
  const key = `${KEY_PREFIX}${secret}`;
  return { key, hash: sha256(key), prefix: `${key.slice(0, 16)}…` };
}

function normalizeScopes(scopes) {
  const list = Array.isArray(scopes) ? scopes : ["read"];
  const filtered = list.filter((s) => VALID_SCOPES.includes(s));
  return filtered.length ? [...new Set(filtered)] : ["read"];
}

function statusOf(k) {
  if (k.revokedAt) return "revoked";
  if (k.expiresAt && new Date(k.expiresAt) < new Date()) return "expired";
  return "active";
}

function shape(k) {
  return {
    id: k.id,
    name: k.name,
    prefix: k.prefix,
    scopes: k.scopes,
    status: statusOf(k),
    created: new Date(k.createdAt).toLocaleDateString(),
    lastUsed: k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "Never",
    expiresAt: k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : null,
  };
}

export async function listKeys(tenantId) {
  const keys = await prisma.apiKey.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
  return keys.map(shape);
}

export async function createKey(tenantId, userId, { name, scopes, expiresInDays } = {}) {
  const trimmed = String(name || "").trim();
  if (!trimmed) throw new Error("A name is required for the API key");
  const { key, hash, prefix } = mint();
  const expiresAt = expiresInDays ? new Date(Date.now() + Number(expiresInDays) * 86400000) : null;
  const record = await prisma.apiKey.create({
    data: { tenantId, name: trimmed, prefix, hash, scopes: normalizeScopes(scopes), createdById: userId ?? null, expiresAt },
  });
  // The plaintext key is surfaced exactly once here and never persisted.
  return { ...shape(record), key };
}

export async function revokeKey(tenantId, id) {
  const k = await prisma.apiKey.findFirst({ where: { id, tenantId } });
  if (!k) throw new Error("API key not found");
  await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  return { revoked: true };
}

export async function rotateKey(tenantId, id) {
  const existing = await prisma.apiKey.findFirst({ where: { id, tenantId } });
  if (!existing) throw new Error("API key not found");
  const { key, hash, prefix } = mint();
  const record = await prisma.apiKey.update({
    where: { id },
    data: { hash, prefix, lastUsedAt: null, revokedAt: null },
  });
  return { ...shape(record), key };
}

/**
 * Verify an inbound API key (used by the integration auth middleware).
 * Returns the resolved tenant + scopes, or null if invalid/revoked/expired.
 */
export async function verifyKey(rawKey, ip) {
  if (!rawKey || !rawKey.startsWith(KEY_PREFIX)) return null;
  const k = await prisma.apiKey.findUnique({ where: { hash: sha256(rawKey) } });
  if (!k || k.revokedAt) return null;
  if (k.expiresAt && new Date(k.expiresAt) < new Date()) return null;

  // Throttle last-used writes to at most once per minute to avoid a DB write per request.
  if (!k.lastUsedAt || Date.now() - new Date(k.lastUsedAt).getTime() > 60_000) {
    prisma.apiKey.update({ where: { id: k.id }, data: { lastUsedAt: new Date(), lastUsedIp: ip ?? null } }).catch(() => {});
  }
  return { tenantId: k.tenantId, scopes: k.scopes, keyId: k.id, name: k.name, createdById: k.createdById };
}
