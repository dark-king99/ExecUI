/**
 * Public customer portal API — mounted at /api/portal/:slug.
 *
 * Unauthenticated by design: the people using it are customers, not staff. What
 * stands in for a session:
 *
 *   • the **organization slug in the path** — there is no tenant header to spoof,
 *     and a session issued by one organization is refused by another;
 *   • a **bearer session token** for anything about *their* tickets, resolved to
 *     one verified email address that every query is then filtered by;
 *   • **rate limits** on the two endpoints that cost something: requesting a
 *     sign-in link (which sends mail) and submitting a ticket.
 *
 * The help centre needs no session at all — a help centre you have to sign in to
 * read is a help centre nobody reads.
 */
import express from "express";
import rateLimit from "express-rate-limit";
import { ipKeyGenerator } from "express-rate-limit";
import * as portal from "./portal.service.js";

const router = express.Router();

const limiter = (max, windowMs = 60_000) => rateLimit({
  windowMs, max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  message: { message: "Too many attempts — please wait a moment and try again." },
});

// Sending email on demand is the expensive, abusable one; keep it tight.
const linkLimit = limiter(Number(process.env.PORTAL_LINK_LIMIT_PER_HOUR) || 8, 3_600_000);
const writeLimit = limiter(Number(process.env.PORTAL_WRITE_LIMIT_PER_MIN) || 12);
const readLimit = limiter(Number(process.env.PORTAL_READ_LIMIT_PER_MIN) || 120);

router.use(readLimit);

const from = (req) => ({ ip: req.ip, userAgent: req.get("user-agent") });
const bearer = (req) => {
  const header = req.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : (req.query.session ?? null);
};

const handle = (fn, status = 200) => async (req, res) => {
  try { res.status(status).json(await fn(req)); }
  catch (err) { res.status(err.status ?? 500).json({ message: err.message }); }
};

/** Resolve the caller's portal session, or fail with 401. */
const session = (req) => portal.resolveSession(req.params.slug, bearer(req));

// ── Public: the org + help centre ────────────────────────────────────────────
router.get("/:slug", handle((req) => portal.landing(req.params.slug)));
router.get("/:slug/help", handle((req) => portal.helpIndex(req.params.slug)));
router.get("/:slug/help/search", handle((req) => portal.helpSearch(req.params.slug, req.query.q)));
router.post("/:slug/help/suggest", handle((req) => portal.helpSuggest(req.params.slug, req.body?.text)));
router.get("/:slug/help/:article", handle((req) => portal.helpArticle(req.params.slug, req.params.article)));
router.post("/:slug/help/:article/feedback", writeLimit, handle((req) => portal.helpFeedback(req.params.slug, req.params.article, req.body), 201));

// ── Sign-in ──────────────────────────────────────────────────────────────────
router.post("/:slug/auth/request", linkLimit, handle((req) => portal.requestLink(req.params.slug, req.body?.email, from(req)), 202));
router.post("/:slug/auth/verify", writeLimit, handle((req) => portal.verifyLink(req.params.slug, req.body?.token, from(req))));
router.post("/:slug/auth/signout", handle((req) => portal.signOut(req.params.slug, bearer(req))));
router.get("/:slug/auth/me", handle(async (req) => {
  const s = await session(req);
  return { email: s.email, organization: { name: s.tenant.name, slug: s.tenant.slug } };
}));

// ── The customer's own requests ──────────────────────────────────────────────
router.get("/:slug/tickets", handle(async (req) => portal.listMyTickets(await session(req))));
router.post("/:slug/tickets", writeLimit, handle(async (req) => portal.submitTicket(await session(req), req.body), 201));
router.get("/:slug/tickets/:id", handle(async (req) => portal.getMyTicket(await session(req), req.params.id)));
router.post("/:slug/tickets/:id/reply", writeLimit, handle(async (req) => portal.replyToTicket(await session(req), req.params.id, req.body), 201));
router.post("/:slug/tickets/:id/rate", writeLimit, handle(async (req) => portal.rateMyTicket(await session(req), req.params.id, req.body)));

export default router;
