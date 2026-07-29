/**
 * API token issuance and verification.
 *
 * Tokens are treated like passwords: the plaintext is generated once, returned
 * once, and never stored — only a SHA-256 hash is kept, which is also the lookup
 * key. A leaked database therefore yields no usable credentials, and "show me
 * the token again" is impossible by design rather than by policy.
 *
 * SHA-256 (not bcrypt) is the right primitive here: these are 256 bits of
 * machine-generated entropy, so there is nothing to brute-force, and every API
 * request needs the lookup to be fast.
 */
import crypto from "crypto";
import prisma from "../../config/database.js";
import { SCOPES } from "./api.resources.js";

const PREFIX = "execui_live_";
const PREVIEW_LEN = PREFIX.length + 6;

export const hashToken = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");

/** Generate a new opaque token: `execui_live_<43 url-safe chars>`. */
export function generateToken() {
  const raw = crypto.randomBytes(32).toString("base64url");
  return `${PREFIX}${raw}`;
}

export function isApiToken(value) {
  return typeof value === "string" && value.startsWith(PREFIX);
}

const shape = (t) => ({
  id: t.id,
  name: t.name,
  prefix: t.prefix,
  scopes: t.scopes,
  lastUsedAt: t.lastUsedAt,
  lastUsedIp: t.lastUsedIp,
  expiresAt: t.expiresAt,
  revokedAt: t.revokedAt,
  active: !t.revokedAt && (!t.expiresAt || t.expiresAt > new Date()),
  createdAt: t.createdAt,
});

export async function listTokens() {
  const rows = await prisma.apiToken.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(shape);
}

/**
 * Issue a token. The plaintext is returned exactly once, in `token`.
 * `expiresInDays` is optional; omitting it creates a non-expiring credential.
 */
export async function createToken(userId, { name, scopes = [], expiresInDays } = {}) {
  const err = (m) => { const e = new Error(m); e.status = 400; return e; };
  const label = String(name || "").trim();
  if (!label) throw err("Give the token a name so you can recognise it later");

  const requested = [...new Set(Array.isArray(scopes) ? scopes : [scopes])].filter(Boolean);
  if (!requested.length) throw err("Select at least one scope");
  const unknown = requested.filter((s) => !SCOPES.includes(s));
  if (unknown.length) throw err(`Unknown scope(s): ${unknown.join(", ")}`);

  let expiresAt = null;
  if (expiresInDays != null && expiresInDays !== "") {
    const days = Number(expiresInDays);
    if (!Number.isFinite(days) || days <= 0 || days > 3650) throw err("Expiry must be between 1 and 3650 days");
    expiresAt = new Date(Date.now() + days * 86400000);
  }

  const token = generateToken();
  const row = await prisma.apiToken.create({
    data: {
      name: label.slice(0, 120),
      tokenHash: hashToken(token),
      prefix: `${token.slice(0, PREVIEW_LEN)}…`,
      scopes: requested,
      expiresAt,
      createdById: userId,
    },
  });
  // The only time the plaintext ever leaves this function.
  return { ...shape(row), token };
}

export async function revokeToken(id) {
  const existing = await prisma.apiToken.findFirst({ where: { id } });
  if (!existing) { const e = new Error("Token not found"); e.status = 404; throw e; }
  const row = await prisma.apiToken.update({ where: { id }, data: { revokedAt: new Date() } });
  return shape(row);
}

export async function deleteToken(id) {
  const existing = await prisma.apiToken.findFirst({ where: { id } });
  if (!existing) { const e = new Error("Token not found"); e.status = 404; throw e; }
  await prisma.apiToken.delete({ where: { id } });
  return { deleted: true, id };
}

/**
 * Resolve a plaintext token to its record, or null when it is unknown, revoked
 * or expired. Runs unscoped: the request has no tenant context yet — the token
 * itself is what establishes it.
 */
export async function verifyToken(plaintext) {
  if (!isApiToken(plaintext)) return null;
  const row = await prisma.apiToken.findUnique({ where: { tokenHash: hashToken(plaintext) } });
  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt && row.expiresAt <= new Date()) return null;
  return row;
}

/** Record usage. Best-effort — never fail a request over telemetry. */
export function touchToken(id, ip) {
  return prisma.apiToken
    .update({ where: { id }, data: { lastUsedAt: new Date(), lastUsedIp: ip || null } })
    .catch(() => {});
}
