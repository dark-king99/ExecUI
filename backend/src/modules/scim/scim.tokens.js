/**
 * SCIM bearer tokens — the credential an IdP uses to call the provisioning API.
 *
 * Only a SHA-256 hash is stored, so a database leak can't be replayed against
 * the API, and the plaintext is returned exactly once at creation (same model
 * as GitHub/Stripe API keys).
 */
import crypto from "crypto";
import prisma from "../../config/database.js";
import { runUnscoped } from "../../lib/tenantContext.js";

const PREFIX = "execui_scim_";

export const hashToken = (raw) => crypto.createHash("sha256").update(String(raw)).digest("hex");

const shape = (t) => ({
  id: t.id,
  name: t.name,
  last4: t.last4,
  createdAt: t.createdAt,
  lastUsedAt: t.lastUsedAt,
  revokedAt: t.revokedAt,
  active: !t.revokedAt,
});

export async function listTokens(tenantId) {
  const rows = await prisma.scimToken.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
  return { tokens: rows.map(shape) };
}

/** Issue a token. The plaintext is returned ONCE and never stored. */
export async function createToken(tenantId, { name } = {}, createdById = null) {
  const raw = PREFIX + crypto.randomBytes(32).toString("base64url");
  const row = await prisma.scimToken.create({
    data: {
      tenantId,
      name: String(name || "SCIM provisioning").slice(0, 80),
      tokenHash: hashToken(raw),
      last4: raw.slice(-4),
      createdById,
    },
  });
  return { ...shape(row), token: raw, warning: "Copy this token now — it is shown only once." };
}

export async function revokeToken(tenantId, id) {
  const row = await prisma.scimToken.findFirst({ where: { id, tenantId } });
  if (!row) {
    const e = new Error("Token not found");
    e.status = 404;
    throw e;
  }
  await prisma.scimToken.update({ where: { id }, data: { revokedAt: new Date() } });
  return { revoked: true };
}

/**
 * Resolve a presented bearer token to its tenant. Runs unscoped because the
 * caller has no session yet — the token itself IS the tenant claim.
 */
export async function resolveToken(raw) {
  if (!raw) return null;
  const tokenHash = hashToken(raw);
  return runUnscoped(async () => {
    const row = await prisma.scimToken.findUnique({ where: { tokenHash } });
    if (!row || row.revokedAt) return null;
    // Best-effort last-used stamp (helps admins spot a dead integration).
    prisma.scimToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
    return { tenantId: row.tenantId, tokenId: row.id };
  });
}
