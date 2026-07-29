/**
 * The public API — mounted at /api/v1.
 *
 * Authenticated by API token (never the app's session JWT), scoped per
 * resource, rate limited per token, and versioned so the contract can evolve
 * without breaking integrations.
 */
import express from "express";
import { authenticateApiToken, requireScope, apiRateLimit, apiError } from "../../middleware/apiAuth.middleware.js";
import { RESOURCES, SCOPES, SCOPE_LABELS, describeResource, eventTypes } from "./api.resources.js";
import { buildOpenApi } from "./openapi.js";
import * as api from "./api.service.js";
import * as webhooks from "../webhooks/webhooks.service.js";
import * as reports from "../reports/reports.service.js";

const router = express.Router();

// ── Unauthenticated discovery ────────────────────────────────────────────────
// The spec is the contract; it carries no customer data, so it's public.
router.get("/openapi.json", (req, res) => {
  const base = `${process.env.APP_URL || `${req.protocol}://${req.get("host")}`}/api/v1`;
  res.json(buildOpenApi(base));
});

// ── Everything below requires a token ────────────────────────────────────────
router.use(authenticateApiToken, apiRateLimit);

/** Index — what this token can reach. */
router.get("/", (req, res) => {
  res.json({
    object: "index",
    version: "v1",
    documentation: "/api/v1/openapi.json",
    scopes: req.apiToken.scopes,
    resources: Object.values(RESOURCES)
      .filter((r) => req.apiToken.scopes.includes(`${r.scope}:read`) || req.apiToken.scopes.includes(`${r.scope}:write`))
      .map((r) => describeResource(r)),
    webhook_events: eventTypes(),
  });
});

/** Introspection — verify a token without touching business data. */
router.get("/me", (req, res) => {
  res.json({
    object: "token",
    id: req.apiToken.id,
    name: req.apiToken.name,
    prefix: req.apiToken.prefix,
    scopes: req.apiToken.scopes,
    tenantId: req.apiToken.tenantId,
    expiresAt: req.apiToken.expiresAt,
  });
});

router.get("/scopes", (_req, res) => {
  res.json({ object: "list", data: SCOPES.map((s) => ({ scope: s, description: SCOPE_LABELS[s] })) });
});

const send = (fn, okStatus = 200) => async (req, res) => {
  try {
    res.status(okStatus).json(await fn(req));
  } catch (e) {
    apiError(res, e.status ?? 500, e.code ?? "internal_error", e.status ? e.message : "Something went wrong on our side.");
  }
};

// ── Resource CRUD (generated from the registry) ──────────────────────────────
for (const resource of Object.values(RESOURCES)) {
  const path = `/${resource.id}`;
  const read = requireScope(`${resource.scope}:read`, `${resource.scope}:write`);
  const write = requireScope(`${resource.scope}:write`);

  router.get(path, read, send((req) => api.list(resource.id, req.query)));
  router.get(`${path}/:id`, read, send((req) => api.retrieve(resource.id, req.params.id)));

  if (!resource.readOnly) {
    router.post(path, write, send((req) => api.create(resource.id, req.body), 201));
    router.patch(`${path}/:id`, write, send((req) => api.update(resource.id, req.params.id, req.body)));
    router.delete(`${path}/:id`, write, send((req) => api.remove(resource.id, req.params.id)));
  }
}

// ── Reports (run a saved report and get its rows as JSON) ────────────────────
router.get("/reports", requireScope("reports:read"), send(async (req) => ({
  object: "list",
  data: await reports.listReports(req.apiToken.createdById, req.tenantId),
})));

router.post("/reports/:id/run", requireScope("reports:read"), send((req) =>
  reports.runSaved(req.apiToken.createdById, req.tenantId, req.params.id, req.body || {}),
));

// ── Webhook endpoints (manageable by API as well as in the UI) ───────────────
const wh = requireScope("webhooks:manage");
router.get("/webhooks", wh, send(async () => ({ object: "list", data: await webhooks.listEndpoints() })));
router.post("/webhooks", wh, send((req) => webhooks.createEndpoint(req.apiToken.createdById, req.body), 201));
router.patch("/webhooks/:id", wh, send((req) => webhooks.updateEndpoint(req.params.id, req.body)));
router.delete("/webhooks/:id", wh, send((req) => webhooks.deleteEndpoint(req.params.id)));
router.get("/webhooks/:id/deliveries", wh, send(async (req) => ({
  object: "list",
  data: await webhooks.listDeliveries({ endpointId: req.params.id, limit: req.query.limit }),
})));

// ── Unmatched ────────────────────────────────────────────────────────────────
router.use((req, res) =>
  apiError(res, 404, "not_found", `No such endpoint: ${req.method} /api/v1${req.path}. See /api/v1/openapi.json.`),
);

export default router;
