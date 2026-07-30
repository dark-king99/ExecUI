/**
 * Customer portal — the outside face of the helpdesk.
 *
 * Authentication is a **magic link**, not a password. Customers are not staff:
 * giving them accounts means storing passwords, handling resets and defending a
 * second login surface, all to let someone check a ticket. Instead they prove
 * they own an email address and get a short-lived session.
 *
 * The security decisions that follow from that:
 *
 * • Only the **SHA-256 of each token** is stored — for the link and the session
 *   alike — so a database dump can't be used to sign in as a customer.
 * • Links are **single-use and short-lived**, and requesting one **always returns
 *   the same response** whether or not the address is known. Telling a stranger
 *   "no such customer" leaks your customer list.
 * • When no email provider is configured the link is **not** returned to the
 *   caller. That would hand anyone a session for any address they typed —
 *   the exact thing the email step exists to prevent. The portal says it couldn't
 *   send, and an admin can issue a link from the console instead.
 * • A session is scoped to one tenant and one email address. Every read is
 *   filtered by that address, so there is no id a customer could tamper with to
 *   see somebody else's ticket.
 */
import crypto from "crypto";
import prisma from "../../config/database.js";
import { runUnscoped, runWithTenant } from "../../lib/tenantContext.js";
import { sendEmail, emailConfigured } from "../../lib/email.js";
import { log } from "../../lib/logger.js";
import * as tickets from "./tickets.service.js";
import * as kb from "./kb.service.js";

const err = (message, status = 400) => { const e = new Error(message); e.status = status; return e; };

const LINK_TTL_MINUTES = 20;
const SESSION_TTL_DAYS = 14;

const isEmail = (s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s ?? "").trim());
const normEmail = (e) => String(e ?? "").trim().toLowerCase();

export const newToken = () => crypto.randomBytes(32).toString("base64url");
export const hashToken = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");

const appUrl = () => (process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
export const portalUrl = (slug) => `${appUrl()}/portal/${encodeURIComponent(slug)}`;
export const magicUrl = (slug, token) => `${portalUrl(slug)}?t=${encodeURIComponent(token)}`;

/**
 * Resolve the organization from the slug in the URL. Unscoped by necessity —
 * this runs before any tenant context exists — and it returns only what the
 * portal needs to render a header.
 */
export async function resolveTenant(slug) {
  const key = String(slug ?? "").trim().toLowerCase();
  if (!key) throw err("Support portal not found", 404);
  const tenant = await runUnscoped(async () =>
    prisma.tenant.findFirst({
      where: { slug: key },
      select: { id: true, name: true, slug: true },
    }),
  );
  if (!tenant) throw err("Support portal not found", 404);
  return tenant;
}

/** Public landing data: who this is, plus the help centre. No account needed. */
export async function landing(slug) {
  const tenant = await resolveTenant(slug);
  const help = await runWithTenant({ tenantId: tenant.id }, async () => kb.publicIndex());
  return {
    organization: { name: tenant.name, slug: tenant.slug },
    help,
    emailConfigured: emailConfigured(),
  };
}

// ── Magic-link sign-in ───────────────────────────────────────────────────────
/**
 * Issue a sign-in link. The response is deliberately identical for a known and
 * an unknown address.
 */
export async function requestLink(slug, email, { ip } = {}) {
  const tenant = await resolveTenant(slug);
  const address = normEmail(email);
  if (!isEmail(address)) throw err("Enter a valid email address");

  const token = newToken();
  const sent = await runWithTenant({ tenantId: tenant.id }, async () => {
    // Old pending links for this address are spent — a new request should
    // invalidate them rather than leaving several usable at once.
    await prisma.portalMagicLink.updateMany({
      where: { email: address, usedAt: null }, data: { usedAt: new Date() },
    });
    await prisma.portalMagicLink.create({
      data: {
        email: address,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + LINK_TTL_MINUTES * 60_000),
        ip: ip ? String(ip).slice(0, 64) : null,
      },
    });

    try {
      await sendEmail({
        tenantId: tenant.id,
        to: address,
        subject: `Your ${tenant.name} support sign-in link`,
        text: [
          "Hello,",
          "",
          `Here's your link to view and reply to your ${tenant.name} support requests:`,
          "",
          magicUrl(tenant.slug, token),
          "",
          `It works once and expires in ${LINK_TTL_MINUTES} minutes.`,
          "",
          "If you didn't ask for this, you can ignore this message — nobody can sign in without the link.",
        ].join("\n"),
        context: "portal_magic_link",
      });
      return emailConfigured();
    } catch (e) {
      log.warn?.("portal_link_email_failed", { error: e.message });
      return false;
    }
  });

  return {
    // Same words either way: whether the address is on file is not a stranger's
    // business, and the link itself is never in this response.
    message: sent
      ? `If ${address} has support requests with us, a sign-in link is on its way. It expires in ${LINK_TTL_MINUTES} minutes.`
      : "We couldn't send the email — this portal has no email provider configured yet. Please contact support directly, and ask them to send you a link.",
    delivered: sent,
    expiresInMinutes: LINK_TTL_MINUTES,
  };
}

/** Exchange a link token for a session. Single-use: consumed on success. */
export async function verifyLink(slug, token, { ip, userAgent } = {}) {
  const tenant = await resolveTenant(slug);
  if (!token || String(token).length < 20) throw err("That sign-in link isn't valid.", 404);

  return runWithTenant({ tenantId: tenant.id }, async () => {
    const link = await prisma.portalMagicLink.findFirst({ where: { tokenHash: hashToken(token) } });
    if (!link) throw err("That sign-in link isn't valid, or it has already been used.", 404);
    if (link.usedAt) throw err("That link has already been used. Request a new one.", 410);
    if (link.expiresAt < new Date()) throw err("That link has expired. Request a new one.", 410);

    await prisma.portalMagicLink.update({ where: { id: link.id }, data: { usedAt: new Date() } });

    const contact = await prisma.contact.findFirst({
      where: { email: { equals: link.email, mode: "insensitive" } }, select: { id: true, name: true },
    });

    const sessionToken = newToken();
    await prisma.portalSession.create({
      data: {
        email: link.email,
        contactId: contact?.id ?? null,
        tokenHash: hashToken(sessionToken),
        expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000),
        ip: ip ? String(ip).slice(0, 64) : null,
        userAgent: userAgent ? String(userAgent).slice(0, 300) : null,
      },
    });

    return {
      token: sessionToken,
      email: link.email,
      name: contact?.name ?? null,
      organization: { name: tenant.name, slug: tenant.slug },
      expiresInDays: SESSION_TTL_DAYS,
    };
  });
}

/**
 * Resolve a portal session token. Unscoped lookup (there is no context yet), and
 * everything the caller reaches afterwards is pinned to the tenant and email
 * address this returns.
 */
export async function resolveSession(slug, token) {
  const tenant = await resolveTenant(slug);
  if (!token || String(token).length < 20) throw err("Please sign in to view your requests.", 401);

  const session = await runUnscoped(async () =>
    prisma.portalSession.findFirst({ where: { tokenHash: hashToken(token) } }),
  );
  if (!session) throw err("Your session has expired. Request a new sign-in link.", 401);
  // A session from another organization must not work here, even if valid there.
  if (session.tenantId !== tenant.id) throw err("Your session has expired. Request a new sign-in link.", 401);
  if (session.expiresAt < new Date()) throw err("Your session has expired. Request a new sign-in link.", 401);

  runWithTenant({ tenantId: tenant.id }, async () =>
    prisma.portalSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }),
  ).catch(() => {});

  return { tenantId: tenant.id, tenant, email: session.email, contactId: session.contactId, sessionId: session.id };
}

export async function signOut(slug, token) {
  try {
    const session = await resolveSession(slug, token);
    await runWithTenant({ tenantId: session.tenantId }, async () =>
      prisma.portalSession.delete({ where: { id: session.sessionId } }),
    );
  } catch { /* signing out of an invalid session is already the desired state */ }
  return { signedOut: true };
}

/** Housekeeping: drop expired links and sessions. Called by the helpdesk ticker. */
export async function purgeExpired() {
  const now = new Date();
  const [links, sessions] = await Promise.all([
    prisma.portalMagicLink.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }] } }),
    prisma.portalSession.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);
  return { links: links.count, sessions: sessions.count };
}

// ── The customer's own tickets ───────────────────────────────────────────────
/** Only what the portal may show: public messages, and no internal fields. */
const shapeForCustomer = (t, messages) => ({
  id: t.id,
  ticketNumber: t.ticket_number,
  subject: t.subject,
  status: t.status,
  priority: t.priority,
  category: t.category,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
  resolvedAt: t.resolvedAt,
  satisfaction: t.satisfaction,
  canRate: ["resolved", "closed"].includes(t.status) && t.satisfaction == null,
  // Names are shown so a reply feels like a person; internal notes, assignee
  // ids, SLA state and agent emails are not the customer's business.
  messages: (messages ?? []).map((m) => ({
    id: m.id,
    body: m.body,
    authorType: m.authorType,
    authorName: m.authorType === "customer" ? (m.authorName ?? "You") : (m.authorName ?? "Support"),
    attachmentUrl: m.attachmentUrl,
    attachmentName: m.attachmentName,
    createdAt: m.createdAt,
  })),
});

/** Where clause locating this customer's visible tickets — never an empty filter. */
const ticketsWhere = (email) => ({
  contactEmail: { equals: email, mode: "insensitive" },
  portalVisible: true,
});

export async function listMyTickets(session) {
  return runWithTenant({ tenantId: session.tenantId }, async () => {
    const rows = await prisma.crmTicket.findMany({
      where: ticketsWhere(session.email),
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { _count: { select: { messages: { where: tickets.publicMessageWhere() } } } },
    });
    return rows.map((t) => ({
      ...shapeForCustomer(t, []),
      messageCount: t._count.messages,
    }));
  });
}

export async function getMyTicket(session, id) {
  return runWithTenant({ tenantId: session.tenantId }, async () => {
    const ticket = await prisma.crmTicket.findFirst({ where: { id, ...ticketsWhere(session.email) } });
    // Not "forbidden": whether a ticket exists is itself information.
    if (!ticket) throw err("Request not found", 404);
    const messages = await prisma.ticketMessage.findMany({
      where: { ticketId: id, ...tickets.publicMessageWhere() },
      orderBy: { createdAt: "asc" },
    });
    return shapeForCustomer(ticket, messages);
  });
}

export async function submitTicket(session, body = {}) {
  return runWithTenant({ tenantId: session.tenantId }, async () => {
    const created = await tickets.createTicket({
      tenantId: session.tenantId,
      subject: body.subject,
      description: body.description,
      // The email always comes from the verified session, never the request —
      // otherwise anyone could file a ticket as somebody else.
      contactEmail: session.email,
      contactId: session.contactId,
      customerName: body.name,
      category: body.category,
      priority: ["low", "medium", "high"].includes(body.priority) ? body.priority : "medium",
      source: "portal",
    });
    return getMyTicket(session, created.id);
  });
}

export async function replyToTicket(session, id, body = {}) {
  return runWithTenant({ tenantId: session.tenantId }, async () => {
    const ticket = await prisma.crmTicket.findFirst({ where: { id, ...ticketsWhere(session.email) }, select: { id: true } });
    if (!ticket) throw err("Request not found", 404);
    await tickets.addCustomerMessage(id, {
      body: body.body,
      authorEmail: session.email,
      authorName: body.name,
      tenantId: session.tenantId,
    });
    return getMyTicket(session, id);
  });
}

export async function rateMyTicket(session, id, body = {}) {
  return runWithTenant({ tenantId: session.tenantId }, async () => {
    const ticket = await prisma.crmTicket.findFirst({ where: { id, ...ticketsWhere(session.email) }, select: { id: true } });
    if (!ticket) throw err("Request not found", 404);
    await tickets.rateTicket(id, { score: body.score, comment: body.comment });
    return getMyTicket(session, id);
  });
}

// ── Help centre (no session needed) ──────────────────────────────────────────
export async function helpIndex(slug) {
  const tenant = await resolveTenant(slug);
  return runWithTenant({ tenantId: tenant.id }, async () => kb.publicIndex());
}

export async function helpArticle(slug, slugOrId) {
  const tenant = await resolveTenant(slug);
  return runWithTenant({ tenantId: tenant.id }, async () => kb.publicArticle(slugOrId));
}

export async function helpSearch(slug, query) {
  const tenant = await resolveTenant(slug);
  return runWithTenant({ tenantId: tenant.id }, async () => kb.publicSearch(query));
}

export async function helpFeedback(slug, articleId, body = {}) {
  const tenant = await resolveTenant(slug);
  return runWithTenant({ tenantId: tenant.id }, async () =>
    kb.recordFeedback(articleId, { helpful: body.helpful, comment: body.comment, email: body.email }),
  );
}

/** Suggested articles for what someone is about to ask — deflection, done politely. */
export async function helpSuggest(slug, text) {
  const tenant = await resolveTenant(slug);
  const suggestions = await runWithTenant({ tenantId: tenant.id }, async () => kb.suggestForText(text));
  return { suggestions };
}

// ── Admin support ────────────────────────────────────────────────────────────
/**
 * Issue a sign-in link on a customer's behalf, and return it. This is the
 * escape hatch for "no email provider configured" — deliberately available only
 * to an authenticated admin, who is trusted to hand it to the right person.
 */
export async function issueLinkForAdmin(tenantId, email) {
  const address = normEmail(email);
  if (!isEmail(address)) throw err("Enter a valid email address");

  const tenant = await runUnscoped(async () =>
    prisma.tenant.findFirst({ where: { id: tenantId }, select: { slug: true } }),
  );
  if (!tenant) throw err("Organization not found", 404);

  const token = newToken();
  await prisma.portalMagicLink.updateMany({ where: { email: address, usedAt: null }, data: { usedAt: new Date() } });
  await prisma.portalMagicLink.create({
    data: {
      email: address,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + LINK_TTL_MINUTES * 60_000),
    },
  });

  return {
    email: address,
    url: magicUrl(tenant.slug, token),
    expiresInMinutes: LINK_TTL_MINUTES,
    note: "Single-use and expires shortly. Send it only to the person who owns this address — it signs them in.",
  };
}

/** Portal address + activity, for the admin console. */
export async function portalInfo(tenantId) {
  const tenant = await runUnscoped(async () =>
    prisma.tenant.findFirst({ where: { id: tenantId }, select: { name: true, slug: true } }),
  );
  const [activeSessions, pendingLinks, portalTickets] = await Promise.all([
    prisma.portalSession.count({ where: { expiresAt: { gt: new Date() } } }),
    prisma.portalMagicLink.count({ where: { usedAt: null, expiresAt: { gt: new Date() } } }),
    prisma.crmTicket.count({ where: { source: "portal" } }),
  ]);
  return {
    url: portalUrl(tenant.slug),
    organization: tenant.name,
    emailConfigured: emailConfigured(),
    activeSessions,
    pendingLinks,
    portalTickets,
    note: emailConfigured()
      ? null
      : "No email provider is configured, so customers can't receive sign-in links or reply notifications. Issue links manually until one is set up.",
  };
}
