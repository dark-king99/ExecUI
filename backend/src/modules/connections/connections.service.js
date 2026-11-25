/**
 * Connected accounts — connecting, storing, refreshing and disconnecting.
 *
 * Two kinds of connection:
 *   personal       anyone connects their OWN mailbox and calendar. Emails and
 *                  meetings with CRM contacts are logged to CRM, and ExecAI can
 *                  read that person's mail and calendar for them — nobody else.
 *   support_inbox  an admin connects the organization's support mailbox; new
 *                  mail there becomes help-desk tickets. One per organization.
 *
 * The rules this file keeps:
 *   • A connection exists only after the provider returned tokens AND told us
 *     which account they belong to. Nothing is ever recorded as connected on
 *     the strength of a redirect alone.
 *   • Tokens are encrypted before they touch the database and are never part
 *     of any response. `shape()` is the only way a connection leaves here.
 *   • The OAuth `state` is a single-use, ten-minute server record bound to the
 *     person who clicked Connect, with a PKCE verifier — a callback can't be
 *     replayed, forged, or completed into someone else's account.
 */
import prisma from "../../config/database.js";
import { runUnscoped } from "../../lib/tenantContext.js";
import { encryptSecret, decryptSecret } from "../../lib/secrets.js";
import { createPkce } from "../../lib/oidc.js";
import { log } from "../../lib/logger.js";
import { getProvider, providerList, ProviderError } from "./providers.js";

export const PURPOSES = ["personal", "support_inbox"];
const REQUEST_TTL_MS = 10 * 60_000;
const ADMIN_ROLES = new Set(["enterprise_admin", "system_admin"]);

const err = (message, status = 400) => Object.assign(new Error(message), { status });

/** Where the provider sends the browser back. Must match the app registration exactly. */
export function redirectUri(providerId) {
  const base = (process.env.OAUTH_REDIRECT_BASE || process.env.APP_URL || `http://localhost:${process.env.PORT || 5555}`).replace(/\/$/, "");
  return `${base}/api/connections/oauth/${providerId}/callback`;
}

/** Where the person lands after connecting (the SPA). */
export const frontendUrl = (path) =>
  `${(process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "")}${path}`;

/** The only view of a connection that ever leaves this module. */
export const shape = (c) => ({
  id: c.id,
  provider: c.provider,
  purpose: c.purpose,
  accountEmail: c.accountEmail,
  status: c.status,
  logEmails: c.logEmails,
  logMeetings: c.logMeetings,
  lastSyncAt: c.lastSyncAt,
  lastError: c.lastError,
  connectedAt: c.createdAt,
  // Support inbox only: may help-desk replies be sent from it?
  canSend: canSend(c),
});

/** Did the provider grant permission to send mail from this connection? */
export function canSend(c) {
  const p = getProvider(c?.provider);
  return !!p?.sendScope && (c?.scopes ?? []).some((s) => s === p.sendScope || s.toLowerCase() === p.sendScope.toLowerCase());
}

export const providers = () => providerList();

/** My own connections, plus the organization's support inbox for admins. */
export async function listConnections({ tenantId, userId, role }) {
  const rows = await prisma.oAuthConnection.findMany({
    where: {
      tenantId,
      OR: [
        { userId, purpose: "personal" },
        ...(ADMIN_ROLES.has(role) ? [{ purpose: "support_inbox" }] : []),
      ],
    },
    orderBy: { createdAt: "asc" },
  });
  return { providers: providers(), connections: rows.map(shape) };
}

// ── Connect: step 1 ──────────────────────────────────────────────────────────
export async function startConnect({ tenantId, userId, role }, providerId, purpose = "personal") {
  const provider = getProvider(providerId);
  if (!provider) throw err("Unknown provider", 404);
  if (!provider.configured()) {
    throw err(`${provider.label} isn't set up on this ExecUI server yet. An administrator needs to add its OAuth client credentials.`, 409);
  }
  if (!PURPOSES.includes(purpose)) throw err("Unknown connection type");
  if (purpose === "support_inbox" && !ADMIN_ROLES.has(role)) throw err("Only an admin can connect the support inbox.", 403);

  const { codeVerifier, codeChallenge } = createPkce();
  const request = await prisma.oAuthRequest.create({
    data: { tenantId, userId, provider: providerId, purpose, codeVerifier, expiresAt: new Date(Date.now() + REQUEST_TTL_MS) },
  });
  return { url: provider.authorizeUrl({ redirectUri: redirectUri(providerId), state: request.id, codeChallenge, purpose }) };
}

// ── Connect: step 2 (the provider's redirect) ────────────────────────────────
/**
 * Finish a connection. Runs unscoped — the browser arrives here from Google or
 * Microsoft with no session — so the tenant and person come ONLY from the
 * stored request, never from the query string.
 */
export async function completeConnect(providerId, { code, state, error: providerError }) {
  if (!state) throw err("Missing state");
  const request = await runUnscoped(async () => {
    const rec = await prisma.oAuthRequest.findUnique({ where: { id: String(state) } });
    if (!rec || rec.provider !== providerId) throw err("This connection request isn't valid. Start again from ExecUI.");
    if (rec.consumedAt) throw err("This connection request was already used. Start again from ExecUI.");
    if (rec.expiresAt < new Date()) throw err("This connection request expired. Start again from ExecUI.");
    await prisma.oAuthRequest.update({ where: { id: rec.id }, data: { consumedAt: new Date() } });
    return rec;
  });
  if (providerError) throw err(providerError === "access_denied" ? "You declined access, so nothing was connected." : `The provider refused: ${providerError}`);
  if (!code) throw err("The provider didn't return an authorization code.");

  const provider = getProvider(providerId);
  const tokens = await provider.exchangeCode({ code, redirectUri: redirectUri(providerId), codeVerifier: request.codeVerifier, purpose: request.purpose });
  if (!tokens?.access_token) throw err("The provider didn't return an access token, so nothing was connected.");
  const accountEmail = await provider.accountEmail(tokens.access_token);
  if (!accountEmail) throw err("Couldn't read which account was connected, so nothing was saved.");

  const user = await runUnscoped(() => prisma.user.findFirst({ where: { id: request.userId, tenantId: request.tenantId, isActive: true } }));
  if (!user) throw err("Your ExecUI account is no longer active.", 403);

  const access = encryptSecret(tokens.access_token);
  const refresh = tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null;
  const data = {
    accountEmail: String(accountEmail).toLowerCase(),
    // What the provider actually granted — a person can untick a permission on
    // the consent screen, so the request isn't proof of the grant.
    scopes: String(tokens.scope ?? provider.scopesFor(request.purpose).join(" ")).split(/\s+/).filter(Boolean),
    accessCipher: access.ciphertext, accessIv: access.iv, accessTag: access.tag,
    ...(refresh ? { refreshCipher: refresh.ciphertext, refreshIv: refresh.iv, refreshTag: refresh.tag } : {}),
    expiresAt: tokens.expires_in ? new Date(Date.now() + Number(tokens.expires_in) * 1000) : null,
    status: "active",
    lastError: null,
  };

  const connection = await runUnscoped(async () => {
    if (request.purpose === "support_inbox") {
      // One support inbox per organization: connecting a new one replaces it.
      const other = await prisma.oAuthConnection.findFirst({
        where: { tenantId: request.tenantId, purpose: "support_inbox", NOT: { userId: request.userId, provider: providerId } },
      });
      if (other) await prisma.oAuthConnection.delete({ where: { id: other.id } });
    }
    const key = { tenantId: request.tenantId, userId: request.userId, provider: providerId, purpose: request.purpose };
    return prisma.oAuthConnection.upsert({
      where: { tenantId_userId_provider_purpose: key },
      update: data,
      // A new support inbox starts from now: connecting it must not turn
      // months of old mail into tickets.
      create: { ...key, ...data, syncedThrough: request.purpose === "support_inbox" ? new Date() : null },
    });
  });

  await runUnscoped(() => prisma.auditLog.create({
    data: {
      tenantId: request.tenantId, userId: request.userId, action: "connection.connected",
      resource: "connection", resourceId: connection.id,
      detail: `${provider.label} connected (${request.purpose === "support_inbox" ? "support inbox" : "personal"}) as ${data.accountEmail}`,
    },
  })).catch(() => {});
  return { connection: shape(connection), purpose: request.purpose };
}

// ── Manage ───────────────────────────────────────────────────────────────────
async function ownConnection({ tenantId, userId, role }, id) {
  const c = await prisma.oAuthConnection.findFirst({ where: { id: String(id), tenantId } });
  const mine = c && (c.userId === userId && c.purpose === "personal");
  const adminInbox = c && c.purpose === "support_inbox" && ADMIN_ROLES.has(role);
  if (!mine && !adminInbox) throw err("Connection not found", 404);
  return c;
}

export async function updateConnection(actor, id, body = {}) {
  const c = await ownConnection(actor, id);
  const data = {};
  if (typeof body.logEmails === "boolean") data.logEmails = body.logEmails;
  if (typeof body.logMeetings === "boolean") data.logMeetings = body.logMeetings;
  if (!Object.keys(data).length) throw err("Nothing to change");
  return shape(await prisma.oAuthConnection.update({ where: { id: c.id }, data }));
}

/** Disconnect: revoke at the provider where it supports that, then delete our tokens. */
export async function disconnect(actor, id) {
  const c = await ownConnection(actor, id);
  const provider = getProvider(c.provider);
  const token = readRefreshToken(c) ?? readAccessToken(c);
  if (token) await provider?.revoke(token).catch(() => {});
  await prisma.oAuthConnection.delete({ where: { id: c.id } });
  await prisma.auditLog.create({
    data: {
      tenantId: c.tenantId, userId: actor.userId, action: "connection.disconnected",
      resource: "connection", resourceId: c.id, detail: `${provider?.label ?? c.provider} disconnected (${c.accountEmail})`,
    },
  }).catch(() => {});
  return { deleted: true, id: c.id };
}

// ── Tokens ───────────────────────────────────────────────────────────────────
const readAccessToken = (c) => decryptSecret({ ciphertext: c.accessCipher, iv: c.accessIv, tag: c.accessTag });
const readRefreshToken = (c) => (c.refreshCipher ? decryptSecret({ ciphertext: c.refreshCipher, iv: c.refreshIv, tag: c.refreshTag }) : null);

/**
 * A usable access token, refreshed when it's within a minute of expiring.
 * A revoked grant flips the connection to `needs_reauth` — it stays listed so
 * the person can see why, but nothing syncs until they reconnect.
 */
export async function accessTokenFor(connection) {
  if (connection.status !== "active") throw new ProviderError("This account needs to be reconnected.", { reauth: true });
  const fresh = !connection.expiresAt || connection.expiresAt.getTime() > Date.now() + 60_000;
  if (fresh) return readAccessToken(connection);

  const refreshToken = readRefreshToken(connection);
  if (!refreshToken) {
    await markNeedsReauth(connection, "The provider didn't grant offline access; reconnect to keep syncing.");
    throw new ProviderError("No refresh token", { reauth: true });
  }
  try {
    const tokens = await getProvider(connection.provider).refresh(refreshToken, connection.purpose);
    const access = encryptSecret(tokens.access_token);
    // Microsoft rotates refresh tokens; keep the newest.
    const rotated = tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null;
    await runUnscoped(() => prisma.oAuthConnection.update({
      where: { id: connection.id },
      data: {
        accessCipher: access.ciphertext, accessIv: access.iv, accessTag: access.tag,
        ...(rotated ? { refreshCipher: rotated.ciphertext, refreshIv: rotated.iv, refreshTag: rotated.tag } : {}),
        expiresAt: tokens.expires_in ? new Date(Date.now() + Number(tokens.expires_in) * 1000) : null,
      },
    }));
    return tokens.access_token;
  } catch (e) {
    if (e.reauth) await markNeedsReauth(connection, "Access was revoked or expired. Reconnect to resume syncing.");
    throw e;
  }
}

export async function markNeedsReauth(connection, reason) {
  await runUnscoped(() => prisma.oAuthConnection.update({
    where: { id: connection.id }, data: { status: "needs_reauth", lastError: reason },
  })).catch((e) => log.warn?.("connection_mark_failed", { id: connection.id, error: e.message }));
}

/** The signed-in person's active personal connection, if any (for ExecAI). */
export async function personalConnection(tenantId, userId) {
  return prisma.oAuthConnection.findFirst({
    where: { tenantId, userId, purpose: "personal", status: "active" },
    orderBy: { updatedAt: "desc" },
  });
}

/** Drop finished or abandoned connect attempts. */
export async function pruneRequests() {
  return runUnscoped(() => prisma.oAuthRequest.deleteMany({
    where: { OR: [{ expiresAt: { lt: new Date() } }, { consumedAt: { not: null } }] },
  }));
}
