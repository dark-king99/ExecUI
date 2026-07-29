import * as svc from "./sso.service.js";
import * as tokens from "../scim/scim.tokens.js";
import { log } from "../../lib/logger.js";

const tid = (req) => req.user.tenantId;

const handle = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (err) { res.status(err.status ?? 400).json({ message: err.message, code: err.code }); }
};

// The SPA route that finishes the browser-side handoff.
const spaCallback = (req, params) => `${svc.baseUrl(req)}/sso/callback?${new URLSearchParams(params)}`;

// ── Public ───────────────────────────────────────────────────────────────────
export const discover = handle((req) => svc.discoverForLogin({ email: req.body?.email, code: req.body?.code }));

export const start = async (req, res) => {
  try {
    const { url } = await svc.beginLogin({ tenantId: req.query.tenant, redirectTo: req.query.redirectTo, req });
    svc.pruneLoginRequests();
    res.redirect(url);
  } catch (err) {
    res.redirect(spaCallback(req, { error: err.message || "SSO failed" }));
  }
};

export const oidcCallback = async (req, res) => {
  // An IdP-side failure comes back as ?error=…; surface it instead of a blank page.
  if (req.query.error) {
    return res.redirect(spaCallback(req, { error: req.query.error_description || req.query.error }));
  }
  try {
    const { handoffCode, redirectTo } = await svc.completeOidc({ code: req.query.code, state: req.query.state, req });
    res.redirect(spaCallback(req, { code: handoffCode, next: redirectTo }));
  } catch (err) {
    log.warn?.("sso_oidc_callback_failed", { error: err.message });
    res.redirect(spaCallback(req, { error: err.message || "Single Sign-On failed" }));
  }
};

export const samlCallback = async (req, res) => {
  try {
    const { handoffCode, redirectTo } = await svc.completeSaml({
      tenantId: req.params.tenantId,
      samlResponse: req.body?.SAMLResponse,
      relayState: req.body?.RelayState,
      req,
    });
    res.redirect(spaCallback(req, { code: handoffCode, next: redirectTo }));
  } catch (err) {
    log.warn?.("sso_saml_callback_failed", { error: err.message });
    res.redirect(spaCallback(req, { error: err.message || "Single Sign-On failed" }));
  }
};

export const samlMetadata = async (req, res) => {
  try {
    const xml = await svc.samlMetadata(req.params.tenantId, req);
    res.type("application/xml").send(xml);
  } catch (err) {
    res.status(err.status ?? 400).json({ message: err.message });
  }
};

export const exchange = handle((req) => svc.exchangeHandoff({ code: req.body?.code, req }));

// ── Admin ────────────────────────────────────────────────────────────────────
export const getConfig    = handle((req) => svc.getConnection(tid(req), req));
export const putConfig    = handle((req) => svc.upsertConnection(tid(req), req.body, req));
export const deleteConfig = handle((req) => svc.deleteConnection(tid(req)));
export const testConfig   = handle((req) => svc.testConnection(tid(req), req));

// ── SCIM provisioning tokens (managed from the same admin console) ───────────
export const listScimTokens  = handle((req) => tokens.listTokens(tid(req)));
export const createScimToken = handle((req) => tokens.createToken(tid(req), req.body, req.user.userId));
export const revokeScimToken = handle((req) => tokens.revokeToken(tid(req), req.params.id));
