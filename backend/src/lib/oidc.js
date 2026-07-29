/**
 * OpenID Connect relying-party helpers (Authorization Code flow + PKCE).
 *
 * Implements the parts of OIDC an enterprise IdP (Okta, Microsoft Entra ID,
 * Google Workspace, Auth0, Keycloak, OneLogin, Ping…) actually needs:
 *   • .well-known discovery, cached
 *   • PKCE (S256) + state + nonce — CSRF and code-injection protection
 *   • code → token exchange (client_secret_post, with Basic fallback)
 *   • id_token signature verification against the IdP's JWKS, plus full claim
 *     validation (iss, aud, exp, iat, nonce)
 *   • optional userinfo fetch to fill gaps in the id_token claims
 *
 * Signature verification uses Node's built-in JWK → KeyObject support, so there
 * is no extra crypto dependency and no hand-rolled crypto.
 */
import crypto from "crypto";
import jwt from "jsonwebtoken";

const FETCH_TIMEOUT_MS = 10_000;
const DISCOVERY_TTL_MS = 60 * 60 * 1000; // 1h
const JWKS_TTL_MS = 60 * 60 * 1000;      // 1h

const discoveryCache = new Map(); // issuer -> { doc, expires }
const jwksCache = new Map();      // jwksUrl -> { keys, expires }

async function fetchJson(url, options = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
    if (!res.ok) {
      const detail = body?.error_description || body?.error || text?.slice(0, 200) || res.statusText;
      throw new Error(`${url} → ${res.status}: ${detail}`);
    }
    if (!body) throw new Error(`${url} returned a non-JSON response`);
    return body;
  } catch (err) {
    if (err.name === "AbortError") throw new Error(`${url} timed out after ${FETCH_TIMEOUT_MS}ms`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch (and cache) an issuer's OpenID configuration. */
export async function discover(issuer) {
  const base = String(issuer || "").replace(/\/$/, "");
  if (!base) throw new Error("Issuer URL is required");
  const hit = discoveryCache.get(base);
  if (hit && hit.expires > Date.now()) return hit.doc;

  const url = base.includes("/.well-known/") ? base : `${base}/.well-known/openid-configuration`;
  const doc = await fetchJson(url);
  discoveryCache.set(base, { doc, expires: Date.now() + DISCOVERY_TTL_MS });
  return doc;
}

/** Resolve the endpoints for a connection, using discovery when needed. */
export async function resolveEndpoints(conn) {
  const has = conn.authorizationUrl && conn.tokenUrl && conn.jwksUrl;
  if (has) {
    return {
      issuer: conn.issuer,
      authorization_endpoint: conn.authorizationUrl,
      token_endpoint: conn.tokenUrl,
      jwks_uri: conn.jwksUrl,
      userinfo_endpoint: conn.userinfoUrl || null,
      end_session_endpoint: conn.endSessionUrl || null,
    };
  }
  const doc = await discover(conn.issuer);
  return {
    issuer: doc.issuer || conn.issuer,
    authorization_endpoint: conn.authorizationUrl || doc.authorization_endpoint,
    token_endpoint: conn.tokenUrl || doc.token_endpoint,
    jwks_uri: conn.jwksUrl || doc.jwks_uri,
    userinfo_endpoint: conn.userinfoUrl || doc.userinfo_endpoint || null,
    end_session_endpoint: conn.endSessionUrl || doc.end_session_endpoint || null,
  };
}

const b64url = (buf) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** Fresh PKCE verifier/challenge pair (S256) plus a nonce. */
export function createPkce() {
  const codeVerifier = b64url(crypto.randomBytes(32));
  const codeChallenge = b64url(crypto.createHash("sha256").update(codeVerifier).digest());
  return { codeVerifier, codeChallenge, nonce: b64url(crypto.randomBytes(16)) };
}

/** Build the IdP authorization URL to redirect the browser to. */
export function buildAuthorizationUrl({ endpoints, clientId, redirectUri, scopes, state, nonce, codeChallenge, loginHint }) {
  const url = new URL(endpoints.authorization_endpoint);
  const params = {
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes || "openid email profile",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  };
  if (loginHint) params.login_hint = loginHint;
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, v);
  return url.toString();
}

/** Exchange an authorization code for tokens (PKCE, confidential or public client). */
export async function exchangeCode({ endpoints, clientId, clientSecret, redirectUri, code, codeVerifier }) {
  const form = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  });
  const headers = { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" };
  if (clientSecret) form.set("client_secret", clientSecret);

  try {
    return await fetchJson(endpoints.token_endpoint, { method: "POST", headers, body: form.toString() });
  } catch (err) {
    // Some IdPs only accept HTTP Basic client authentication — retry that way.
    if (!clientSecret) throw err;
    const basic = Buffer.from(`${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`).toString("base64");
    const retry = new URLSearchParams(form);
    retry.delete("client_secret");
    retry.delete("client_id");
    return fetchJson(endpoints.token_endpoint, {
      method: "POST",
      headers: { ...headers, Authorization: `Basic ${basic}` },
      body: retry.toString(),
    });
  }
}

async function getJwks(jwksUrl, { force = false } = {}) {
  const hit = jwksCache.get(jwksUrl);
  if (!force && hit && hit.expires > Date.now()) return hit.keys;
  const doc = await fetchJson(jwksUrl);
  const keys = Array.isArray(doc.keys) ? doc.keys : [];
  jwksCache.set(jwksUrl, { keys, expires: Date.now() + JWKS_TTL_MS });
  return keys;
}

/** Find the signing key for a token header, refreshing the JWKS on a miss (key rotation). */
async function signingKeyFor(jwksUrl, header) {
  const pick = (keys) =>
    keys.find((k) => (header.kid ? k.kid === header.kid : true) && (!k.use || k.use === "sig") && (!k.alg || k.alg === header.alg));
  let key = pick(await getJwks(jwksUrl));
  if (!key) key = pick(await getJwks(jwksUrl, { force: true })); // rotated keys
  if (!key) throw new Error("No matching signing key in the IdP's JWKS");
  return crypto.createPublicKey({ key, format: "jwk" });
}

const ALLOWED_ALGS = ["RS256", "RS384", "RS512", "PS256", "PS384", "PS512", "ES256", "ES384", "ES512"];

/**
 * Verify an id_token: signature against the JWKS, then issuer, audience,
 * expiry and the nonce we generated for this exact login.
 */
export async function verifyIdToken({ idToken, endpoints, clientId, nonce }) {
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded?.header) throw new Error("Malformed id_token");
  if (!ALLOWED_ALGS.includes(decoded.header.alg)) {
    // Explicitly reject "none" and HMAC algs — an id_token must be asymmetrically signed.
    throw new Error(`Unsupported id_token algorithm: ${decoded.header.alg}`);
  }

  const key = await signingKeyFor(endpoints.jwks_uri, decoded.header);
  const claims = jwt.verify(idToken, key, {
    algorithms: [decoded.header.alg],
    audience: clientId,
    issuer: endpoints.issuer,
    clockTolerance: 60,
  });

  if (nonce && claims.nonce !== nonce) throw new Error("id_token nonce mismatch — possible replay");
  if (!claims.sub) throw new Error("id_token is missing the subject (sub) claim");
  return claims;
}

/** Fetch the userinfo endpoint to fill in claims the id_token omitted. */
export async function fetchUserInfo(endpoints, accessToken) {
  if (!endpoints.userinfo_endpoint || !accessToken) return {};
  try {
    return await fetchJson(endpoints.userinfo_endpoint, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } });
  } catch {
    return {}; // userinfo is best-effort; the id_token is authoritative
  }
}

/** Clear cached discovery/JWKS documents (used after an admin edits the config). */
export function clearOidcCaches() {
  discoveryCache.clear();
  jwksCache.clear();
}
