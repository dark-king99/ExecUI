/**
 * Email Studio: sending domains, settings, and the campaign lifecycle.
 *
 * Status is set only by what actually happened:
 *   draft      saved, not scheduled
 *   scheduled  validated, waiting for its time (the worker starts it)
 *   running    recipients queued; the worker is sending
 *   paused     sending stopped; queued recipients wait
 *   completed  every recipient was sent, skipped or failed
 *   failed     it couldn't run (e.g. the domain lost verification) — see lastError
 *   cancelled  stopped for good; unsent recipients skipped
 *
 * Starting a campaign validates it, resolves the audience to contacts with
 * email consent and no suppression, and writes one delivery row per
 * recipient. Sending happens in the background worker, never in the request.
 */
import dns from "dns/promises";
import prisma from "../../../config/database.js";
import { emailProvider } from "./provider.js";
import { renderEmail } from "./render.js";
import { suppressedSet, isEmail, recordEvent } from "../foundation.js";
import { sendableWhere, previewAudience } from "../segments.js";

const err = (message, status = 400) => Object.assign(new Error(message), { status });
const EDITABLE = ["name", "objective", "subject", "previewText", "htmlBody", "textBody", "fromName", "fromLocalPart", "replyTo", "sendingDomainId", "audienceId", "budget"];
const DOMAIN_RE = /^(?=.{3,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

// ── Settings ─────────────────────────────────────────────────────────────────
export async function getSettings(tenantId) {
  return (await prisma.marketingEmailSettings.findUnique({ where: { tenantId } })) ?? { tenantId, postalAddress: null, defaultFromName: null, replyTo: null };
}

export async function updateSettings(tenantId, body = {}) {
  const data = {};
  if (body.postalAddress !== undefined) data.postalAddress = String(body.postalAddress ?? "").trim().slice(0, 300) || null;
  if (body.defaultFromName !== undefined) data.defaultFromName = String(body.defaultFromName ?? "").replace(/[\r\n<>"]/g, "").trim().slice(0, 80) || null;
  if (body.replyTo !== undefined) {
    const r = String(body.replyTo ?? "").trim();
    if (r && !isEmail(r)) throw err("Reply-to must be an email address");
    data.replyTo = r || null;
  }
  return prisma.marketingEmailSettings.upsert({ where: { tenantId }, update: data, create: { tenantId, ...data } });
}

// ── Sending domains ──────────────────────────────────────────────────────────
const domainShape = (d) => ({
  id: d.id, domain: d.domain, provider: d.provider, status: d.status, records: d.records, dmarcFound: d.dmarcFound,
  lastCheckedAt: d.lastCheckedAt, verifiedAt: d.verifiedAt, createdAt: d.createdAt,
  dmarcRecommended: { type: "TXT", name: `_dmarc.${d.domain}`, value: `v=DMARC1; p=none; rua=mailto:dmarc@${d.domain}` },
});

export async function listDomains(tenantId) {
  return (await prisma.marketingSendingDomain.findMany({ where: { tenantId }, orderBy: { createdAt: "asc" } })).map(domainShape);
}

export async function addDomain(tenantId, userId, name) {
  const domain = String(name ?? "").trim().toLowerCase().replace(/\.$/, "");
  if (!DOMAIN_RE.test(domain)) throw err("Enter a domain like mail.yourcompany.com");
  const provider = emailProvider();
  if (!provider.configured()) throw err("Marketing email isn't set up on this server (MARKETING_RESEND_API_KEY).", 409);
  if (await prisma.marketingSendingDomain.findFirst({ where: { tenantId, domain } })) throw err("That domain is already added", 409);
  const r = await provider.createDomain(domain);
  const row = await prisma.marketingSendingDomain.create({
    data: { tenantId, domain, provider: provider.id, providerDomainId: r.providerDomainId, status: r.status === "verified" ? "verified" : "pending", records: r.records, createdById: userId, ...(r.status === "verified" ? { verifiedAt: new Date() } : {}) },
  });
  return domainShape(row);
}

/** Ask the provider to check DNS, and check DMARC ourselves. */
export async function checkDomain(tenantId, id) {
  const d = await prisma.marketingSendingDomain.findFirst({ where: { id: String(id), tenantId } });
  if (!d) throw err("Domain not found", 404);
  const provider = emailProvider();
  await provider.verifyDomain(d.providerDomainId).catch(() => {});
  const r = await provider.getDomain(d.providerDomainId);
  const dmarcFound = await dns.resolveTxt(`_dmarc.${d.domain}`).then((rows) => rows.some((parts) => parts.join("").toLowerCase().startsWith("v=dmarc1"))).catch(() => false);
  const status = r.status === "verified" ? "verified" : r.status === "failed" ? "failed" : "pending";
  const row = await prisma.marketingSendingDomain.update({
    where: { id: d.id },
    data: { status, records: r.records, dmarcFound, lastCheckedAt: new Date(), ...(status === "verified" && !d.verifiedAt ? { verifiedAt: new Date() } : {}) },
  });
  return domainShape(row);
}

export async function removeDomain(tenantId, id) {
  const d = await prisma.marketingSendingDomain.findFirst({ where: { id: String(id), tenantId } });
  if (!d) throw err("Domain not found", 404);
  const inUse = await prisma.marketingCampaign.count({ where: { tenantId, sendingDomainId: d.id, status: { in: ["scheduled", "running", "paused"] } } });
  if (inUse) throw err("A scheduled or running campaign uses this domain", 409);
  await emailProvider().deleteDomain(d.providerDomainId);
  await prisma.marketingSendingDomain.delete({ where: { id: d.id } });
  return { deleted: true };
}

// ── Campaigns ────────────────────────────────────────────────────────────────
async function load(tenantId, id) {
  const c = await prisma.marketingCampaign.findFirst({ where: { id: String(id), tenantId } });
  if (!c) throw err("Campaign not found", 404);
  return c;
}

export async function createEmailCampaign(tenantId, userId, body = {}) {
  const name = String(body.name ?? "").trim();
  if (!name) throw err("Give the campaign a name");
  const data = pick(body);
  return prisma.marketingCampaign.create({ data: { tenantId, ...data, name: name.slice(0, 160), channel: "email", status: "draft", objective: data.objective ?? "engagement", createdById: userId } });
}

function pick(body) {
  const data = {};
  for (const k of EDITABLE) if (body[k] !== undefined) data[k] = body[k] === "" ? null : body[k];
  if (data.fromLocalPart != null && !/^[a-z0-9._+-]{1,64}$/i.test(data.fromLocalPart)) throw err("The sender's address part may use letters, digits, dot, dash, plus and underscore");
  if (data.replyTo != null && !isEmail(data.replyTo)) throw err("Reply-to must be an email address");
  if (data.fromName != null) data.fromName = String(data.fromName).replace(/[\r\n<>"]/g, "").slice(0, 80);
  if (data.subject != null) data.subject = String(data.subject).replace(/[\r\n]+/g, " ").slice(0, 300);
  if (data.htmlBody != null && String(data.htmlBody).length > 500_000) throw err("The email body is too large (500 KB max)");
  if (data.budget != null) data.budget = Number(data.budget) || 0;
  return data;
}

export async function updateEmailCampaign(tenantId, id, body = {}) {
  const c = await load(tenantId, id);
  if (c.status !== "draft") throw err(`A ${c.status} campaign can't be edited. Duplicate it to make changes.`, 409);
  return prisma.marketingCampaign.update({ where: { id: c.id }, data: pick(body) });
}

/** Everything that must be true before a campaign can send. Returns problems, not a boolean. */
export async function problems(tenantId, c) {
  const out = [];
  if (c.channel !== "email") out.push("Only email campaigns can be sent from Email Studio.");
  if (!emailProvider().configured()) out.push("Marketing email isn't set up on this server.");
  if (!c.subject) out.push("Add a subject line.");
  if (!c.htmlBody || !c.htmlBody.trim()) out.push("Write the email body.");
  if (!c.fromLocalPart) out.push("Choose the sender address.");
  const domain = c.sendingDomainId ? await prisma.marketingSendingDomain.findFirst({ where: { id: c.sendingDomainId, tenantId } }) : null;
  if (!domain) out.push("Choose a sending domain.");
  else if (domain.status !== "verified") out.push(`The sending domain ${domain.domain} isn't verified yet.`);
  const audience = c.audienceId ? await prisma.marketingAudience.findFirst({ where: { id: c.audienceId, tenantId } }) : null;
  if (!audience) out.push("Choose an audience.");
  const settings = await getSettings(tenantId);
  if (!settings.postalAddress) out.push("Add your organization's postal address in Email settings (it's required in marketing email).");
  return { problems: out, domain, audience, settings };
}

export async function readiness(tenantId, id) {
  const c = await load(tenantId, id);
  const { problems: list, audience } = await problems(tenantId, c);
  const preview = audience ? await previewAudience(tenantId, audience, await suppressedSet(tenantId)) : null;
  return { ready: list.length === 0 && (preview?.sendable ?? 0) > 0, problems: list, audience: preview ? { members: preview.members, sendable: preview.sendable } : null };
}

const fromAddress = (c, domain, settings) => {
  const name = (c.fromName ?? settings.defaultFromName ?? "").replace(/"/g, "");
  return name ? `"${name}" <${c.fromLocalPart}@${domain.domain}>` : `${c.fromLocalPart}@${domain.domain}`;
};

/**
 * Send a test to people in this workspace only — a test can't be used to mail
 * arbitrary addresses outside the consent rules.
 */
export async function sendTest(tenantId, userId, id, { to } = {}) {
  const c = await load(tenantId, id);
  const { problems: list, domain, settings } = await problems(tenantId, c);
  const blocking = list.filter((p) => !/audience/i.test(p));
  if (blocking.length) throw err(blocking.join(" "));
  const me = await prisma.user.findFirst({ where: { id: userId, tenantId }, select: { email: true, firstName: true, lastName: true } });
  const target = to ? await prisma.user.findFirst({ where: { tenantId, email: { equals: String(to), mode: "insensitive" } }, select: { email: true, firstName: true, lastName: true } }) : me;
  if (!target) throw err("Test emails can only go to members of this workspace", 403);
  const msg = renderEmail(c, settings, { name: `${target.firstName ?? ""} ${target.lastName ?? ""}`.trim(), email: target.email }, null);
  const r = await emailProvider().send({
    from: fromAddress(c, domain, settings), to: target.email, subject: `[Test] ${msg.subject}`, html: msg.html, text: msg.text,
    replyTo: c.replyTo ?? settings.replyTo ?? undefined, tags: [{ name: "kind", value: "test" }],
  });
  return { sent: true, to: target.email, providerMessageId: r.providerMessageId };
}

export async function schedule(tenantId, id, at) {
  const c = await load(tenantId, id);
  if (c.status !== "draft") throw err(`Only a draft can be scheduled (this one is ${c.status}).`, 409);
  const when = new Date(at);
  if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() + 60_000) throw err("Schedule it at least a minute from now");
  const r = await readiness(tenantId, id);
  if (r.problems.length) throw err(r.problems.join(" "));
  return prisma.marketingCampaign.update({ where: { id: c.id }, data: { status: "scheduled", scheduledAt: when, lastError: null } });
}

export async function unschedule(tenantId, id) {
  const c = await load(tenantId, id);
  if (c.status !== "scheduled") throw err("This campaign isn't scheduled", 409);
  return prisma.marketingCampaign.update({ where: { id: c.id }, data: { status: "draft", scheduledAt: null } });
}

/**
 * Start sending: validate, resolve recipients, queue one delivery per contact.
 * Used by "Send now" and by the worker when a scheduled time arrives. The
 * status moves from `from` to running atomically, so two workers can't both start it.
 */
export async function start(tenantId, id, { from = ["draft"] } = {}) {
  const c = await load(tenantId, id);
  if (!from.includes(c.status)) throw err(`A ${c.status} campaign can't be started.`, 409);
  const { problems: list, audience } = await problems(tenantId, c);
  if (list.length) {
    if (c.status === "scheduled") await prisma.marketingCampaign.update({ where: { id: c.id }, data: { status: "failed", lastError: list.join(" ") } });
    throw err(list.join(" "));
  }
  const suppressed = await suppressedSet(tenantId);
  const where = await sendableWhere(audience, tenantId, suppressed);
  const total = await prisma.contact.count({ where });
  if (!total) {
    const why = "No one in this audience can receive marketing email: they need recorded email consent and an address that isn't suppressed.";
    if (c.status === "scheduled") await prisma.marketingCampaign.update({ where: { id: c.id }, data: { status: "failed", lastError: why } });
    throw err(why);
  }
  const claimed = await prisma.marketingCampaign.updateMany({ where: { id: c.id, status: c.status }, data: { status: "running", sendStartedAt: new Date(), lastError: null } });
  if (!claimed.count) throw err("Someone else started or changed this campaign just now", 409);

  let cursor = null, queued = 0;
  for (;;) {
    const page = await prisma.contact.findMany({ where, select: { id: true, email: true }, orderBy: { id: "asc" }, take: 1000, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}) });
    if (!page.length) break;
    const rows = page.filter((p) => isEmail(p.email)).map((p) => ({ tenantId, campaignId: c.id, contactId: p.id, email: p.email.trim().toLowerCase() }));
    if (rows.length) queued += (await prisma.marketingEmailDelivery.createMany({ data: rows, skipDuplicates: true })).count;
    cursor = page.at(-1).id;
  }
  await recordEvent({ tenantId, type: "campaign.started", channel: "email", campaignId: c.id, source: "engine", properties: { recipients: queued } });
  return { status: "running", queued };
}

async function transition(tenantId, id, fromStatus, toStatus, extra = {}) {
  const c = await load(tenantId, id);
  if (!fromStatus.includes(c.status)) throw err(`A ${c.status} campaign can't be ${toStatus === "running" ? "resumed" : toStatus}.`, 409);
  await prisma.marketingCampaign.update({ where: { id: c.id }, data: { status: toStatus, ...extra } });
  return c;
}

export const pause = (tenantId, id) => transition(tenantId, id, ["running"], "paused").then(() => ({ status: "paused" }));
export const resume = (tenantId, id) => transition(tenantId, id, ["paused"], "running").then(() => ({ status: "running" }));

export async function cancel(tenantId, id) {
  const c = await transition(tenantId, id, ["scheduled", "running", "paused"], "cancelled", { sendCompletedAt: new Date() });
  const skipped = await prisma.marketingEmailDelivery.updateMany({ where: { campaignId: c.id, status: "queued" }, data: { status: "skipped", lastError: "Campaign cancelled" } });
  return { status: "cancelled", skipped: skipped.count };
}

export async function duplicate(tenantId, userId, id) {
  const c = await load(tenantId, id);
  const copy = Object.fromEntries(EDITABLE.map((k) => [k, c[k]]));
  return prisma.marketingCampaign.create({ data: { tenantId, ...copy, name: `${c.name} (copy)`.slice(0, 160), channel: c.channel, status: "draft", createdById: userId } });
}

export async function remove(tenantId, id) {
  const c = await load(tenantId, id);
  if (["scheduled", "running", "paused"].includes(c.status)) throw err("Cancel the campaign before deleting it", 409);
  await prisma.marketingCampaign.delete({ where: { id: c.id } });
  return { deleted: true };
}

/** Real numbers, counted from delivery rows. */
export async function stats(tenantId, id) {
  const c = await load(tenantId, id);
  const [byStatus, opened, clicked, unsubscribed] = await Promise.all([
    prisma.marketingEmailDelivery.groupBy({ by: ["status"], where: { campaignId: c.id }, _count: { _all: true } }),
    prisma.marketingEmailDelivery.count({ where: { campaignId: c.id, openedAt: { not: null } } }),
    prisma.marketingEmailDelivery.count({ where: { campaignId: c.id, clickedAt: { not: null } } }),
    prisma.marketingEmailDelivery.count({ where: { campaignId: c.id, unsubscribedAt: { not: null } } }),
  ]);
  const s = Object.fromEntries(byStatus.map((r) => [r.status, r._count._all]));
  const recipients = Object.values(s).reduce((a, b) => a + b, 0);
  const accepted = (s.sent ?? 0) + (s.delivered ?? 0) + (s.bounced ?? 0) + (s.complained ?? 0);
  const rate = (n, d) => (d ? +((n / d) * 100).toFixed(1) : null);
  return {
    status: c.status, lastError: c.lastError, recipients,
    queued: (s.queued ?? 0) + (s.sending ?? 0), accepted, delivered: s.delivered ?? 0, bounced: s.bounced ?? 0, complained: s.complained ?? 0,
    failed: s.failed ?? 0, skipped: s.skipped ?? 0, opened, clicked, unsubscribed,
    // Opens are pixel-based and undercount (images off) or overcount (privacy proxies).
    openRate: rate(opened, s.delivered ?? 0), clickRate: rate(clicked, s.delivered ?? 0),
    note: "\"Accepted\" means the provider took the message; \"delivered\" means the receiving server confirmed it. Neither proves inbox placement.",
  };
}

export async function deliveries(tenantId, id, { status, limit = 100 } = {}) {
  const c = await load(tenantId, id);
  return prisma.marketingEmailDelivery.findMany({
    where: { campaignId: c.id, ...(status ? { status: String(status) } : {}) },
    orderBy: { updatedAt: "desc" }, take: Math.min(500, Number(limit) || 100),
    select: { id: true, email: true, status: true, attempts: true, lastError: true, sentAt: true, deliveredAt: true, openedAt: true, clickedAt: true, bouncedAt: true, unsubscribedAt: true },
  });
}

export async function listEmailCampaigns(tenantId) {
  return prisma.marketingCampaign.findMany({
    where: { tenantId, channel: "email" }, orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, status: true, subject: true, audienceId: true, scheduledAt: true, sendStartedAt: true, sendCompletedAt: true, lastError: true, updatedAt: true, createdAt: true },
  });
}

export async function getEmailCampaign(tenantId, id) {
  return load(tenantId, id);
}
