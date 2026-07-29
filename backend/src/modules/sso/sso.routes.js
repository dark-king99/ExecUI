/**
 * SSO routes.
 *
 *   PUBLIC (no session yet — this is how you get one):
 *     POST /auth/sso/discover              which IdP serves this email/company?
 *     GET  /auth/sso/start                 → 302 to the IdP
 *     GET  /auth/sso/oidc/callback         IdP redirect (OIDC)
 *     POST /auth/sso/saml/:tenantId/callback   IdP POST (SAML ACS)
 *     GET  /auth/sso/saml/:tenantId/metadata   SP metadata XML
 *     POST /auth/sso/exchange              one-time code → {token, user}
 *
 *   ADMIN (authenticated + enterprise_admin, plan-gated):
 *     GET/PUT/DELETE /auth/sso/config, POST /auth/sso/config/test
 */
import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import { rateLimit } from "../../middleware/ratelimit.middleware.js";
import * as c from "./sso.controller.js";

const router = express.Router();
const adminOnly = [authenticate, requireRole("enterprise_admin", "system_admin")];

// Unauthenticated endpoints get their own budget — they're reachable pre-login.
const ssoLimit = rateLimit({ windowMs: 60_000, max: 30 });

// ── Public ──
router.post("/discover", ssoLimit, c.discover);
router.get("/start", ssoLimit, c.start);
router.get("/oidc/callback", ssoLimit, c.oidcCallback);
// SAML posts a form-encoded body, so it needs its own parser (the global JSON
// parser doesn't cover it) — applied inline, before the handler.
router.post("/saml/:tenantId/callback", ssoLimit, express.urlencoded({ extended: false, limit: "1mb" }), c.samlCallback);
router.get("/saml/:tenantId/metadata", ssoLimit, c.samlMetadata);
router.post("/exchange", ssoLimit, c.exchange);

// ── Admin configuration ──
router.get("/config", ...adminOnly, c.getConfig);
router.put("/config", ...adminOnly, c.putConfig);
router.delete("/config", ...adminOnly, c.deleteConfig);
router.post("/config/test", ...adminOnly, c.testConfig);

// ── SCIM provisioning tokens ──
router.get("/scim/tokens", ...adminOnly, c.listScimTokens);
router.post("/scim/tokens", ...adminOnly, c.createScimToken);
router.delete("/scim/tokens/:id", ...adminOnly, c.revokeScimToken);

export default router;
