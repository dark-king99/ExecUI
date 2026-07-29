/**
 * Developer console API — mounted at /api/developer.
 *
 * These are the in-app (session-authenticated) endpoints behind Account →
 * Developer: issuing API tokens and managing webhook endpoints. Admin-only,
 * because an API token is a standing credential to the organization's data and
 * a webhook endpoint is a standing export of it.
 */
import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import { SCOPES, SCOPE_LABELS, eventTypes } from "./api.resources.js";
import * as tokens from "./tokens.service.js";
import * as webhooks from "../webhooks/webhooks.service.js";

const router = express.Router();
const adminOnly = requireRole("enterprise_admin", "system_admin");
const uid = (req) => req.user.userId;

const handle = (fn, status = 200) => async (req, res) => {
  try { res.status(status).json(await fn(req)); }
  catch (err) { res.status(err.status ?? 500).json({ message: err.message }); }
};

router.use(authenticate, adminOnly);

// Reference data for the UI.
router.get("/meta", handle(() => ({
  scopes: SCOPES.map((s) => ({ scope: s, description: SCOPE_LABELS[s] })),
  events: eventTypes(),
})));

// ── API tokens ───────────────────────────────────────────────────────────────
router.get("/tokens", handle(() => tokens.listTokens()));
router.post("/tokens", handle((req) => tokens.createToken(uid(req), req.body), 201));
router.post("/tokens/:id/revoke", handle((req) => tokens.revokeToken(req.params.id)));
router.delete("/tokens/:id", handle((req) => tokens.deleteToken(req.params.id)));

// ── Webhook endpoints ────────────────────────────────────────────────────────
router.get("/webhooks", handle(() => webhooks.listEndpoints()));
router.post("/webhooks", handle((req) => webhooks.createEndpoint(uid(req), req.body), 201));
router.put("/webhooks/:id", handle((req) => webhooks.updateEndpoint(req.params.id, req.body)));
router.delete("/webhooks/:id", handle((req) => webhooks.deleteEndpoint(req.params.id)));
router.post("/webhooks/:id/rotate", handle((req) => webhooks.rotateSecret(req.params.id)));
router.post("/webhooks/:id/test", handle((req) => webhooks.testEndpoint(req.params.id)));

// ── Delivery log ─────────────────────────────────────────────────────────────
router.get("/deliveries", handle((req) => webhooks.listDeliveries({ endpointId: req.query.endpointId, limit: req.query.limit })));
router.post("/deliveries/:id/replay", handle((req) => webhooks.replayDelivery(req.params.id)));

export default router;
