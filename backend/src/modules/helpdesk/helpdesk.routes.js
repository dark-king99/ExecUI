/**
 * Helpdesk & knowledge base — mounted at /api/helpdesk.
 *
 * Support is a CRM function, so the queue is gated by the same `crm` section
 * every other ticket view uses: whoever handles customers can work the queue.
 * Publishing to the *public* help centre and issuing portal sign-in links are
 * admin actions — they're outward-facing, and a published article is a statement
 * the company is making to its customers.
 */
import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireModule } from "../../middleware/access.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import * as tickets from "./tickets.service.js";
import * as kb from "./kb.service.js";
import * as portal from "./portal.service.js";

const router = express.Router();
const admin = requireRole("enterprise_admin", "system_admin");

const actor = (req) => ({ userId: req.user.userId, role: req.user.role, name: req.user.name, tenantId: req.user.tenantId });

const handle = (fn, status = 200) => async (req, res) => {
  try { res.status(status).json(await fn(req)); }
  catch (err) { res.status(err.status ?? 500).json({ message: err.message }); }
};

router.use(authenticate, requireModule("crm"));

// ── Queue ────────────────────────────────────────────────────────────────────
router.get("/stats", handle(() => tickets.stats()));
router.get("/tickets", handle((req) => tickets.listTickets({
  status: req.query.status, priority: req.query.priority, source: req.query.source,
  assigneeId: req.query.assigneeId, search: req.query.search,
  mine: req.query.mine === "true", unassigned: req.query.unassigned === "true",
  contactId: req.query.contactId, contactEmail: req.query.contactEmail,
  userId: req.user.userId, limit: req.query.limit,
})));
router.post("/tickets", handle((req) => tickets.createTicket({
  tenantId: req.user.tenantId,
  subject: req.body?.subject, description: req.body?.description,
  customerName: req.body?.customerName, contactEmail: req.body?.contactEmail,
  category: req.body?.category, priority: req.body?.priority,
  assigneeId: req.body?.assigneeId, portalVisible: req.body?.portalVisible !== false,
  source: "internal", actor: actor(req),
}), 201));
router.get("/tickets/:id", handle((req) => tickets.getTicket(req.params.id)));
router.put("/tickets/:id", handle((req) => tickets.updateTicket(actor(req), req.params.id, req.body)));
router.post("/tickets/:id/messages", handle((req) => tickets.addMessage(actor(req), req.params.id, req.body), 201));

// Articles worth linking in a reply, for whatever the ticket is about.
router.post("/suggest-articles", handle((req) => kb.suggestForText(req.body?.text, { limit: req.body?.limit })));

// ── Knowledge base ───────────────────────────────────────────────────────────
router.get("/kb/stats", handle(() => kb.stats()));
router.get("/kb/categories", handle((req) => kb.listCategories({ includeInactive: req.query.all === "true" })));
router.post("/kb/categories", admin, handle((req) => kb.createCategory(req.body), 201));
router.put("/kb/categories/:id", admin, handle((req) => kb.updateCategory(req.params.id, req.body)));
router.delete("/kb/categories/:id", admin, handle((req) => kb.deleteCategory(req.params.id)));

router.get("/kb/articles", handle((req) => kb.listArticles({
  categoryId: req.query.categoryId, status: req.query.status,
  visibility: req.query.visibility, search: req.query.search, limit: req.query.limit,
})));
router.post("/kb/articles", admin, handle((req) => kb.createArticle(actor(req), req.body), 201));
router.get("/kb/articles/:id", handle((req) => kb.getArticle(req.params.id)));
router.put("/kb/articles/:id", admin, handle((req) => kb.updateArticle(req.params.id, req.body)));
router.delete("/kb/articles/:id", admin, handle((req) => kb.deleteArticle(req.params.id)));

// ── Portal administration ────────────────────────────────────────────────────
router.get("/portal", admin, handle((req) => portal.portalInfo(req.user.tenantId)));
router.post("/portal/link", admin, handle((req) => portal.issueLinkForAdmin(req.user.tenantId, req.body?.email), 201));

export default router;
