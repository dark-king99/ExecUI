/**
 * Ingestion: how Data Streams turn incoming records into CRM contacts,
 * consent and marketing events.
 *
 * People: matched by email inside the tenant (case-insensitive). A new address
 * creates a CRM contact; a known one is reused. A per-address advisory lock
 * means two submissions arriving at once can't create two contacts.
 *
 * Consent is only ever recorded with evidence, and the source matters:
 *   - a signup form where the person ticked the box may subscribe anyone who
 *     isn't suppressed — they just asked to be;
 *   - an import or API call may subscribe people with no recorded consent, but
 *     never overrides an unsubscribe, bounce or complaint.
 */
import crypto from "crypto";
import prisma from "../../../config/database.js";
import { recordEvent, setConsent, isEmail, normEmail } from "../foundation.js";
import { CUSTOM_EVENT_RE } from "../segments.js";

const err = (message, status = 400) => Object.assign(new Error(message), { status });
const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

/** Find or create the CRM contact for an email. Returns { contact, created }. */
export async function upsertContact(tenantId, { email, name }) {
  const addr = normEmail(email);
  if (!isEmail(addr)) throw err("A valid email address is required");
  const displayName = clean(name, 120);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${tenantId}:${addr}`}, 0))`;
    const found = await tx.contact.findFirst({ where: { tenantId, email: { equals: addr, mode: "insensitive" } }, orderBy: { createdAt: "asc" } });
    if (found) {
      // Fill a missing name; never overwrite one a person typed into the CRM.
      if (displayName && (!found.name || found.name === found.email)) {
        return { contact: await tx.contact.update({ where: { id: found.id }, data: { name: displayName } }), created: false };
      }
      return { contact: found, created: false };
    }
    const contact = await tx.contact.create({ data: { tenantId, email: addr, name: displayName || addr, key: `mkt-${crypto.randomUUID()}` } });
    return { contact, created: true };
  });
}

/**
 * Subscribe a contact if the source is allowed to. Returns "subscribed",
 * "already", or why it was refused.
 */
export async function grantConsent(tenantId, contactId, { source, evidence, actorId = null }) {
  if (!evidence || clean(evidence, 300).length < 3) throw err("Consent needs a note of where it came from");
  const current = await prisma.marketingConsent.findFirst({ where: { tenantId, contactId, channel: "email" } });
  if (current?.status === "subscribed") return "already";
  const contact = await prisma.contact.findFirst({ where: { id: contactId, tenantId }, select: { email: true } });
  if (await prisma.marketingSuppression.findFirst({ where: { tenantId, email: normEmail(contact?.email) } })) return "suppressed";
  if (current && source !== "form") return `kept_${current.status}`; // an import never re-subscribes an opt-out
  await setConsent(tenantId, contactId, { status: "subscribed", source, evidence: clean(evidence, 300), actorId });
  return "subscribed";
}

/** Normalise an incoming event name: "Trial Started" → "custom:trial_started". */
export function customType(name) {
  const t = `custom:${String(name ?? "").trim().toLowerCase().replace(/[\s/]+/g, "_").replace(/[^a-z0-9_.-]/g, "")}`;
  if (!CUSTOM_EVENT_RE.test(t)) throw err(`Event names use letters, digits, "_", "." and "-" (got "${String(name ?? "").slice(0, 40)}")`);
  return t;
}

function properties(p) {
  if (p == null) return {};
  if (typeof p !== "object" || Array.isArray(p)) throw err("properties must be an object");
  const json = JSON.stringify(p);
  if (json.length > 8_000) throw err("properties are limited to 8 KB per event");
  return p;
}

/**
 * Events from an API source. Each { event, email, name?, properties?, id?, occurredAt? }.
 * `id` makes a retry safe. Unknown addresses create contacts only when the
 * source allows it.
 */
export async function ingestEvents(source, events) {
  if (!Array.isArray(events) || !events.length) throw err("Send { events: [ … ] } with at least one event");
  if (events.length > 500) throw err("At most 500 events per request");
  const out = { accepted: 0, duplicates: 0, rejected: [] };
  const allowCreate = source.config?.createContacts !== false;
  for (let i = 0; i < events.length; i++) {
    const e = events[i] ?? {};
    try {
      const type = customType(e.event);
      const addr = normEmail(e.email);
      if (!isEmail(addr)) throw err("email is required");
      let contactId = null;
      if (allowCreate) contactId = (await upsertContact(source.tenantId, { email: addr, name: e.name })).contact.id;
      else contactId = (await prisma.contact.findFirst({ where: { tenantId: source.tenantId, email: { equals: addr, mode: "insensitive" } }, select: { id: true } }))?.id ?? null;
      if (!contactId) throw err("No CRM contact has this email, and this stream doesn't create contacts");
      const at = e.occurredAt ? new Date(e.occurredAt) : new Date();
      if (Number.isNaN(at.getTime()) || at > new Date(Date.now() + 5 * 60_000)) throw err("occurredAt must be a date, not in the future");
      const row = await recordEvent({
        tenantId: source.tenantId, type, channel: "api", contactId, email: addr, source: "api",
        properties: { ...properties(e.properties), sourceId: source.id }, occurredAt: at,
        idempotencyKey: e.id ? `src:${source.id}:${clean(e.id, 120)}` : null,
      });
      if (row) out.accepted += 1; else out.duplicates += 1;
    } catch (x) {
      out.rejected.push({ index: i, error: x.message });
    }
  }
  return out;
}

/**
 * One signup-form submission. `fields` is the posted body.
 * Returns { contactId, consent } — consent is what happened to it.
 */
export async function submitForm(source, fields, { ip, userAgent } = {}) {
  const cfg = source.config ?? {};
  const email = normEmail(fields.email);
  if (!isEmail(email)) throw err("Please enter a valid email address");
  const name = clean(fields.name, 120);
  if (cfg.requireName && !name) throw err("Please enter your name");
  const { contact, created } = await upsertContact(source.tenantId, { email, name });

  let consent = "not_asked";
  if (cfg.askConsent !== false) {
    const ticked = ["on", "true", "yes", "1", true].includes(fields.consent);
    consent = ticked
      ? await grantConsent(source.tenantId, contact.id, { source: "form", evidence: `${source.name}: "${clean(cfg.consentText, 160)}" ticked ${new Date().toISOString()}${ip ? ` from ${ip}` : ""}` })
      : "not_given";
  }
  const extra = {};
  for (const f of cfg.fields ?? []) if (fields[f.key] != null) extra[f.key] = clean(fields[f.key], 500);
  await recordEvent({
    tenantId: source.tenantId, type: "form.submitted", channel: "form", contactId: contact.id, email, source: "form",
    properties: { sourceId: source.id, form: source.name, created, consent, fields: extra, ...(userAgent ? { userAgent: clean(userAgent, 200) } : {}) },
  });
  return { contactId: contact.id, created, consent };
}
