/**
 * The email send worker. Runs every few seconds in every app instance; the
 * database decides who does what, so instances never step on each other.
 *
 *   1. Start scheduled campaigns whose time has come.
 *   2. Requeue deliveries stuck in "sending" (an instance died mid-send). The
 *      provider idempotency key is the delivery id, so a resend can't duplicate.
 *   3. Claim a batch of queued deliveries from running campaigns with
 *      FOR UPDATE SKIP LOCKED, re-check consent and suppression (they may have
 *      changed since the campaign started), render, send at the configured rate.
 *   4. Retry temporary failures with backoff; fail permanent ones.
 *   5. Mark campaigns completed when nothing is left to send.
 *
 * `MARKETING_EMAIL_WORKER=off` disables it; `MARKETING_EMAIL_RATE` is messages
 * per second per instance (default 2, Resend's default API limit).
 */
import prisma from "../../../config/database.js";
import { runUnscoped, runWithTenant } from "../../../lib/tenantContext.js";
import { log } from "../../../lib/logger.js";
import { emailProvider } from "./provider.js";
import { renderEmail } from "./render.js";
import { start, getSettings } from "./email.service.js";
import { recordEvent } from "../foundation.js";

export const BACKOFF_MIN = [1, 5, 30];
export const MAX_ATTEMPTS = BACKOFF_MIN.length + 1;
const STALE_MS = 10 * 60_000;
const BATCH = 50;

let timer = null;
let running = false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function startDueCampaigns(now = new Date()) {
  const due = await runUnscoped(() => prisma.marketingCampaign.findMany({ where: { channel: "email", status: "scheduled", scheduledAt: { lte: now } }, select: { id: true, tenantId: true } }));
  let started = 0;
  for (const c of due) {
    try {
      await runWithTenant({ tenantId: c.tenantId }, () => start(c.tenantId, c.id, { from: ["scheduled"] }));
      started += 1;
    } catch (e) {
      log.warn?.("marketing_scheduled_start_failed", { campaignId: c.id, error: e.message });
    }
  }
  return started;
}

export async function requeueStale(now = new Date()) {
  const r = await runUnscoped(() => prisma.marketingEmailDelivery.updateMany({
    where: { status: "sending", lockedAt: { lt: new Date(now.getTime() - STALE_MS) } },
    data: { status: "queued", lockedAt: null },
  }));
  return r.count;
}

/** Claim up to `n` sendable deliveries. Returns their ids. */
export async function claim(n = BATCH) {
  const rows = await prisma.$queryRaw`
    UPDATE "MarketingEmailDelivery" d
       SET status = 'sending', "lockedAt" = now(), attempts = d.attempts + 1, "updatedAt" = now()
     WHERE d.id IN (
       SELECT d2.id FROM "MarketingEmailDelivery" d2
         JOIN "MarketingCampaign" c ON c.id = d2."campaignId"
        WHERE d2.status = 'queued' AND c.status = 'running'
          AND (d2."nextAttemptAt" IS NULL OR d2."nextAttemptAt" <= now())
        ORDER BY d2."createdAt"
        LIMIT ${n}
        FOR UPDATE OF d2 SKIP LOCKED)
    RETURNING d.id`;
  return rows.map((r) => r.id);
}

/** Send one claimed delivery. */
export async function sendOne(id) {
  const d = await runUnscoped(() => prisma.marketingEmailDelivery.findUnique({ where: { id }, include: { campaign: true, contact: true } }));
  if (!d) return "missing";
  return runWithTenant({ tenantId: d.tenantId }, async () => {
    const skip = async (why) => {
      await prisma.marketingEmailDelivery.update({ where: { id }, data: { status: "skipped", lastError: why, lockedAt: null } });
      return "skipped";
    };
    // Consent and suppression may have changed since the campaign started.
    const consent = await prisma.marketingConsent.findFirst({ where: { tenantId: d.tenantId, contactId: d.contactId, channel: "email" } });
    if (consent?.status !== "subscribed") return skip(`No longer subscribed (${consent?.status ?? "no consent"})`);
    if (await prisma.marketingSuppression.findFirst({ where: { tenantId: d.tenantId, email: d.email } })) return skip("Address is suppressed");
    const domain = await prisma.marketingSendingDomain.findFirst({ where: { id: d.campaign.sendingDomainId ?? "", tenantId: d.tenantId } });
    if (domain?.status !== "verified") {
      await prisma.marketingCampaign.update({ where: { id: d.campaignId }, data: { status: "paused", lastError: "Paused: the sending domain is no longer verified." } });
      await prisma.marketingEmailDelivery.update({ where: { id }, data: { status: "queued", lockedAt: null, attempts: { decrement: 1 } } });
      return "paused";
    }

    const settings = await getSettings(d.tenantId);
    const msg = renderEmail(d.campaign, settings, { name: d.contact.name, email: d.email }, d.id);
    const name = (d.campaign.fromName ?? settings.defaultFromName ?? "").replace(/"/g, "");
    const from = name ? `"${name}" <${d.campaign.fromLocalPart}@${domain.domain}>` : `${d.campaign.fromLocalPart}@${domain.domain}`;
    try {
      const r = await emailProvider().send({
        from, to: d.email, subject: msg.subject, html: msg.html, text: msg.text,
        replyTo: d.campaign.replyTo ?? settings.replyTo ?? undefined, headers: msg.headers,
        tags: [{ name: "delivery", value: d.id }, { name: "campaign", value: d.campaignId }],
        idempotencyKey: d.id,
      });
      await prisma.marketingEmailDelivery.update({ where: { id }, data: { status: "sent", providerMessageId: r.providerMessageId, sentAt: new Date(), lockedAt: null, lastError: null } });
      await recordEvent({ tenantId: d.tenantId, type: "email.sent", channel: "email", contactId: d.contactId, email: d.email, campaignId: d.campaignId, deliveryId: d.id, source: "engine", idempotencyKey: `sent:${d.id}` });
      return "sent";
    } catch (e) {
      const retry = e.transient && d.attempts < MAX_ATTEMPTS;
      await prisma.marketingEmailDelivery.update({
        where: { id },
        data: retry
          ? { status: "queued", lockedAt: null, lastError: String(e.message).slice(0, 300), nextAttemptAt: new Date(Date.now() + BACKOFF_MIN[d.attempts - 1] * 60_000) }
          : { status: "failed", lockedAt: null, lastError: String(e.message).slice(0, 300) },
      });
      return retry ? "retry" : "failed";
    }
  });
}

/** Finish running campaigns with nothing left to send. */
export async function completeFinished() {
  const running = await runUnscoped(() => prisma.marketingCampaign.findMany({ where: { channel: "email", status: "running" }, select: { id: true, tenantId: true } }));
  let done = 0;
  for (const c of running) {
    const left = await runUnscoped(() => prisma.marketingEmailDelivery.count({ where: { campaignId: c.id, status: { in: ["queued", "sending"] } } }));
    if (left) continue;
    const [sent, failed] = await runUnscoped(() => Promise.all([
      prisma.marketingEmailDelivery.count({ where: { campaignId: c.id, status: { in: ["sent", "delivered", "bounced", "complained"] } } }),
      prisma.marketingEmailDelivery.count({ where: { campaignId: c.id, status: "failed" } }),
    ]));
    const allFailed = sent === 0 && failed > 0;
    const r = await runUnscoped(() => prisma.marketingCampaign.updateMany({
      where: { id: c.id, status: "running" },
      data: { status: allFailed ? "failed" : "completed", sendCompletedAt: new Date(), ...(allFailed ? { lastError: "Every message failed to send — see the delivery list." } : {}) },
    }));
    if (r.count) {
      done += 1;
      await recordEvent({ tenantId: c.tenantId, type: allFailed ? "campaign.failed" : "campaign.completed", channel: "email", campaignId: c.id, source: "engine", properties: { sent, failed }, idempotencyKey: `done:${c.id}` });
    }
  }
  return done;
}

export async function runEmailWorker({ maxBatches = 4 } = {}) {
  if (running) return { skipped: "already running" };
  running = true;
  const out = { started: 0, requeued: 0, sent: 0, failed: 0, retried: 0, skipped: 0, completed: 0 };
  try {
    out.started = await startDueCampaigns();
    out.requeued = await requeueStale();
    if (emailProvider().configured()) {
      const gap = 1000 / Math.max(0.1, Number(process.env.MARKETING_EMAIL_RATE) || 2);
      for (let b = 0; b < maxBatches; b++) {
        const ids = await runUnscoped(() => claim(BATCH));
        if (!ids.length) break;
        for (const id of ids) {
          const r = await sendOne(id);
          if (r === "sent") out.sent += 1; else if (r === "failed") out.failed += 1; else if (r === "retry") out.retried += 1; else if (r === "skipped") out.skipped += 1;
          await sleep(gap);
        }
      }
    }
    out.completed = await completeFinished();
    if (out.sent || out.failed || out.completed || out.started) log.info?.("marketing_email_worker", out);
    return out;
  } finally {
    running = false;
  }
}

export function startEmailWorker() {
  if (process.env.MARKETING_EMAIL_WORKER === "off") { log.info?.("marketing_email_worker_disabled"); return null; }
  if (timer) return timer;
  timer = setInterval(() => { runEmailWorker().catch((e) => log.warn?.("marketing_email_worker_failed", { error: e.message })); }, 5_000);
  timer.unref?.();
  log.info?.("marketing_email_worker_started");
  return timer;
}

export function stopEmailWorker() {
  if (timer) clearInterval(timer);
  timer = null;
}
