/**
 * Marketing foundation: the event stream, consent, and suppression.
 *
 * Every marketing fact that later powers analytics, scoring, attribution and
 * journeys is written here as a MarketingEvent — by the engine when it acts,
 * by provider webhooks when they report, by people when they change consent.
 *
 * Consent is per CRM contact and channel. Marketing email goes ONLY to
 * contacts whose email consent is "subscribed"; an address on the
 * organization's suppression list (hard bounce, complaint, manual block) is
 * never sent to, whatever its consent says.
 */
import prisma from "../../config/database.js";

const err = (message, status = 400) => Object.assign(new Error(message), { status });
export const CONSENT_STATUSES = ["subscribed", "unsubscribed", "bounced", "complained"];
export const CONSENT_SOURCES = ["form", "import", "manual", "unsubscribe_link", "provider"];
export const isEmail = (s) => /^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$/.test(String(s ?? "").trim());
export const normEmail = (s) => String(s ?? "").trim().toLowerCase();

/** Record one event. With an idempotency key, recording twice is a no-op. */
export async function recordEvent({ tenantId, type, channel = null, contactId = null, email = null, campaignId = null, deliveryId = null, source, properties = {}, idempotencyKey = null, occurredAt = new Date() }) {
  try {
    return await prisma.marketingEvent.create({
      data: { tenantId, type, channel, contactId, email: email ? normEmail(email) : null, campaignId, deliveryId, source, properties, idempotencyKey, occurredAt },
    });
  } catch (e) {
    if (e.code === "P2002") return null; // already recorded
    throw e;
  }
}

/** Set a contact's consent on a channel, with where it came from. */
export async function setConsent(tenantId, contactId, { channel = "email", status, source, evidence = null, actorId = null }) {
  if (!CONSENT_STATUSES.includes(status)) throw err(`Consent must be one of ${CONSENT_STATUSES.join(", ")}`);
  if (!CONSENT_SOURCES.includes(source)) throw err(`Consent source must be one of ${CONSENT_SOURCES.join(", ")}`);
  const contact = await prisma.contact.findFirst({ where: { id: String(contactId), tenantId }, select: { id: true, email: true } });
  if (!contact) throw err("Contact not found", 404);
  const before = await prisma.marketingConsent.findFirst({ where: { tenantId, contactId: contact.id, channel } });
  const row = await prisma.marketingConsent.upsert({
    where: { tenantId_contactId_channel: { tenantId, contactId: contact.id, channel } },
    update: { status, source, evidence: evidence ? String(evidence).slice(0, 300) : null, changedById: actorId },
    create: { tenantId, contactId: contact.id, channel, status, source, evidence: evidence ? String(evidence).slice(0, 300) : null, changedById: actorId },
  });
  if (before?.status !== status) {
    await recordEvent({ tenantId, type: "consent.changed", channel, contactId: contact.id, email: contact.email, source: source === "provider" ? "provider" : "user", properties: { from: before?.status ?? null, to: status, source } });
  }
  return row;
}

/**
 * Record consent for many addresses at once (e.g. an import of people who
 * signed up elsewhere). Only addresses that match a CRM contact are recorded —
 * marketing doesn't create contacts behind the CRM's back.
 */
export async function importConsent(tenantId, { emails, status = "subscribed", evidence, actorId }) {
  if (!evidence || String(evidence).trim().length < 3) throw err("Say where this consent came from (e.g. \"Website signup form, Oct 2026\")");
  const wanted = [...new Set((Array.isArray(emails) ? emails : String(emails ?? "").split(/[\s,;]+/)).map(normEmail).filter(isEmail))].slice(0, 10_000);
  const contacts = await prisma.contact.findMany({ where: { tenantId, email: { in: wanted, mode: "insensitive" } }, select: { id: true, email: true } });
  const matched = new Set(contacts.map((c) => normEmail(c.email)));
  for (const c of contacts) await setConsent(tenantId, c.id, { status, source: "import", evidence, actorId });
  return { requested: wanted.length, recorded: contacts.length, unmatched: wanted.filter((e) => !matched.has(e)).slice(0, 50), unmatchedCount: wanted.length - matched.size };
}

export async function suppress(tenantId, email, reason, detail = null) {
  const e = normEmail(email);
  if (!isEmail(e)) return null;
  return prisma.marketingSuppression.upsert({
    where: { tenantId_email: { tenantId, email: e } },
    update: {},
    create: { tenantId, email: e, reason, detail: detail ? String(detail).slice(0, 300) : null },
  });
}

export async function unsuppress(tenantId, email) {
  await prisma.marketingSuppression.deleteMany({ where: { tenantId, email: normEmail(email) } });
  return { removed: true };
}

export async function suppressedSet(tenantId) {
  const rows = await prisma.marketingSuppression.findMany({ where: { tenantId }, select: { email: true } });
  return new Set(rows.map((r) => r.email));
}

/** Consent counts for the Subscribers view. */
export async function consentSummary(tenantId) {
  const [byStatus, contacts, suppressed] = await Promise.all([
    prisma.marketingConsent.groupBy({ by: ["status"], where: { tenantId, channel: "email" }, _count: { _all: true } }),
    prisma.contact.count({ where: { tenantId } }),
    prisma.marketingSuppression.count({ where: { tenantId } }),
  ]);
  const counts = Object.fromEntries(byStatus.map((r) => [r.status, r._count._all]));
  const recorded = Object.values(counts).reduce((s, n) => s + n, 0);
  return { contacts, noConsentRecorded: contacts - recorded, ...Object.fromEntries(CONSENT_STATUSES.map((s) => [s, counts[s] ?? 0])), suppressed };
}
