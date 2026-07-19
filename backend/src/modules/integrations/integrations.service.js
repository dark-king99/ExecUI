import prisma from "../../config/database.js";
import { encryptSecret, decryptSecret, last4 } from "../../lib/secrets.js";

const KINDS = ["api", "webhook", "slack", "custom"];
const AUTH_TYPES = ["bearer", "header", "none"];

// Masked view — the decrypted secret is NEVER returned to the client.
function shape(c) {
  return {
    id: c.id,
    name: c.name,
    kind: c.kind,
    baseUrl: c.baseUrl,
    authType: c.authType,
    authHeader: c.authHeader,
    secretLast4: c.secretLast4,
    hasSecret: !!c.secretCipher,
    status: c.status,
    lastUsed: c.lastUsedAt ? new Date(c.lastUsedAt).toLocaleString() : "Never",
    lastStatus: c.lastStatus,
    created: new Date(c.createdAt).toLocaleDateString(),
  };
}

const joinUrl = (base, path) => {
  if (!path) return base;
  return `${base.replace(/\/$/, "")}/${String(path).replace(/^\//, "")}`;
};

// Build an authenticated outbound request from a stored connection.
function buildRequest(conn, { method = "GET", path = "", body, headers = {} } = {}) {
  const secret = conn.secretCipher
    ? decryptSecret({ ciphertext: conn.secretCipher, iv: conn.secretIv, tag: conn.secretTag })
    : null;
  const h = { Accept: "application/json", ...headers };
  if (conn.authType === "bearer" && secret) h.Authorization = `Bearer ${secret}`;
  else if (conn.authType === "header" && secret && conn.authHeader) h[conn.authHeader] = secret;
  if (body != null) h["Content-Type"] = "application/json";
  return { url: joinUrl(conn.baseUrl, path), options: { method, headers: h, body: body != null ? JSON.stringify(body) : undefined } };
}

async function doFetch(url, options, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const start = Date.now();
  try {
    const resp = await fetch(url, { ...options, signal: ctrl.signal });
    return { ok: resp.ok, status: resp.status, statusText: resp.statusText || "", latencyMs: Date.now() - start };
  } catch (e) {
    return { ok: false, status: 0, statusText: e.name === "AbortError" ? "timed out" : e.message, latencyMs: Date.now() - start };
  } finally {
    clearTimeout(timer);
  }
}

export async function list(tenantId) {
  const rows = await prisma.integrationConnection.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
  return rows.map(shape);
}

export async function create(tenantId, userId, body = {}) {
  const { name, kind, baseUrl, authType, authHeader, secret } = body;
  if (!String(name || "").trim()) throw new Error("A name is required");
  if (!String(baseUrl || "").trim()) throw new Error("A target URL is required");
  if (!/^https?:\/\//i.test(baseUrl)) throw new Error("Target URL must start with http:// or https://");
  const at = AUTH_TYPES.includes(authType) ? authType : "bearer";
  if (at !== "none" && !secret) throw new Error("A secret is required for the selected auth type");
  const enc = secret ? encryptSecret(secret) : {};
  const c = await prisma.integrationConnection.create({
    data: {
      tenantId, name: name.trim(), kind: KINDS.includes(kind) ? kind : "api", baseUrl: baseUrl.trim(),
      authType: at, authHeader: at === "header" ? (authHeader || "X-API-Key") : null,
      secretCipher: enc.ciphertext ?? null, secretIv: enc.iv ?? null, secretTag: enc.tag ?? null,
      secretLast4: secret ? last4(secret) : null, createdById: userId ?? null,
    },
  });
  return shape(c);
}

export async function update(tenantId, id, body = {}) {
  const existing = await prisma.integrationConnection.findFirst({ where: { id, tenantId } });
  if (!existing) throw new Error("Connection not found");
  const data = {};
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.baseUrl !== undefined) data.baseUrl = String(body.baseUrl).trim();
  if (body.kind !== undefined && KINDS.includes(body.kind)) data.kind = body.kind;
  if (body.authType !== undefined && AUTH_TYPES.includes(body.authType)) data.authType = body.authType;
  if (body.authHeader !== undefined) data.authHeader = body.authHeader || null;
  if (body.status !== undefined) data.status = body.status === "disabled" ? "disabled" : "active";
  if (body.secret) {
    const enc = encryptSecret(body.secret);
    Object.assign(data, { secretCipher: enc.ciphertext, secretIv: enc.iv, secretTag: enc.tag, secretLast4: last4(body.secret) });
  }
  const c = await prisma.integrationConnection.update({ where: { id }, data });
  return shape(c);
}

export async function remove(tenantId, id) {
  const c = await prisma.integrationConnection.findFirst({ where: { id, tenantId } });
  if (!c) throw new Error("Connection not found");
  await prisma.integrationConnection.delete({ where: { id } });
  return { deleted: true };
}

/** Send a test request to the connection's target and record the outcome. */
export async function test(tenantId, id) {
  const c = await prisma.integrationConnection.findFirst({ where: { id, tenantId } });
  if (!c) throw new Error("Connection not found");
  const { url, options } = buildRequest(c, { method: "GET" });
  const result = await doFetch(url, options);
  await prisma.integrationConnection.update({
    where: { id },
    data: { lastUsedAt: new Date(), lastStatus: result.ok ? `${result.status} OK` : `error: ${result.statusText}` },
  });
  return result;
}

/**
 * Internal helper for the rest of the app to make an authenticated OUTBOUND
 * call through a stored connection (the secret is decrypted here, server-side).
 */
export async function callExternal(tenantId, id, { method = "GET", path = "", body, headers } = {}) {
  const c = await prisma.integrationConnection.findFirst({ where: { id, tenantId } });
  if (!c) throw new Error("Connection not found");
  if (c.status !== "active") throw new Error("Connection is disabled");
  const { url, options } = buildRequest(c, { method, path, body, headers });
  const result = await doFetch(url, options);
  prisma.integrationConnection.update({
    where: { id }, data: { lastUsedAt: new Date(), lastStatus: result.ok ? `${result.status} OK` : `error: ${result.statusText}` },
  }).catch(() => {});
  return result;
}
