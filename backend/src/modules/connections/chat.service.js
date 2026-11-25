/**
 * Posting ExecUI events into Slack and Microsoft Teams channels.
 *
 * An admin decides which categories of event go to which channel:
 *   network_alerts     a device down, a threshold crossed, a collector offline
 *   helpdesk_tickets   a new support ticket
 *   approvals          a new approval request
 *   automation         posts from a workflow's "Post to channel" action
 *
 * Slack posts through the organization's connected Slack app (bot token).
 * Teams posts through a Workflows webhook the admin creates in Teams for a
 * channel ("Post to a channel when a webhook request is received"); its URL is
 * a credential, so it's encrypted and never shown again.
 *
 * Posting is fire-and-forget: a chat outage never blocks the event that
 * triggered it. The last error is kept on the route so an admin can see it.
 * Only titles, short summaries and a link back to ExecUI are posted — never
 * full ticket bodies or customer data beyond a name.
 */
import prisma from "../../config/database.js";
import { runUnscoped } from "../../lib/tenantContext.js";
import { encryptSecret, decryptSecret } from "../../lib/secrets.js";
import { log } from "../../lib/logger.js";
import { getProvider } from "./providers.js";
import { workspaceConnection, accessTokenFor, frontendUrl } from "./connections.service.js";

export const CATEGORIES = {
  network_alerts: "Network alerts",
  helpdesk_tickets: "New help-desk tickets",
  approvals: "Approval requests",
  automation: "Automation posts",
};

const err = (message, status = 400) => Object.assign(new Error(message), { status });

/**
 * Teams Workflows webhooks live on these hosts. Restricting to them means a
 * stored "webhook" can't be pointed at an internal address (SSRF).
 */
export function validateTeamsWebhook(raw) {
  let url;
  try { url = new URL(String(raw)); } catch { throw err("Paste the webhook URL Teams gave you"); }
  const ok = url.protocol === "https:" && /(\.logic\.azure\.com|\.powerplatform\.com|\.webhook\.office\.com)$/i.test(url.hostname);
  if (!ok) throw err("That isn't a Microsoft Teams webhook address. Create one in Teams: channel → Workflows → \"Post to a channel when a webhook request is received\".");
  return url.toString();
}

const shape = (r) => ({
  id: r.id, category: r.category, categoryLabel: CATEGORIES[r.category] ?? r.category, provider: r.provider,
  label: r.label, enabled: r.enabled, lastSentAt: r.lastSentAt, lastError: r.lastError, createdAt: r.createdAt,
});

export async function overview(tenantId) {
  const [routes, slack] = await Promise.all([
    prisma.chatRoute.findMany({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
    workspaceConnection(tenantId, "slack"),
  ]);
  return {
    categories: Object.entries(CATEGORIES).map(([id, label]) => ({ id, label })),
    slack: { configured: getProvider("slack").configured(), connected: !!slack, workspace: slack?.accountEmail ?? null },
    routes: routes.map(shape),
  };
}

export async function slackChannels(tenantId) {
  const conn = await workspaceConnection(tenantId, "slack");
  if (!conn) throw err("Connect Slack first.", 409);
  return getProvider("slack").listChannels(await accessTokenFor(conn));
}

export async function addRoute(tenantId, userId, body = {}) {
  if (!CATEGORIES[body.category]) throw err("Choose what to post");
  const base = { tenantId, category: body.category, createdById: userId ?? null };
  let row;
  if (body.provider === "slack") {
    if (!(await workspaceConnection(tenantId, "slack"))) throw err("Connect Slack first.", 409);
    const channel = String(body.channel ?? "").trim();
    if (!/^[A-Z0-9]{8,12}$/.test(channel)) throw err("Choose a Slack channel");
    row = await prisma.chatRoute.create({ data: { ...base, provider: "slack", slackChannel: channel, label: `#${String(body.channelName ?? channel).replace(/^#/, "").slice(0, 80)}` } });
  } else if (body.provider === "teams") {
    const e = encryptSecret(validateTeamsWebhook(body.webhookUrl));
    const label = String(body.label ?? "").trim().slice(0, 80) || "Teams channel";
    row = await prisma.chatRoute.create({ data: { ...base, provider: "teams", label, webhookCipher: e.ciphertext, webhookIv: e.iv, webhookTag: e.tag } });
  } else {
    throw err("Choose Slack or Teams");
  }
  await prisma.auditLog.create({ data: { tenantId, userId, action: "chat.route.added", resource: "chat_route", resourceId: row.id, detail: `${CATEGORIES[row.category]} → ${row.provider} ${row.label}` } }).catch(() => {});
  return shape(row);
}

export async function removeRoute(tenantId, userId, id) {
  const row = await prisma.chatRoute.findFirst({ where: { id: String(id), tenantId } });
  if (!row) throw err("Not found", 404);
  await prisma.chatRoute.delete({ where: { id: row.id } });
  await prisma.auditLog.create({ data: { tenantId, userId, action: "chat.route.removed", resource: "chat_route", resourceId: row.id, detail: `${CATEGORIES[row.category]} → ${row.provider} ${row.label}` } }).catch(() => {});
  return { deleted: true, id: row.id };
}

export async function toggleRoute(tenantId, id, enabled) {
  const row = await prisma.chatRoute.findFirst({ where: { id: String(id), tenantId } });
  if (!row) throw err("Not found", 404);
  return shape(await prisma.chatRoute.update({ where: { id: row.id }, data: { enabled: !!enabled } }));
}

// ── Sending ──────────────────────────────────────────────────────────────────
function teamsCard({ title, text, url }) {
  return {
    type: "message",
    attachments: [{
      contentType: "application/vnd.microsoft.card.adaptive",
      content: {
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        type: "AdaptiveCard", version: "1.4",
        body: [
          { type: "TextBlock", text: title, weight: "Bolder", wrap: true },
          ...(text ? [{ type: "TextBlock", text, wrap: true }] : []),
        ],
        actions: url ? [{ type: "Action.OpenUrl", title: "Open in ExecUI", url }] : [],
      },
    }],
  };
}

async function sendTo(route, message) {
  if (route.provider === "slack") {
    const conn = await workspaceConnection(route.tenantId, "slack");
    if (!conn) throw new Error("Slack is no longer connected");
    await getProvider("slack").post(await accessTokenFor(conn), route.slackChannel, message);
    return;
  }
  const url = decryptSecret({ ciphertext: route.webhookCipher, iv: route.webhookIv, tag: route.webhookTag });
  const res = await fetch(validateTeamsWebhook(url), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(teamsCard(message)), signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Teams webhook answered ${res.status}`);
}

async function deliver(route, message) {
  try {
    await sendTo(route, message);
    await runUnscoped(() => prisma.chatRoute.update({ where: { id: route.id }, data: { lastSentAt: new Date(), lastError: null } }));
    return true;
  } catch (e) {
    log.warn?.("chat_post_failed", { routeId: route.id, provider: route.provider, error: e.message });
    await runUnscoped(() => prisma.chatRoute.update({ where: { id: route.id }, data: { lastError: String(e.message).slice(0, 300) } })).catch(() => {});
    return false;
  }
}

const absolute = (link) => (link ? (/^https?:/.test(link) ? link : frontendUrl(link)) : null);
const clip = (s, n) => (s ? String(s).replace(/\s+/g, " ").trim().slice(0, n) : "");

/**
 * Post an event to every enabled route for its category. Never throws, and
 * returns quickly — callers don't wait on Slack or Teams.
 */
export function notifyChat(tenantId, category, { title, text, link } = {}) {
  if (!tenantId || !CATEGORIES[category]) return;
  const message = { title: clip(title, 200), text: clip(text, 600), url: absolute(link) };
  runUnscoped(() => prisma.chatRoute.findMany({ where: { tenantId, category, enabled: true } }))
    .then((routes) => Promise.all(routes.map((r) => deliver(r, message))))
    .catch((e) => log.warn?.("chat_dispatch_failed", { tenantId, category, error: e.message }));
}

/** Send to one route now and report the outcome (the "Test" button, and workflow actions). */
export async function postToRoute(tenantId, routeId, message) {
  const route = await runUnscoped(() => prisma.chatRoute.findFirst({ where: { id: String(routeId), tenantId } }));
  if (!route) throw err("That channel route no longer exists", 404);
  if (!route.enabled) throw err("That channel route is turned off", 409);
  const ok = await deliver(route, { title: clip(message.title, 200), text: clip(message.text, 600), url: absolute(message.link) });
  if (!ok) throw err((await runUnscoped(() => prisma.chatRoute.findFirst({ where: { id: route.id } })))?.lastError ?? "Posting failed", 502);
  return { sent: true };
}
