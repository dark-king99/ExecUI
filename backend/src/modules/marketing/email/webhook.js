/**
 * Provider webhooks and the public unsubscribe page.
 *
 * Webhooks (Resend, signed with Svix): every event is verified against
 * MARKETING_RESEND_WEBHOOK_SECRET over the raw body, rejected if older than
 * five minutes, and recorded once (the Svix message id is the idempotency key).
 *   delivered   → delivery confirmed by the receiving server
 *   bounced     → permanent bounces suppress the address and mark consent "bounced"
 *   complained  → spam complaint: suppress and mark consent "complained"
 *   opened / clicked → first open / first click recorded on the delivery
 *
 * Unsubscribe: the link in every email (and the RFC 8058 one-click POST that
 * mail clients send from the List-Unsubscribe header) carries a signed token
 * for one delivery. It works without signing in, and does exactly one thing.
 */
import crypto from "crypto";
import prisma from "../../../config/database.js";
import { runUnscoped, runWithTenant } from "../../../lib/tenantContext.js";
import { log } from "../../../lib/logger.js";
import { recordEvent, setConsent, suppress } from "../foundation.js";
import { verifyUnsubscribeToken } from "./render.js";

const TOLERANCE_S = 300;

/** Svix signature check. Returns true only for an authentic, fresh message. */
export function verifySvix(rawBody, headers, secret = process.env.MARKETING_RESEND_WEBHOOK_SECRET, now = Date.now()) {
  if (!secret) return false;
  const id = headers["svix-id"], ts = headers["svix-timestamp"], sigs = headers["svix-signature"];
  if (!id || !ts || !sigs) return false;
  if (Math.abs(now / 1000 - Number(ts)) > TOLERANCE_S) return false;
  const key = Buffer.from(String(secret).replace(/^whsec_/, ""), "base64");
  const expected = crypto.createHmac("sha256", key).update(`${id}.${ts}.${rawBody}`).digest("base64");
  return String(sigs).split(" ").some((part) => {
    const [, sig] = part.split(",");
    const a = Buffer.from(sig ?? ""), b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

const MAP = {
  "email.delivered": "email.delivered", "email.bounced": "email.bounced", "email.complained": "email.complained",
  "email.opened": "email.opened", "email.clicked": "email.clicked", "email.delivery_delayed": "email.delayed", "email.failed": "email.failed",
};

/** Apply one verified provider event. */
export async function handleProviderEvent(evt, messageId) {
  const type = MAP[evt?.type];
  const providerMessageId = evt?.data?.email_id;
  if (!type || !providerMessageId) return { ignored: true };
  const d = await runUnscoped(() => prisma.marketingEmailDelivery.findUnique({ where: { providerMessageId } }));
  if (!d) return { ignored: true }; // a test send or another system's mail
  return runWithTenant({ tenantId: d.tenantId }, async () => {
    const at = evt.created_at ? new Date(evt.created_at) : new Date();
    const recorded = await recordEvent({
      tenantId: d.tenantId, type, channel: "email", contactId: d.contactId, email: d.email, campaignId: d.campaignId, deliveryId: d.id,
      source: "provider", occurredAt: at, idempotencyKey: `svix:${messageId}`,
      properties: { ...(evt.data?.click?.link ? { link: String(evt.data.click.link).slice(0, 500) } : {}), ...(evt.data?.bounce ? { bounce: evt.data.bounce } : {}) },
    });
    if (!recorded) return { duplicate: true };
    const patch = {};
    if (type === "email.delivered" && !["bounced", "complained"].includes(d.status)) Object.assign(patch, { status: "delivered", deliveredAt: at });
    if (type === "email.opened" && !d.openedAt) patch.openedAt = at;
    if (type === "email.clicked" && !d.clickedAt) Object.assign(patch, { clickedAt: at, ...(d.openedAt ? {} : { openedAt: at }) });
    if (type === "email.failed") Object.assign(patch, { status: "failed", lastError: String(evt.data?.failed?.reason ?? "Provider reported failure").slice(0, 300) });
    if (type === "email.bounced") {
      const transient = /transient|temporary|soft/i.test(String(evt.data?.bounce?.type ?? ""));
      Object.assign(patch, { status: "bounced", bouncedAt: at, lastError: String(evt.data?.bounce?.message ?? "Bounced").slice(0, 300) });
      if (!transient) {
        await suppress(d.tenantId, d.email, "hard_bounce", evt.data?.bounce?.message);
        await setConsent(d.tenantId, d.contactId, { status: "bounced", source: "provider", evidence: "Hard bounce" });
      }
    }
    if (type === "email.complained") {
      Object.assign(patch, { status: "complained", complainedAt: at });
      await suppress(d.tenantId, d.email, "complaint", "Marked as spam by the recipient");
      await setConsent(d.tenantId, d.contactId, { status: "complained", source: "provider", evidence: "Spam complaint" });
    }
    if (Object.keys(patch).length) await prisma.marketingEmailDelivery.update({ where: { id: d.id }, data: patch });
    return { applied: type };
  });
}

/** Unsubscribe the recipient of one delivery. Safe to call twice. */
export async function unsubscribeByToken(token) {
  const id = verifyUnsubscribeToken(token);
  if (!id) return { ok: false };
  const d = await runUnscoped(() => prisma.marketingEmailDelivery.findUnique({ where: { id } }));
  if (!d) return { ok: false };
  await runWithTenant({ tenantId: d.tenantId }, async () => {
    await setConsent(d.tenantId, d.contactId, { status: "unsubscribed", source: "unsubscribe_link", evidence: `Campaign ${d.campaignId}` });
    if (!d.unsubscribedAt) await prisma.marketingEmailDelivery.update({ where: { id: d.id }, data: { unsubscribedAt: new Date() } });
    await recordEvent({ tenantId: d.tenantId, type: "email.unsubscribed", channel: "email", contactId: d.contactId, email: d.email, campaignId: d.campaignId, deliveryId: d.id, source: "user", idempotencyKey: `unsub:${d.id}` });
  });
  return { ok: true, email: d.email };
}

export const unsubscribePage = ({ done, email, token, invalid }) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:480px;margin:15vh auto;padding:0 16px;color:#111}button{font:inherit;padding:10px 18px;border-radius:8px;border:0;background:#111;color:#fff;cursor:pointer}</style></head><body>
${invalid ? "<h1>Link not valid</h1><p>This unsubscribe link isn't valid. If you keep receiving email you didn't ask for, reply to it and ask to be removed.</p>"
    : done ? `<h1>You're unsubscribed</h1><p>${email ? `${email.replace(/[<>&"]/g, "")} won't` : "You won't"} receive marketing email from this sender any more.</p>`
      : `<h1>Unsubscribe?</h1><p>Stop receiving marketing email from this sender.</p><form method="post" action="${token}"><button type="submit">Unsubscribe</button></form>`}
</body></html>`;

export function logWebhookFailure(reason) { log.warn?.("marketing_webhook_rejected", { reason }); }
