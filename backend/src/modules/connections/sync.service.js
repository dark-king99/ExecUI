/**
 * What a connected account actually does, run by the scheduler or "Sync now".
 *
 * Personal mailbox → CRM activity
 *   Every email since the last sync is checked against the organization's CRM
 *   contacts. Only mail exchanged with a known contact is logged, and only its
 *   subject and a short snippet — never the body. Everything else in the
 *   mailbox is read in passing and not stored.
 *
 * Personal calendar → CRM meetings
 *   Events with a CRM contact among the attendees become meetings on the CRM
 *   activity list, updated (or cancelled) when the event changes.
 *
 * Support inbox → help-desk tickets
 *   New mail becomes a ticket. A reply quoting a ticket reference, from the
 *   address that ticket belongs to, joins that ticket instead. Auto-replies,
 *   bounces and mail from the inbox itself are skipped so ExecUI can't end up
 *   in a mail loop with another robot.
 *
 * Each run is bounded (MAX_MESSAGES) and idempotent: messages and events are
 * keyed by their provider ids, so an overlapping or repeated run changes
 * nothing.
 */
import prisma from "../../config/database.js";
import { runWithTenant } from "../../lib/tenantContext.js";
import { log } from "../../lib/logger.js";
import { getProvider } from "./providers.js";
import { accessTokenFor } from "./connections.service.js";
import { createTicket, addCustomerMessage } from "../helpdesk/tickets.service.js";

export const MAX_MESSAGES = 100;
const FIRST_SYNC_DAYS = 7;
const OVERLAP_MS = 5 * 60_000; // re-read the last few minutes; dedupe absorbs it
const SNIPPET_MAX = 200;
const DAY = 86_400_000;

const clip = (s, n) => (s ? String(s).replace(/\s+/g, " ").trim().slice(0, n) : null);

// ── Personal: email → CRM activity ───────────────────────────────────────────
async function contactsByEmail(tenantId) {
  const contacts = await prisma.contact.findMany({ where: { tenantId }, select: { id: true, email: true } });
  return new Map(contacts.filter((c) => c.email).map((c) => [c.email.trim().toLowerCase(), c.id]));
}

export async function syncMail(connection, token, since) {
  const provider = getProvider(connection.provider);
  const contacts = await contactsByEmail(connection.tenantId);
  if (!contacts.size) return { scanned: 0, logged: 0 };

  const ids = await provider.listMessageIds(token, { since, max: MAX_MESSAGES });
  const me = connection.accountEmail.toLowerCase();
  let logged = 0;
  for (const id of ids) {
    const exists = await prisma.mailActivity.findFirst({ where: { connectionId: connection.id, externalId: id }, select: { id: true } });
    if (exists) continue;
    const m = await provider.getMessage(token, id);
    const outbound = m.from === me;
    // Who on the other side is a CRM contact?
    const others = outbound ? [...m.to, ...m.cc] : [m.from];
    const contactId = others.map((a) => contacts.get(a)).find(Boolean);
    if (!contactId) continue; // not a CRM conversation: read, not stored

    await prisma.mailActivity.create({
      data: {
        tenantId: connection.tenantId, connectionId: connection.id, userId: connection.userId,
        contactId, provider: connection.provider, externalId: m.id, threadId: m.threadId,
        direction: outbound ? "outbound" : "inbound", fromEmail: m.from ?? "",
        toEmails: m.to.slice(0, 20), subject: clip(m.subject, 300) ?? "(no subject)",
        snippet: clip(m.snippet, SNIPPET_MAX), occurredAt: m.date,
      },
    }).then(() => { logged += 1; }).catch((e) => {
      if (e.code !== "P2002") throw e; // a concurrent run logged it first
    });
  }
  return { scanned: ids.length, logged };
}

// ── Personal: calendar → CRM meetings ────────────────────────────────────────
export async function syncCalendar(connection, token) {
  const provider = getProvider(connection.provider);
  const contacts = await contactsByEmail(connection.tenantId);
  if (!contacts.size) return { scanned: 0, logged: 0 };

  const now = Date.now();
  const events = await provider.listEvents(token, { from: new Date(now - FIRST_SYNC_DAYS * DAY), to: new Date(now + 30 * DAY) });
  const names = new Map((await prisma.contact.findMany({ where: { tenantId: connection.tenantId }, select: { id: true, name: true } })).map((c) => [c.id, c.name]));
  let logged = 0;
  for (const e of events) {
    const contactId = e.attendees.map((a) => contacts.get(a)).find(Boolean);
    const externalRef = `${connection.provider}:${e.id}`;
    const existing = await prisma.crmFollowUp.findFirst({ where: { tenantId: connection.tenantId, externalRef } });
    if (!contactId) continue;

    const status = e.cancelled ? "cancelled" : e.end.getTime() < now ? "completed" : "scheduled";
    const data = {
      customer_name: names.get(contactId) ?? e.attendees[0],
      follow_up_type: "meeting", status, scheduled_date: e.start,
      notes: clip(e.title, 500), contactId,
    };
    if (existing) {
      await prisma.crmFollowUp.update({ where: { id: existing.id }, data });
    } else if (!e.cancelled) {
      await prisma.crmFollowUp.create({ data: { ...data, tenantId: connection.tenantId, userId: connection.userId, externalRef } })
        .then(() => { logged += 1; })
        .catch((err) => { if (err.code !== "P2002") throw err; });
    }
  }
  return { scanned: events.length, logged };
}

// ── Support inbox: email → tickets ───────────────────────────────────────────
const TICKET_REF = /\[(TKT-\d{3,})\]/i;

/** Why a message must not become a ticket, or null if it may. */
export function skipReason(m, mailboxEmail) {
  const h = m.headers ?? {};
  const from = (m.from ?? "").toLowerCase();
  if (!from) return "no sender";
  if (from === mailboxEmail.toLowerCase()) return "sent by the support inbox itself";
  if (/^(mailer-daemon|postmaster)@/i.test(from)) return "bounce";
  if (/(^|[._-])no-?reply@/i.test(from)) return "no-reply sender";
  if (h["auto-submitted"] && h["auto-submitted"].toLowerCase() !== "no") return "auto-reply";
  if (/^(bulk|junk|list|auto_reply)$/i.test(h.precedence ?? "")) return "bulk or list mail";
  if (h["x-autoreply"] || h["list-id"]) return "automated or list mail";
  const ours = (process.env.RESEND_FROM ?? "").match(/<([^>]+)>/)?.[1] ?? process.env.RESEND_FROM;
  if (ours && from === String(ours).trim().toLowerCase()) return "sent by ExecUI";
  return null;
}

/** The new part of a reply: drop the quoted history below it. */
export function stripQuoted(text) {
  const lines = String(text ?? "").replace(/\r/g, "").split("\n");
  const cut = lines.findIndex((l) =>
    /^On .+wrote:\s*$/.test(l.trim()) || /^-{2,}\s*Original Message\s*-{2,}/i.test(l.trim()) ||
    /^From: .+/.test(l.trim()) && lines.some((x) => /^Sent: /.test(x.trim())));
  const kept = (cut >= 0 ? lines.slice(0, cut) : lines).filter((l) => !l.startsWith(">"));
  return kept.join("\n").trim();
}

export async function syncSupportInbox(connection, token, since) {
  const provider = getProvider(connection.provider);
  const ids = await provider.listMessageIds(token, { since, inboxOnly: true, max: MAX_MESSAGES });
  const out = { scanned: ids.length, created: 0, replied: 0, skipped: 0 };

  for (const id of ids) {
    const seen = await prisma.supportEmail.findFirst({ where: { connectionId: connection.id, externalId: id }, select: { id: true } });
    if (seen) continue;
    const m = await provider.getMessage(token, id, { withText: true });
    const record = (outcome, extra = {}) => prisma.supportEmail.create({
      data: { tenantId: connection.tenantId, connectionId: connection.id, externalId: id, outcome, receivedAt: m.date, ...extra },
    }).catch((e) => { if (e.code !== "P2002") throw e; });

    const reason = skipReason(m, connection.accountEmail);
    if (reason) { await record("skipped", { reason }); out.skipped += 1; continue; }

    const body = stripQuoted(m.text) || clip(m.snippet, 2000) || "(empty message)";
    const ref = m.subject.match(TICKET_REF)?.[1]?.toUpperCase();
    if (ref) {
      const ticket = await prisma.crmTicket.findFirst({ where: { tenantId: connection.tenantId, ticket_number: ref } });
      // Only the address a ticket belongs to may add to it by email. Anyone else
      // quoting the reference gets their own ticket rather than a way into
      // someone else's conversation.
      if (ticket && ticket.contactEmail && ticket.contactEmail.toLowerCase() === m.from) {
        await addCustomerMessage(ticket.id, { body, authorName: m.fromName, authorEmail: m.from, tenantId: connection.tenantId });
        await record("replied", { ticketId: ticket.id });
        out.replied += 1;
        continue;
      }
    }

    const ticket = await createTicket({
      tenantId: connection.tenantId,
      subject: clip(m.subject.replace(TICKET_REF, ""), 200) || "(no subject)",
      description: body,
      customerName: m.fromName,
      contactEmail: m.from,
      source: "email",
    });
    await record("created", { ticketId: ticket.id });
    out.created += 1;
  }
  return out;
}

// ── One connection, end to end ───────────────────────────────────────────────
/**
 * Sync one connection inside its tenant. Never throws: the outcome is written
 * to the connection (lastSyncAt / lastError) and returned.
 */
export async function syncConnection(connection) {
  return runWithTenant({ tenantId: connection.tenantId }, async () => {
    const startedAt = new Date();
    const since = connection.syncedThrough
      ? new Date(connection.syncedThrough.getTime() - OVERLAP_MS)
      : new Date(startedAt.getTime() - FIRST_SYNC_DAYS * DAY);
    const result = { id: connection.id, purpose: connection.purpose };
    try {
      const token = await accessTokenFor(connection);
      if (connection.purpose === "support_inbox") {
        result.tickets = await syncSupportInbox(connection, token, since);
      } else {
        if (connection.logEmails) result.mail = await syncMail(connection, token, since);
        if (connection.logMeetings) result.calendar = await syncCalendar(connection, token);
      }
      await prisma.oAuthConnection.update({
        where: { id: connection.id },
        data: { lastSyncAt: startedAt, syncedThrough: startedAt, lastError: null },
      });
      result.ok = true;
    } catch (e) {
      result.ok = false;
      result.error = e.message;
      log.warn?.("connection_sync_failed", { id: connection.id, provider: connection.provider, error: e.message });
      if (!e.reauth) {
        await prisma.oAuthConnection.update({
          where: { id: connection.id },
          data: { lastSyncAt: startedAt, lastError: String(e.message).slice(0, 300) },
        }).catch(() => {});
      }
    }
    return result;
  });
}
