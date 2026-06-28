import { verifyKey } from "../modules/apikeys/apikeys.service.js";

/** Extract an API key from the request (X-API-Key header or Bearer token). */
function extractKey(req) {
  const header = req.headers["x-api-key"];
  if (header) return String(header).trim();
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    if (token.startsWith("exk_")) return token; // distinguish API keys from JWTs
  }
  return null;
}

/**
 * Authenticate an external/integration request with an API key. On success
 * attaches req.apiKey ({ tenantId, scopes, keyId, name }) and a service-style
 * req.user so downstream tenant-scoped controllers work unchanged.
 */
export async function apiKeyAuth(req, res, next) {
  try {
    const raw = extractKey(req);
    if (!raw) {
      return res.status(401).json({ message: "Missing API key. Send it as 'X-API-Key' or 'Authorization: Bearer <key>'.", code: "NO_API_KEY" });
    }
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip;
    const result = await verifyKey(raw, ip);
    if (!result) {
      return res.status(401).json({ message: "Invalid, revoked, or expired API key.", code: "INVALID_API_KEY" });
    }
    req.apiKey = result;
    req.user = { tenantId: result.tenantId, userId: result.keyId, role: "api_key", via: "api_key" };
    next();
  } catch (err) {
    next(err);
  }
}

/** Require a given scope on the authenticating API key (use after apiKeyAuth). */
export function requireScope(scope) {
  return (req, res, next) => {
    if (!req.apiKey?.scopes?.includes(scope)) {
      return res.status(403).json({ message: `API key is missing the '${scope}' scope.`, code: "INSUFFICIENT_SCOPE" });
    }
    next();
  };
}
