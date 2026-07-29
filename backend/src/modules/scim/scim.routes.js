/**
 * SCIM 2.0 transport layer — mounted at /scim/v2 (the base URL you paste into
 * Okta / Entra ID / OneLogin).
 *
 * Handled here rather than in the service:
 *   • Bearer-token authentication → resolves the tenant and enters its context,
 *     so every query underneath is automatically tenant-scoped.
 *   • application/scim+json bodies (the app's global JSON guard only accepts
 *     application/json, so this router parses its own body).
 *   • RFC 7644 error envelopes — IdPs surface `detail` directly to admins.
 */
import express from "express";
import rateLimit from "express-rate-limit";
import { runWithTenant } from "../../lib/tenantContext.js";
import { entitlementsFor, DEFAULT_PLAN } from "../billing/plans.config.js";
import prisma from "../../config/database.js";
import { runUnscoped } from "../../lib/tenantContext.js";
import { resolveToken } from "./scim.tokens.js";
import * as svc from "./scim.service.js";

const router = express.Router();

// SCIM clients send application/scim+json; accept both that and plain JSON.
router.use(express.json({ type: ["application/scim+json", "application/json", "text/*"], limit: "1mb" }));

// A full directory sync bursts well above human rates, so SCIM gets its own
// generous budget (the bearer token is the real access control).
router.use(rateLimit({
  windowMs: 60_000,
  max: Number(process.env.SCIM_RATE_LIMIT_PER_MIN) || 1200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], status: "429", detail: "Too many SCIM requests — slow down." },
}));

const sendError = (res, status, detail, scimType) =>
  res.status(status).type("application/scim+json").json({
    schemas: [svc.ERROR_SCHEMA],
    status: String(status),
    ...(scimType ? { scimType } : {}),
    detail,
  });

const baseUrlOf = (req) => {
  const proto = req.headers["x-forwarded-proto"]?.split(",")[0] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return process.env.APP_URL ? `${process.env.APP_URL.replace(/\/$/, "")}/scim/v2` : `${proto}://${host}/scim/v2`;
};

// ── Authentication ───────────────────────────────────────────────────────────
async function scimAuth(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    res.set("WWW-Authenticate", 'Bearer realm="ExecUI SCIM"');
    return sendError(res, 401, "A SCIM bearer token is required.");
  }
  const resolved = await resolveToken(header.slice(7).trim());
  if (!resolved) {
    res.set("WWW-Authenticate", 'Bearer realm="ExecUI SCIM"');
    return sendError(res, 401, "Invalid or revoked SCIM token.");
  }

  // SCIM provisioning is part of the enterprise SSO capability.
  const tenant = await runUnscoped(() =>
    prisma.tenant.findUnique({ where: { id: resolved.tenantId }, select: { plan: true, planSolutions: true } })
  );
  const ent = entitlementsFor(tenant?.plan || DEFAULT_PLAN, tenant?.planSolutions || []);
  if (!ent.sso) return sendError(res, 403, "SCIM provisioning requires the Enterprise or Executive plan.");

  req.scim = resolved;
  // Everything downstream runs inside the token's tenant context.
  runWithTenant({ tenantId: resolved.tenantId, userId: null }, () => next());
}

// Wrap a handler with SCIM error translation + the scim+json content type.
const handle = (fn) => async (req, res) => {
  try {
    const result = await fn(req, req.scim.tenantId, baseUrlOf(req));
    if (result === undefined) return res.status(204).end();
    res.type("application/scim+json").json(result);
  } catch (err) {
    if (err instanceof svc.ScimError) return sendError(res, err.status, err.message, err.scimType);
    if (err?.code === "P2002") return sendError(res, 409, "A resource with that unique value already exists.", "uniqueness");
    return sendError(res, 500, err.message || "Internal error");
  }
};

router.use(scimAuth);

// ── Discovery (IdPs probe these before provisioning) ─────────────────────────
router.get("/ServiceProviderConfig", handle((req, _t, base) => svc.serviceProviderConfig(base)));
router.get("/ResourceTypes", handle((req, _t, base) => svc.resourceTypes(base)));
router.get("/Schemas", handle((req, _t, base) => svc.schemas(base)));

// ── Users ────────────────────────────────────────────────────────────────────
router.get("/Users", handle((req, t, base) => svc.listUsers(t, req.query, base)));
router.get("/Users/:id", handle((req, t, base) => svc.getUser(t, req.params.id, base)));
router.post("/Users", async (req, res) => {
  try {
    const base = baseUrlOf(req);
    const created = await svc.createUser(req.scim.tenantId, req.body, base);
    res.status(201).type("application/scim+json").set("Location", created.meta.location).json(created);
  } catch (err) {
    if (err instanceof svc.ScimError) return sendError(res, err.status, err.message, err.scimType);
    return sendError(res, 500, err.message || "Internal error");
  }
});
router.put("/Users/:id", handle((req, t, base) => svc.replaceUser(t, req.params.id, req.body, base)));
router.patch("/Users/:id", handle((req, t, base) => svc.patchUser(t, req.params.id, req.body, base)));
router.delete("/Users/:id", handle(async (req, t) => { await svc.deleteUser(t, req.params.id); }));

// ── Groups (ExecUI roles) ────────────────────────────────────────────────────
router.get("/Groups", handle((req, t, base) => svc.listGroups(t, req.query, base)));
router.get("/Groups/:id", handle((req, t, base) => svc.getGroup(t, req.params.id, base)));
router.patch("/Groups/:id", handle((req, t, base) => svc.patchGroup(t, req.params.id, req.body, base)));

// Anything else under /scim/v2 gets a SCIM-shaped 404, never HTML.
router.use((req, res) => sendError(res, 404, `SCIM endpoint ${req.method} ${req.path} is not supported.`));

export default router;
