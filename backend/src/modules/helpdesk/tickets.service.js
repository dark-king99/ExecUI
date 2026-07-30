/**
 * Helpdesk — the agent's side of a support ticket.
 *
 * Portal tickets and internally-raised tickets share one table on purpose: a
 * support queue that forks by where the ticket came from is a queue where
 * something gets missed.
 *
 * The rule that shapes this file is **one thread, two audiences**. An internal
 * note and a customer reply sit in the same conversation so an agent reads one
 * story, and `visibility` is what decides whether the portal ever serves a
 * message. Everything the customer can see goes through `publicMessageWhere()`,
 * so there's a single place to be right about it.
 */
import prisma from "../../config/database.js";
import { log } from "../../lib/logger.js";
import { sendEmail, emailConfigured } from "../../lib/email.js";
import { notify, notifyMany } from "../notifications/notifications.service.js";

const err = (message, status = 400) => { const e = new Error(message); e.status = status; return e; };

const str = (v, max) => (v == null || v === "" ? null : String(v).slice(0, max));
const nameOf = (u) => (u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email : null);
const isEmail = (s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s ?? "").trim());

export const STATUSES = ["open", "in_progress", "pending", "resolved", "closed"];
export const PRIORITIES = ["low", "medium", "high", "urgent"];
export const SOURCES = ["internal", "portal", "email"];
/** Statuses where the customer is waiting on us — the real work queue. */
export const OPEN_STATUSES = ["open", "in_progress", "pending"];

/** The only filter deciding which messages a customer may read. */
export const publicMessageWhere = () => ({ visibility: "public" });

/**
 * Human-readable ticket reference. Sequential per tenant so customers can quote
 * it, with a collision retry because two portal submissions can land together.
 */
export async function nextTicketNumber() {
  const last = await prisma.crmTicket.findFirst({
    where: { ticket_number: { startsWith: "TKT-" } },
    orderBy: { ticket_number: "desc" },
    select: { ticket_number: true },
  });
  const n = last ? Number(String(last.ticket_number).replace(/\D/g, "")) || 0 : 0;
  return `TKT-${String(n + 1).padStart(5, "0")}`;
}

// ── Shaping ──────────────────────────────────────────────────────────────────
export const shapeMessage = (m) => ({
  id: m.id,
  body: m.body,
  authorType: m.authorType,
  authorName: m.authorName,
  authorEmail: m.authorEmail,
  visibility: m.visibility,
  attachmentUrl: m.attachmentUrl,
  attachmentName: m.attachmentName,
  emailed: m.emailed,
  createdAt: m.createdAt,
});

export function shape(t, { messages, now = new Date() } = {}) {
  const waiting = OPEN_STATUSES.includes(t.status);
  return {
    id: t.id,
    ticketNumber: t.ticket_number,
    subject: t.subject,
    description: t.description,
    customerName: t.customer_name,
    contactEmail: t.contactEmail,
    contactId: t.contactId,
    category: t.category,
    priority: t.priority,
    status: t.status,
    slaStatus: t.sla_status,
    source: t.source,
    portalVisible: t.portalVisible,
    assigneeId: t.assigneeId,
    assigneeName: t.assigneeName,
    firstResponseAt: t.firstResponseAt,
    resolvedAt: t.resolvedAt,
    closedAt: t.closedAt,
    satisfaction: t.satisfaction,
    satisfactionComment: t.satisfactionComment,
    open: waiting,
    // Hours since it was raised, so a queue can be triaged at a glance. Only
    // meaningful while it's still open.
    ageHours: waiting ? Math.round(((now - new Date(t.createdAt)) / 3_600_000) * 10) / 10 : null,
    awaitingFirstResponse: waiting && !t.firstResponseAt,
    messageCount: t._count?.messages,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    messages: messages ? messages.map(shapeMessage) : undefined,
  };
}

// ── Reading ──────────────────────────────────────────────────────────────────
export async function listTickets({ status, priority, assigneeId, source, search, mine, userId, unassigned, contactId, contactEmail, limit = 100 } = {}) {
  const where = {};
  if (status === "open") where.status = { in: OPEN_STATUSES };
  else if (status && status !== "all") where.status = status;
  if (priority) where.priority = priority;
  if (source) where.source = source;
  // "What has this customer been complaining about?" — asked from the CRM, where
  // the answer changes how you talk to them.
  if (contactId) where.contactId = contactId;
  if (contactEmail) where.contactEmail = String(contactEmail).trim().toLowerCase();
  if (unassigned) where.assigneeId = null;
  else if (mine && userId) where.assigneeId = userId;
  else if (assigneeId) where.assigneeId = assigneeId;
  if (search) {
    const q = String(search).slice(0, 120);
    where.OR = [
      { subject: { contains: q, mode: "insensitive" } },
      { ticket_number: { contains: q, mode: "insensitive" } },
      { customer_name: { contains: q, mode: "insensitive" } },
      { contactEmail: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.crmTicket.findMany({
    where,
    // Urgent first, then oldest — a queue sorted by newest buries the ticket
    // that has been waiting longest, which is the one that matters.
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: Math.min(500, Math.max(1, Number(limit) || 100)),
    include: { _count: { select: { messages: true } } },
  });
  return rows.map((t) => shape(t));
}

export async function getTicket(id) {
  if (!id) throw err("Ticket not found", 404);
  const row = await prisma.crmTicket.findFirst({ where: { id }, include: { _count: { select: { messages: true } } } });
  if (!row) throw err("Ticket not found", 404);
  const messages = await prisma.ticketMessage.findMany({ where: { ticketId: id }, orderBy: { createdAt: "asc" } });
  return shape(row, { messages });
}

/** Queue health — what a support lead looks at first. */
export async function stats() {
  const now = new Date();
  const [byStatus, byPriority, open, unassigned, satisfaction, resolvedRecently] = await Promise.all([
    prisma.crmTicket.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.crmTicket.groupBy({ by: ["priority"], where: { status: { in: OPEN_STATUSES } }, _count: { _all: true } }),
    prisma.crmTicket.findMany({
      where: { status: { in: OPEN_STATUSES } },
      select: { createdAt: true, firstResponseAt: true, priority: true },
    }),
    prisma.crmTicket.count({ where: { status: { in: OPEN_STATUSES }, assigneeId: null } }),
    prisma.crmTicket.aggregate({ where: { satisfaction: { not: null } }, _avg: { satisfaction: true }, _count: { satisfaction: true } }),
    prisma.crmTicket.findMany({
      where: { resolvedAt: { gte: new Date(now.getTime() - 30 * 86_400_000) } },
      select: { createdAt: true, resolvedAt: true, firstResponseAt: true },
    }),
  ]);

  const avg = (values) => (values.length ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10 : null);

  return {
    byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
    byPriority: Object.fromEntries(byPriority.map((r) => [r.priority, r._count._all])),
    openCount: open.length,
    unassigned,
    awaitingFirstResponse: open.filter((t) => !t.firstResponseAt).length,
    oldestOpenHours: open.length
      ? Math.round((Math.max(...open.map((t) => now - new Date(t.createdAt))) / 3_600_000) * 10) / 10
      : 0,
    // Averages over the last 30 days of resolved work, in hours.
    avgFirstResponseHours: avg(
      resolvedRecently.filter((t) => t.firstResponseAt).map((t) => (new Date(t.firstResponseAt) - new Date(t.createdAt)) / 3_600_000),
    ),
    avgResolutionHours: avg(
      resolvedRecently.map((t) => (new Date(t.resolvedAt) - new Date(t.createdAt)) / 3_600_000),
    ),
    resolvedLast30Days: resolvedRecently.length,
    satisfactionAvg: satisfaction._avg.satisfaction != null ? Math.round(satisfaction._avg.satisfaction * 10) / 10 : null,
    satisfactionResponses: satisfaction._count.satisfaction,
  };
}

// ── Creating ─────────────────────────────────────────────────────────────────
/**
 * Raise a ticket. Used by agents here, and by the portal (which passes
 * `source: "portal"` and the customer's verified email).
 */
export async function createTicket({
  tenantId, subject, description, customerName, contactEmail, contactId,
  category = "general", priority = "medium", source = "internal",
  assigneeId = null, portalVisible = true, actor = null,
}) {
  const title = String(subject ?? "").trim();
  if (!title) throw err("A ticket needs a subject");
  if (!PRIORITIES.includes(priority)) throw err(`Priority must be one of: ${PRIORITIES.join(", ")}`);
  if (!SOURCES.includes(source)) throw err(`Source must be one of: ${SOURCES.join(", ")}`);
  if (contactEmail && !isEmail(contactEmail)) throw err("That email address doesn't look right");

  const email = contactEmail ? String(contactEmail).trim().toLowerCase() : null;
  // A portal ticket with no email address could never be replied to.
  if (source === "portal" && !email) throw err("A portal ticket needs the customer's email address");

  // Link to a CRM contact when one already exists, so the ticket shows up
  // against the customer record rather than floating free.
  let resolvedContactId = contactId ?? null;
  let resolvedName = String(customerName ?? "").trim();
  if (email && !resolvedContactId) {
    const contact = await prisma.contact.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, name: true },
    });
    if (contact) {
      resolvedContactId = contact.id;
      resolvedName = resolvedName || contact.name;
    }
  }
  if (!resolvedName) resolvedName = email ?? "Unknown";

  let assignee = null;
  if (assigneeId) {
    assignee = await prisma.user.findFirst({ where: { id: assigneeId }, select: { id: true, firstName: true, lastName: true, email: true } });
    if (!assignee) throw err("That assignee doesn't exist in this organization", 404);
  }

  // The unique index on (ticket_number, tenantId) is the real guard against two
  // concurrent submissions claiming one reference; retry rather than fail.
  for (let attempt = 0; attempt < 4; attempt++) {
    const ticketNumber = await nextTicketNumber();
    try {
      const ticket = await prisma.crmTicket.create({
        data: {
          ...(tenantId ? { tenantId } : {}),
          ticket_number: ticketNumber,
          subject: title.slice(0, 200),
          description: str(description, 20_000),
          customer_name: resolvedName.slice(0, 200),
          contactEmail: email,
          contactId: resolvedContactId,
          category: str(category, 80) ?? "general",
          priority, source, portalVisible,
          assigneeId: assignee?.id ?? null,
          assigneeName: assignee ? nameOf(assignee) : null,
          status: "open",
        },
      });

      // The opening message *is* the description, kept in the thread too so the
      // conversation reads in order from the top.
      if (description) {
        await prisma.ticketMessage.create({
          data: {
            ...(tenantId ? { tenantId } : {}),
            ticketId: ticket.id,
            body: String(description).slice(0, 20_000),
            authorType: source === "portal" ? "customer" : "agent",
            authorId: actor?.userId ?? null,
            authorName: source === "portal" ? resolvedName : (actor?.name ?? null),
            authorEmail: email,
            visibility: "public",
          },
        });
      }

      await alertAgents(ticket);
      return getTicket(ticket.id);
    } catch (e) {
      if (e.code !== "P2002" || attempt === 3) throw e;
    }
  }
  throw err("Couldn't allocate a ticket reference — please try again", 409);
}

/** Tell someone a ticket arrived: the assignee, or the admins if unassigned. */
async function alertAgents(ticket) {
  try {
    if (ticket.assigneeId) {
      await notify({
        tenantId: ticket.tenantId, userId: ticket.assigneeId, type: "ticket",
        title: `New ticket: ${ticket.subject}`,
        body: `${ticket.ticket_number} · ${ticket.customer_name}`,
        link: `/helpdesk?ticket=${ticket.id}`, actorName: "Helpdesk",
      });
      return;
    }
    const admins = await prisma.user.findMany({
      where: { isActive: true, role: { name: { in: ["enterprise_admin", "system_admin"] } } },
      select: { id: true },
    });
    if (admins.length) {
      await notifyMany(admins.map((a) => a.id), {
        tenantId: ticket.tenantId, type: "ticket",
        title: `New ticket: ${ticket.subject}`,
        body: `${ticket.ticket_number} · ${ticket.customer_name} · unassigned`,
        link: `/helpdesk?ticket=${ticket.id}`, actorName: "Helpdesk",
      });
    }
  } catch (e) {
    log.warn?.("ticket_alert_failed", { ticketId: ticket.id, error: e.message });
  }
}

// ── Updating ─────────────────────────────────────────────────────────────────
export async function updateTicket(user, id, body = {}) {
  const existing = await prisma.crmTicket.findFirst({ where: { id } });
  if (!existing) throw err("Ticket not found", 404);

  const data = {};
  if (body.subject !== undefined) {
    const s = String(body.subject).trim();
    if (!s) throw err("A ticket needs a subject");
    data.subject = s.slice(0, 200);
  }
  if (body.category !== undefined) data.category = str(body.category, 80) ?? "general";
  if (body.priority !== undefined) {
    if (!PRIORITIES.includes(body.priority)) throw err(`Priority must be one of: ${PRIORITIES.join(", ")}`);
    data.priority = body.priority;
  }
  if (body.slaStatus !== undefined) data.sla_status = str(body.slaStatus, 40) ?? "on_track";
  if (body.portalVisible !== undefined) data.portalVisible = !!body.portalVisible;
  if (body.contactEmail !== undefined) {
    if (body.contactEmail && !isEmail(body.contactEmail)) throw err("That email address doesn't look right");
    data.contactEmail = body.contactEmail ? String(body.contactEmail).trim().toLowerCase() : null;
  }
  if (body.customerName !== undefined) data.customer_name = String(body.customerName ?? "").trim().slice(0, 200) || existing.customer_name;

  if (body.assigneeId !== undefined) {
    if (body.assigneeId) {
      const assignee = await prisma.user.findFirst({
        where: { id: String(body.assigneeId) }, select: { id: true, firstName: true, lastName: true, email: true },
      });
      if (!assignee) throw err("That assignee doesn't exist in this organization", 404);
      data.assigneeId = assignee.id;
      data.assigneeName = nameOf(assignee);
    } else {
      data.assigneeId = null;
      data.assigneeName = null;
    }
  }

  if (body.status !== undefined) Object.assign(data, statusPatch(existing, body.status));

  await prisma.crmTicket.update({ where: { id }, data });

  // A reassignment the new owner doesn't hear about is a ticket nobody is
  // actually working on.
  if (data.assigneeId && data.assigneeId !== existing.assigneeId && data.assigneeId !== user.userId) {
    try {
      await notify({
        tenantId: existing.tenantId, userId: data.assigneeId, type: "ticket",
        title: `Assigned to you: ${existing.subject}`,
        body: `${existing.ticket_number} · ${existing.customer_name}`,
        link: `/helpdesk?ticket=${id}`, actorName: "Helpdesk",
      });
    } catch { /* the assignment stands regardless */ }
  }

  if (data.status && data.status !== existing.status) {
    await systemMessage(id, existing.tenantId, `Status changed from ${existing.status} to ${data.status}${user?.name ? ` by ${user.name}` : ""}`);
    if (["resolved", "closed"].includes(data.status)) await notifyCustomerOfOutcome(existing, data.status);
  }

  return getTicket(id);
}

/** Status side effects, kept in one place so the timestamps stay coherent. */
function statusPatch(ticket, status) {
  if (!STATUSES.includes(status)) throw err(`Status must be one of: ${STATUSES.join(", ")}`);
  const patch = { status };
  if (status === "resolved") patch.resolvedAt = ticket.resolvedAt ?? new Date();
  if (status === "closed") {
    patch.closedAt = new Date();
    // Closing without ever resolving still counts as resolved for reporting —
    // otherwise resolution time silently excludes the tickets that ended.
    patch.resolvedAt = ticket.resolvedAt ?? new Date();
  }
  if (OPEN_STATUSES.includes(status)) {
    // Reopening clears the outcome, or "resolved 3 days ago" contradicts an open ticket.
    patch.resolvedAt = null;
    patch.closedAt = null;
  }
  return patch;
}

async function systemMessage(ticketId, tenantId, body) {
  try {
    await prisma.ticketMessage.create({
      data: {
        ...(tenantId ? { tenantId } : {}),
        ticketId, body: String(body).slice(0, 500),
        authorType: "system", visibility: "internal",
      },
    });
  } catch (e) {
    log.warn?.("ticket_system_message_failed", { ticketId, error: e.message });
  }
}

// ── Replying ─────────────────────────────────────────────────────────────────
/**
 * Post a message. `visibility: "internal"` keeps it off the portal entirely —
 * and an internal note is deliberately NOT treated as a first response, because
 * the customer hasn't heard anything.
 */
export async function addMessage(user, id, { body, visibility = "public", status, attachmentUrl, attachmentName } = {}) {
  const ticket = await prisma.crmTicket.findFirst({ where: { id } });
  if (!ticket) throw err("Ticket not found", 404);

  const text = String(body ?? "").trim();
  if (!text) throw err("Write a message first");
  if (!["public", "internal"].includes(visibility)) throw err('Visibility must be "public" or "internal"');
  if (visibility === "public" && !ticket.contactEmail) {
    throw err("This ticket has no customer email address, so a public reply couldn't reach anyone. Add one, or make this an internal note.");
  }

  const me = await prisma.user.findFirst({
    where: { id: user.userId }, select: { firstName: true, lastName: true, email: true },
  });

  const message = await prisma.ticketMessage.create({
    data: {
      ticketId: id,
      body: text.slice(0, 20_000),
      authorType: "agent",
      authorId: user.userId,
      authorName: nameOf(me),
      visibility,
      attachmentUrl: str(attachmentUrl, 500),
      attachmentName: str(attachmentName, 200),
    },
  });

  const patch = {};
  if (visibility === "public" && !ticket.firstResponseAt) patch.firstResponseAt = new Date();
  if (status !== undefined) Object.assign(patch, statusPatch(ticket, status));
  // A public reply on an untouched ticket means someone has picked it up.
  else if (visibility === "public" && ticket.status === "open") patch.status = "in_progress";
  if (Object.keys(patch).length) await prisma.crmTicket.update({ where: { id }, data: patch });

  if (visibility === "public") {
    const emailed = await emailCustomer(ticket, { body: text, authorName: nameOf(me) });
    if (emailed) await prisma.ticketMessage.update({ where: { id: message.id }, data: { emailed: true } });
  }

  return getTicket(id);
}

/**
 * Email the customer a reply. Returns whether it actually went — the caller
 * records that on the message, so the thread shows what was really delivered
 * instead of implying every reply reached someone.
 */
async function emailCustomer(ticket, { body, authorName }) {
  if (!ticket.contactEmail) return false;
  try {
    await sendEmail({
      tenantId: ticket.tenantId,
      to: ticket.contactEmail,
      subject: `Re: [${ticket.ticket_number}] ${ticket.subject}`,
      text: [
        `Hello ${ticket.customer_name},`,
        "",
        body,
        "",
        authorName ? `— ${authorName}` : "",
        "",
        "You can reply to this request in the support portal.",
      ].filter(Boolean).join("\n"),
      context: "ticket_reply",
    });
    return emailConfigured();
  } catch (e) {
    log.warn?.("ticket_email_failed", { ticketId: ticket.id, error: e.message });
    return false;
  }
}

async function notifyCustomerOfOutcome(ticket, status) {
  if (!ticket.contactEmail) return;
  try {
    await sendEmail({
      tenantId: ticket.tenantId,
      to: ticket.contactEmail,
      subject: `[${ticket.ticket_number}] ${status === "resolved" ? "Resolved" : "Closed"}: ${ticket.subject}`,
      text: [
        `Hello ${ticket.customer_name},`,
        "",
        status === "resolved"
          ? "We've marked your request as resolved. If it isn't sorted, reply in the portal and it will reopen."
          : "This request is now closed.",
        "",
        "You can rate how we did in the support portal — it takes one click.",
      ].join("\n"),
      context: "ticket_outcome",
    });
  } catch (e) {
    log.warn?.("ticket_outcome_email_failed", { ticketId: ticket.id, error: e.message });
  }
}

/**
 * A customer's reply, from the portal. Reopens a resolved ticket: if they're
 * still writing, it isn't resolved.
 */
export async function addCustomerMessage(ticketId, { body, authorName, authorEmail, tenantId } = {}) {
  const ticket = await prisma.crmTicket.findFirst({ where: { id: ticketId } });
  if (!ticket) throw err("Ticket not found", 404);

  const text = String(body ?? "").trim();
  if (!text) throw err("Write a message first");

  await prisma.ticketMessage.create({
    data: {
      ...(tenantId ? { tenantId } : {}),
      ticketId,
      body: text.slice(0, 20_000),
      authorType: "customer",
      authorName: str(authorName, 200) ?? ticket.customer_name,
      authorEmail: str(authorEmail, 200) ?? ticket.contactEmail,
      visibility: "public",
    },
  });

  const patch = {};
  if (["resolved", "closed"].includes(ticket.status)) {
    patch.status = "open";
    patch.resolvedAt = null;
    patch.closedAt = null;
  } else if (ticket.status === "pending") {
    // "Pending" means we were waiting on them; they've answered.
    patch.status = "in_progress";
  }
  if (Object.keys(patch).length) await prisma.crmTicket.update({ where: { id: ticketId }, data: patch });

  try {
    const target = ticket.assigneeId;
    const title = `Customer replied: ${ticket.subject}`;
    const bodyLine = `${ticket.ticket_number} · ${ticket.customer_name}`;
    if (target) {
      await notify({
        tenantId: ticket.tenantId, userId: target, type: "ticket",
        title, body: bodyLine, link: `/helpdesk?ticket=${ticketId}`, actorName: "Helpdesk",
      });
    } else {
      const admins = await prisma.user.findMany({
        where: { isActive: true, role: { name: { in: ["enterprise_admin", "system_admin"] } } },
        select: { id: true },
      });
      if (admins.length) {
        await notifyMany(admins.map((a) => a.id), {
          tenantId: ticket.tenantId, type: "ticket", title, body: bodyLine,
          link: `/helpdesk?ticket=${ticketId}`, actorName: "Helpdesk",
        });
      }
    }
  } catch (e) {
    log.warn?.("ticket_customer_reply_notify_failed", { ticketId, error: e.message });
  }

  if (patch.status === "open") await systemMessage(ticketId, ticket.tenantId, "Reopened by the customer's reply");
  return { posted: true, status: patch.status ?? ticket.status };
}

/** The customer's rating, once. */
export async function rateTicket(ticketId, { score, comment } = {}) {
  const ticket = await prisma.crmTicket.findFirst({ where: { id: ticketId } });
  if (!ticket) throw err("Ticket not found", 404);

  const value = Math.trunc(Number(score));
  if (!Number.isFinite(value) || value < 1 || value > 5) throw err("Give a rating from 1 to 5");
  if (!["resolved", "closed"].includes(ticket.status)) throw err("You can rate a request once it's been resolved.", 409);
  if (ticket.satisfaction != null) throw err("Thanks — you've already rated this request.", 409);

  await prisma.crmTicket.update({
    where: { id: ticketId },
    data: { satisfaction: value, satisfactionComment: str(comment, 1000) },
  });
  await systemMessage(ticketId, ticket.tenantId, `Customer rated this ${value}/5${comment ? `: ${comment}` : ""}`);

  // A poor rating that nobody sees is a wasted warning.
  if (value <= 2) {
    try {
      const admins = await prisma.user.findMany({
        where: { isActive: true, role: { name: { in: ["enterprise_admin", "system_admin"] } } },
        select: { id: true },
      });
      if (admins.length) {
        await notifyMany(admins.map((a) => a.id), {
          tenantId: ticket.tenantId, type: "ticket",
          title: `Low rating (${value}/5) on ${ticket.ticket_number}`,
          body: comment || ticket.subject,
          link: `/helpdesk?ticket=${ticketId}`, actorName: "Helpdesk",
        });
      }
    } catch { /* best effort */ }
  }

  return { rated: true, score: value };
}
