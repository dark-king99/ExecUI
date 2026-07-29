/**
 * Public API authentication.
 *
 * Callers present an API token as `Authorization: Bearer execui_live_…`. The
 * token establishes the tenant, so the whole downstream chain runs inside that
 * tenant's context and the Prisma guard scopes every query automatically — an
 * external integration can only ever touch its own organization's data.
 *
 * Scope enforcement is separate (requireScope) so each route declares exactly
 * what it needs, and a read-only token can never be used to write.
 */
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { runUnscoped, runWithTenant } from "../lib/tenantContext.js";
import { verifyToken, touchToken, isApiToken } from "../modules/api/tokens.service.js";

/** Consistent, machine-readable error envelope for the public API. */
export function apiError(res, status, code, message, extra = {}) {
  return res.status(status).json({ error: { code, message, ...extra } });
}

export async function authenticateApiToken(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return apiError(res, 401, "unauthorized", "Provide an API token as: Authorization: Bearer execui_live_…");
  }
  const presented = header.slice(7).trim();
  if (!isApiToken(presented)) {
    return apiError(res, 401, "unauthorized", "Malformed API token. Tokens start with execui_live_.");
  }

  let token;
  try {
    // No tenant context yet — the token is what establishes it.
    token = await runUnscoped(() => verifyToken(presented));
  } catch {
    return apiError(res, 500, "internal_error", "Could not verify the API token.");
  }
  if (!token) {
    return apiError(res, 401, "invalid_token", "This API token is invalid, revoked or expired.");
  }

  req.apiToken = token;
  req.tenantId = token.tenantId;
  runUnscoped(() => touchToken(token.id, req.ip));

  return runWithTenant({ tenantId: token.tenantId, apiTokenId: token.id }, () => next());
}

/** Require one of the given scopes on the presenting token. */
export function requireScope(...needed) {
  return (req, res, next) => {
    const held = req.apiToken?.scopes || [];
    if (needed.some((s) => held.includes(s))) return next();
    return apiError(
      res, 403, "insufficient_scope",
      `This token is missing the required scope. Needs one of: ${needed.join(", ")}.`,
      { required: needed, granted: held },
    );
  };
}

/**
 * Per-token rate limit. Keyed on the token id (not IP) so one customer's
 * integration can't exhaust another's budget from a shared egress address.
 */
export const apiRateLimit = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.API_RATE_LIMIT_PER_MIN) || 120,
  standardHeaders: true,
  legacyHeaders: false,
  // Authenticated calls key on the token. The unauthenticated fallback must go
  // through ipKeyGenerator so an IPv6 client can't sidestep the limit by
  // varying the low bits of its address.
  keyGenerator: (req) => req.apiToken?.id || ipKeyGenerator(req.ip),
  handler: (req, res) =>
    apiError(res, 429, "rate_limited", "Too many API requests — slow down and retry shortly."),
});
