/**
 * Enterprise Single Sign-On — OIDC + SAML 2.0.
 *
 * Flow (identical for both protocols, so the SPA only implements one path):
 *   1. /auth/sso/start        → create a single-use SsoLoginRequest, redirect to the IdP
 *   2. IdP callback           → validate the assertion, resolve/provision the user
 *   3. redirect to the SPA with a one-time HANDOFF CODE (never the JWT — a token
 *      in a URL leaks into history, referrers and access logs)
 *   4. /auth/sso/exchange     → SPA swaps the code for the same {token,user} that
 *                               password login returns
 *
 * Security properties:
 *   • OIDC: PKCE S256, state bound to a server-side record, nonce replay check,
 *     JWKS signature verification, strict iss/aud/exp validation (lib/oidc).
 *   • SAML: signature + digest verification, audience/InResponseTo/timestamp
 *     checks via @node-saml/node-saml (never hand-rolled XML-DSig).
 *   • Login requests and handoff codes are single-use and short-lived.
 *   • Client secrets and SP private keys are AES-GCM encrypted at rest.
 */
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { SAML } from "@node-saml/node-saml";
import prisma from "../../config/database.js";
import { runUnscoped } from "../../lib/tenantContext.js";
import { encryptSecret, decryptSecret, last4 } from "../../lib/secrets.js";
import { entitlementsFor, DEFAULT_PLAN } from "../billing/plans.config.js";
import {
  resolveEndpoints, createPkce, buildAuthorizationUrl, exchangeCode,
  verifyIdToken, fetchUserInfo, clearOidcCaches,
} from "../../lib/oidc.js";
import { ValidationError } from "../../lib/errors.js";

const LOGIN_REQUEST_TTL_MS = 10 * 60 * 1000; // 10 min to complete the IdP round-trip
const HANDOFF_TTL_MS = 2 * 60 * 1000;        // 2 min for the SPA to exchange the code
const EMP_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

const err = (status, message, code) => {
  const e = new Error(message);
  e.status = status;
  if (code) e.code = code;
  return e;
};

/** Public base URL of this deployment (used to build callback/ACS URLs). */
export function baseUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const proto = req?.headers?.["x-forwarded-proto"]?.split(",")[0] || req?.protocol || "http";
  const host = req?.headers?.["x-forwarded-host"] || req?.headers?.host || "localhost:5555";
  return `${proto}://${host}`;
}

export const oidcCallbackUrl = (req) => `${baseUrl(req)}/api/auth/sso/oidc/callback`;
export const samlCallbackUrl = (req, tenantId) => `${baseUrl(req)}/api/auth/sso/saml/${tenantId}/callback`;
export const samlEntityId = (req, tenantId) => `${baseUrl(req)}/api/auth/sso/saml/${tenantId}/metadata`;

// ── Plan gating ──────────────────────────────────────────────────────────────
async function assertSsoEntitled(tenantId) {
  const tenant = await runUnscoped(() =>
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true, planSolutions: true } })
  );
  const ent = entitlementsFor(tenant?.plan || DEFAULT_PLAN, tenant?.planSolutions || []);
  if (!ent.sso) {
    throw err(403, "Single Sign-On is available on the Enterprise and Executive plans. Upgrade your subscription to enable it.", "PLAN_UPGRADE_REQUIRED");
  }
  return tenant;
}

// ── Admin configuration ──────────────────────────────────────────────────────
/** Masked view — secrets are never returned to the client. */
function shape(c, req) {
  if (!c) return null;
  return {
    id: c.id,
    protocol: c.protocol,
    enabled: c.enabled,
    enforced: c.enforced,
    displayName: c.displayName,
    domains: c.domains,
    jitProvisioning: c.jitProvisioning,
    defaultRoleId: c.defaultRoleId,
    defaultDepartment: c.defaultDepartment,
    // OIDC (secret masked)
    issuer: c.issuer,
    clientId: c.clientId,
    hasClientSecret: !!c.clientSecretCipher,
    authorizationUrl: c.authorizationUrl,
    tokenUrl: c.tokenUrl,
    jwksUrl: c.jwksUrl,
    userinfoUrl: c.userinfoUrl,
    endSessionUrl: c.endSessionUrl,
    scopes: c.scopes,
    // SAML
    entryPoint: c.entryPoint,
    idpIssuer: c.idpIssuer,
    idpCert: c.idpCert ? `${String(c.idpCert).slice(0, 40)}… (${String(c.idpCert).length} chars)` : null,
    hasIdpCert: !!c.idpCert,
    logoutUrl: c.logoutUrl,
    signRequests: c.signRequests,
    hasSpKey: !!c.spKeyCipher,
    spCertificate: c.spCertificate,
    signatureAlgorithm: c.signatureAlgorithm,
    // Mapping
    attrEmail: c.attrEmail,
    attrFirstName: c.attrFirstName,
    attrLastName: c.attrLastName,
    attrExternalId: c.attrExternalId,
    attrGroups: c.attrGroups,
    groupRoleMap: c.groupRoleMap || {},
    lastLoginAt: c.lastLoginAt,
    lastError: c.lastError,
    // Everything the admin must paste into the IdP.
    serviceProvider: {
      oidcRedirectUri: oidcCallbackUrl(req),
      samlAcsUrl: samlCallbackUrl(req, c.tenantId),
      samlEntityId: samlEntityId(req, c.tenantId),
      samlMetadataUrl: `${baseUrl(req)}/api/auth/sso/saml/${c.tenantId}/metadata`,
      scimBaseUrl: `${baseUrl(req)}/scim/v2`,
    },
  };
}

export async function getConnection(tenantId, req) {
  const c = await prisma.ssoConnection.findFirst({ where: { tenantId } });
  if (!c) {
    // Nothing configured yet — still tell the admin where the endpoints will be.
    return {
      configured: false,
      serviceProvider: {
        oidcRedirectUri: oidcCallbackUrl(req),
        samlAcsUrl: samlCallbackUrl(req, tenantId),
        samlEntityId: samlEntityId(req, tenantId),
        samlMetadataUrl: `${baseUrl(req)}/api/auth/sso/saml/${tenantId}/metadata`,
        scimBaseUrl: `${baseUrl(req)}/scim/v2`,
      },
    };
  }
  return { configured: true, ...shape(c, req) };
}

const STRING_FIELDS = [
  "displayName", "issuer", "clientId", "authorizationUrl", "tokenUrl", "jwksUrl", "userinfoUrl",
  "endSessionUrl", "scopes", "entryPoint", "idpIssuer", "idpCert", "logoutUrl", "spCertificate",
  "signatureAlgorithm", "attrEmail", "attrFirstName", "attrLastName", "attrExternalId", "attrGroups",
  "defaultRoleId", "defaultDepartment",
];
const BOOL_FIELDS = ["enabled", "enforced", "jitProvisioning", "signRequests"];

/** Create or update the org's IdP connection (admin-only, plan-gated). */
export async function upsertConnection(tenantId, body = {}, req) {
  await assertSsoEntitled(tenantId);

  const protocol = String(body.protocol || "").toLowerCase();
  if (!["oidc", "saml"].includes(protocol)) throw new ValidationError("Protocol must be 'oidc' or 'saml'");

  const data = { protocol };
  for (const f of STRING_FIELDS) {
    if (body[f] !== undefined) data[f] = body[f] === "" ? null : String(body[f]).trim();
  }
  for (const f of BOOL_FIELDS) {
    if (body[f] !== undefined) data[f] = !!body[f];
  }
  if (body.domains !== undefined) {
    const list = Array.isArray(body.domains)
      ? body.domains
      : String(body.domains).split(/[,\s]+/);
    data.domains = list.map((d) => String(d).trim().toLowerCase().replace(/^@/, "")).filter(Boolean);
  }
  if (body.groupRoleMap !== undefined && typeof body.groupRoleMap === "object" && body.groupRoleMap !== null) {
    data.groupRoleMap = body.groupRoleMap;
  }
  // Secrets: only overwrite when a new value is actually supplied.
  if (body.clientSecret) {
    const enc = encryptSecret(body.clientSecret);
    data.clientSecretCipher = enc.ciphertext; data.clientSecretIv = enc.iv; data.clientSecretTag = enc.tag;
  }
  if (body.spPrivateKey) {
    const enc = encryptSecret(body.spPrivateKey);
    data.spKeyCipher = enc.ciphertext; data.spKeyIv = enc.iv; data.spKeyTag = enc.tag;
  }

  // Validate the minimum viable config before letting it be enabled.
  const merged = { ...(await prisma.ssoConnection.findFirst({ where: { tenantId } })), ...data };
  if (merged.enabled) {
    if (protocol === "oidc") {
      if (!merged.issuer && !(merged.authorizationUrl && merged.tokenUrl && merged.jwksUrl)) {
        throw new ValidationError("OIDC needs either an issuer URL (for discovery) or explicit authorization/token/JWKS URLs.");
      }
      if (!merged.clientId) throw new ValidationError("OIDC needs a client ID.");
    } else {
      if (!merged.entryPoint) throw new ValidationError("SAML needs the IdP sign-on URL (entry point).");
      if (!merged.idpCert) throw new ValidationError("SAML needs the IdP signing certificate.");
    }
  }

  const existing = await prisma.ssoConnection.findFirst({ where: { tenantId } });
  const saved = existing
    ? await prisma.ssoConnection.update({ where: { id: existing.id }, data })
    : await prisma.ssoConnection.create({ data: { ...data, tenantId } });

  clearOidcCaches(); // config changed — don't serve stale discovery/JWKS
  return { configured: true, ...shape(saved, req) };
}

export async function deleteConnection(tenantId) {
  const existing = await prisma.ssoConnection.findFirst({ where: { tenantId } });
  if (existing) await prisma.ssoConnection.delete({ where: { id: existing.id } });
  clearOidcCaches();
  return { deleted: true };
}

/** Dry-run the IdP configuration so admins get a clear error before going live. */
export async function testConnection(tenantId, req) {
  const conn = await prisma.ssoConnection.findFirst({ where: { tenantId } });
  if (!conn) throw err(404, "No SSO connection configured");
  try {
    if (conn.protocol === "oidc") {
      const endpoints = await resolveEndpoints(conn);
      if (!endpoints.authorization_endpoint || !endpoints.token_endpoint || !endpoints.jwks_uri) {
        throw new Error("Discovery did not return the required endpoints");
      }
      const jwks = await fetch(endpoints.jwks_uri).then((r) => r.json());
      const keyCount = Array.isArray(jwks.keys) ? jwks.keys.length : 0;
      if (!keyCount) throw new Error("The IdP's JWKS contains no signing keys");
      return { ok: true, protocol: "oidc", issuer: endpoints.issuer, endpoints, signingKeys: keyCount, redirectUri: oidcCallbackUrl(req) };
    }
    buildSaml(conn, req, tenantId); // throws if the cert/entry point are unusable
    return { ok: true, protocol: "saml", entryPoint: conn.entryPoint, acsUrl: samlCallbackUrl(req, tenantId), entityId: samlEntityId(req, tenantId) };
  } catch (e) {
    await prisma.ssoConnection.update({ where: { id: conn.id }, data: { lastError: String(e.message).slice(0, 500) } });
    return { ok: false, protocol: conn.protocol, error: e.message };
  }
}

// ── Public discovery (login page) ────────────────────────────────────────────
/**
 * Which IdP should this login use? Resolved by email domain or enterprise code.
 * Deliberately minimal output — it must not leak whether an account exists.
 */
export async function discoverForLogin({ email, code }) {
  return runUnscoped(async () => {
    let conn = null;
    const domain = String(email || "").split("@")[1]?.toLowerCase().trim();
    if (domain) {
      conn = await prisma.ssoConnection.findFirst({ where: { enabled: true, domains: { has: domain } } });
    }
    if (!conn && code) {
      const tenant = await prisma.tenant.findFirst({
        where: { OR: [{ code: String(code).trim() }, { slug: String(code).trim().toLowerCase() }] },
        select: { id: true },
      });
      if (tenant) conn = await prisma.ssoConnection.findFirst({ where: { tenantId: tenant.id, enabled: true } });
    }
    if (!conn) return { sso: false };
    return {
      sso: true,
      tenantId: conn.tenantId,
      protocol: conn.protocol,
      displayName: conn.displayName || "Single Sign-On",
      enforced: conn.enforced,
      startUrl: `/api/auth/sso/start?tenant=${encodeURIComponent(conn.tenantId)}`,
    };
  });
}

/** True when this tenant requires SSO (password login must be refused). */
export async function isSsoEnforced(tenantId) {
  const conn = await runUnscoped(() =>
    prisma.ssoConnection.findFirst({ where: { tenantId, enabled: true, enforced: true }, select: { id: true } })
  );
  return !!conn;
}

// ── SAML helper ──────────────────────────────────────────────────────────────
function buildSaml(conn, req, tenantId) {
  if (!conn.entryPoint) throw new Error("SAML entry point is not configured");
  if (!conn.idpCert) throw new Error("SAML IdP certificate is not configured");
  const privateKey = conn.spKeyCipher
    ? decryptSecret({ ciphertext: conn.spKeyCipher, iv: conn.spKeyIv, tag: conn.spKeyTag })
    : undefined;

  return new SAML({
    entryPoint: conn.entryPoint,
    issuer: samlEntityId(req, tenantId),
    callbackUrl: samlCallbackUrl(req, tenantId),
    idpCert: conn.idpCert,
    audience: samlEntityId(req, tenantId),
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: false, // response OR assertion signature is accepted
    signatureAlgorithm: conn.signatureAlgorithm || "sha256",
    digestAlgorithm: conn.signatureAlgorithm || "sha256",
    identifierFormat: null,
    disableRequestedAuthnContext: true,
    acceptedClockSkewMs: 60_000,
    ...(conn.signRequests && privateKey ? { privateKey, authnRequestBinding: "HTTP-Redirect" } : {}),
    ...(conn.logoutUrl ? { logoutUrl: conn.logoutUrl } : {}),
    validateInResponseTo: "never", // we bind the response via our own request record
  });
}

/** SAML SP metadata XML — hand this URL/file to the IdP admin. */
export async function samlMetadata(tenantId, req) {
  const conn = await runUnscoped(() => prisma.ssoConnection.findFirst({ where: { tenantId } }));
  if (!conn || conn.protocol !== "saml") throw err(404, "No SAML connection configured for this organization");
  const saml = buildSaml(conn, req, tenantId);
  return saml.generateServiceProviderMetadata(null, conn.spCertificate || null);
}

// ── Login: step 1 (redirect to the IdP) ──────────────────────────────────────
export async function beginLogin({ tenantId, redirectTo, req }) {
  const conn = await runUnscoped(() => prisma.ssoConnection.findFirst({ where: { tenantId, enabled: true } }));
  if (!conn) throw err(404, "Single Sign-On is not enabled for this organization");
  await assertSsoEntitled(tenantId);

  const safeRedirect = redirectTo && String(redirectTo).startsWith("/") && !String(redirectTo).startsWith("//")
    ? String(redirectTo) : "/overview";

  if (conn.protocol === "oidc") {
    const endpoints = await resolveEndpoints(conn);
    const { codeVerifier, codeChallenge, nonce } = createPkce();
    const request = await runUnscoped(() => prisma.ssoLoginRequest.create({
      data: {
        tenantId, protocol: "oidc", nonce, codeVerifier, redirectTo: safeRedirect,
        ipAddress: req?.ip ?? null, expiresAt: new Date(Date.now() + LOGIN_REQUEST_TTL_MS),
      },
    }));
    return {
      url: buildAuthorizationUrl({
        endpoints, clientId: conn.clientId, redirectUri: oidcCallbackUrl(req),
        scopes: conn.scopes, state: request.id, nonce, codeChallenge,
      }),
    };
  }

  // SAML: node-saml generates the AuthnRequest; RelayState carries our record id.
  const saml = buildSaml(conn, req, tenantId);
  const request = await runUnscoped(() => prisma.ssoLoginRequest.create({
    data: {
      tenantId, protocol: "saml", redirectTo: safeRedirect,
      ipAddress: req?.ip ?? null, expiresAt: new Date(Date.now() + LOGIN_REQUEST_TTL_MS),
    },
  }));
  const url = await saml.getAuthorizeUrlAsync(request.id, undefined, {});
  return { url };
}

/** Load a pending login request and immediately mark it used (single-use). */
async function consumeLoginRequest(id, protocol) {
  if (!id) throw err(400, "Missing SSO state");
  return runUnscoped(async () => {
    const rec = await prisma.ssoLoginRequest.findUnique({ where: { id } });
    if (!rec || rec.protocol !== protocol) throw err(400, "Unknown or mismatched SSO login request");
    if (rec.consumedAt) throw err(400, "This SSO login has already been used");
    if (rec.expiresAt < new Date()) throw err(400, "This SSO login expired — please try again");
    await prisma.ssoLoginRequest.update({ where: { id }, data: { consumedAt: new Date() } });
    return rec;
  });
}

// ── Attribute mapping + JIT provisioning ─────────────────────────────────────
const pick = (claims, key) => (key ? claims?.[key] ?? null : null);

function mapProfile(conn, claims) {
  const email = String(
    pick(claims, conn.attrEmail) || claims.email || claims.mail ||
    claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ||
    claims.preferred_username || claims.nameID || ""
  ).toLowerCase().trim();

  const first = pick(claims, conn.attrFirstName) || claims.given_name || claims.firstName ||
    claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"] || null;
  const last = pick(claims, conn.attrLastName) || claims.family_name || claims.lastName ||
    claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"] || null;

  const nameFallback = String(claims.name || "").trim().split(/\s+/);
  let groups = conn.attrGroups ? claims[conn.attrGroups] ?? claims.groups ?? null : claims.groups ?? null;
  if (typeof groups === "string") groups = groups.split(/[,;]/).map((g) => g.trim()).filter(Boolean);

  return {
    email,
    firstName: first || nameFallback[0] || (email ? email.split("@")[0] : "User"),
    lastName: last || (nameFallback.length > 1 ? nameFallback.slice(1).join(" ") : ""),
    externalId: pick(claims, conn.attrExternalId) || claims.oid || claims.sub || null,
    subject: claims.sub || claims.nameID || null,
    groups: Array.isArray(groups) ? groups : [],
  };
}

async function randomEmployeeId(tenantId) {
  for (let i = 0; i < 25; i++) {
    let id = "";
    for (let j = 0; j < 7; j++) id += EMP_ALPHABET[crypto.randomInt(EMP_ALPHABET.length)];
    const taken = await prisma.user.findFirst({ where: { tenantId, employeeId: id }, select: { id: true } });
    if (!taken) return id;
  }
  return null;
}

/** Resolve the IdP-asserted identity to a local user, provisioning if allowed. */
async function resolveUser(conn, profile, tenantId) {
  if (!profile.email) throw err(400, "The identity provider did not return an email address for this user.");

  let user = await prisma.user.findFirst({
    where: { tenantId, OR: [{ email: profile.email }, ...(profile.externalId ? [{ externalId: profile.externalId }] : [])] },
    include: { role: true },
  });

  // Role from IdP groups, when a mapping is configured.
  let mappedRoleId = null;
  const map = conn.groupRoleMap && typeof conn.groupRoleMap === "object" ? conn.groupRoleMap : {};
  const matchedRoleName = profile.groups.map((g) => map[g]).find(Boolean);
  if (matchedRoleName) {
    const role = await prisma.role.findFirst({ where: { tenantId, name: String(matchedRoleName) } });
    mappedRoleId = role?.id ?? null;
  }

  if (!user) {
    if (!conn.jitProvisioning) {
      throw err(403, "Your account hasn't been set up in ExecUI yet. Ask an administrator to invite you.");
    }
    let roleId = mappedRoleId || conn.defaultRoleId;
    if (!roleId) {
      const fallback = await prisma.role.findFirst({
        where: { tenantId, NOT: { name: "enterprise_admin" } }, orderBy: { name: "asc" },
      });
      roleId = fallback?.id ?? (await prisma.role.findFirst({ where: { tenantId } }))?.id;
    }
    if (!roleId) throw err(500, "This organization has no roles configured — an administrator must set one up first.");

    user = await prisma.user.create({
      data: {
        email: profile.email,
        firstName: profile.firstName || "New",
        lastName: profile.lastName || "User",
        tenantId, roleId,
        employeeId: await randomEmployeeId(tenantId),
        department: conn.defaultDepartment || null,
        status: "active",
        isActive: true,
        externalId: profile.externalId || null,
        ssoSubject: profile.subject || null,
        provisionedVia: "sso",
      },
      include: { role: true },
    });
  } else {
    if (!user.isActive) throw err(403, "Account is suspended. Contact your administrator.");
    const patch = {};
    if (!user.externalId && profile.externalId) patch.externalId = profile.externalId;
    if (user.ssoSubject !== profile.subject) patch.ssoSubject = profile.subject;
    // An invited account that signs in via SSO becomes active without a password.
    if (user.status === "invited") patch.status = "active";
    if (mappedRoleId && mappedRoleId !== user.roleId) patch.roleId = mappedRoleId;
    if (Object.keys(patch).length) {
      user = await prisma.user.update({ where: { id: user.id }, data: patch, include: { role: true } });
    }
  }
  return user;
}

/** Mint the one-time handoff code the browser carries back to the SPA. */
async function createHandoff(loginRequestId, userId) {
  const handoffCode = crypto.randomBytes(32).toString("base64url");
  await runUnscoped(() => prisma.ssoLoginRequest.update({
    where: { id: loginRequestId },
    data: { userId, handoffCode, expiresAt: new Date(Date.now() + HANDOFF_TTL_MS) },
  }));
  return handoffCode;
}

// ── Login: step 2 (IdP callback) ─────────────────────────────────────────────
export async function completeOidc({ code, state, req }) {
  const rec = await consumeLoginRequest(state, "oidc");
  const conn = await runUnscoped(() => prisma.ssoConnection.findFirst({ where: { tenantId: rec.tenantId, enabled: true } }));
  if (!conn) throw err(400, "SSO is no longer enabled for this organization");

  const endpoints = await resolveEndpoints(conn);
  const clientSecret = conn.clientSecretCipher
    ? decryptSecret({ ciphertext: conn.clientSecretCipher, iv: conn.clientSecretIv, tag: conn.clientSecretTag })
    : null;

  const tokens = await exchangeCode({
    endpoints, clientId: conn.clientId, clientSecret,
    redirectUri: oidcCallbackUrl(req), code, codeVerifier: rec.codeVerifier,
  });
  if (!tokens.id_token) throw err(400, "The identity provider did not return an id_token");

  const claims = await verifyIdToken({ idToken: tokens.id_token, endpoints, clientId: conn.clientId, nonce: rec.nonce });
  const info = await fetchUserInfo(endpoints, tokens.access_token);
  const profile = mapProfile(conn, { ...info, ...claims });

  const user = await runUnscoped(() => resolveUser(conn, profile, rec.tenantId));
  const handoffCode = await createHandoff(rec.id, user.id);
  await runUnscoped(() => prisma.ssoConnection.update({ where: { id: conn.id }, data: { lastLoginAt: new Date(), lastError: null } }));
  return { handoffCode, redirectTo: rec.redirectTo || "/overview" };
}

export async function completeSaml({ tenantId, samlResponse, relayState, req }) {
  const rec = await consumeLoginRequest(relayState, "saml");
  if (rec.tenantId !== tenantId) throw err(400, "SSO login request does not belong to this organization");

  const conn = await runUnscoped(() => prisma.ssoConnection.findFirst({ where: { tenantId, enabled: true } }));
  if (!conn) throw err(400, "SSO is no longer enabled for this organization");

  const saml = buildSaml(conn, req, tenantId);
  const { profile: assertion } = await saml.validatePostResponseAsync({ SAMLResponse: samlResponse, RelayState: relayState });
  if (!assertion) throw err(400, "The SAML assertion could not be validated");

  // node-saml exposes both raw attribute names and friendly claim aliases.
  const claims = { ...assertion.attributes, ...assertion, nameID: assertion.nameID };
  const profile = mapProfile(conn, claims);

  const user = await runUnscoped(() => resolveUser(conn, profile, tenantId));
  const handoffCode = await createHandoff(rec.id, user.id);
  await runUnscoped(() => prisma.ssoConnection.update({ where: { id: conn.id }, data: { lastLoginAt: new Date(), lastError: null } }));
  return { handoffCode, redirectTo: rec.redirectTo || "/overview" };
}

// ── Login: step 3 (SPA exchanges the code for a session) ─────────────────────
export async function exchangeHandoff({ code, req }) {
  if (!code) throw err(400, "Missing SSO code");
  const rec = await runUnscoped(() => prisma.ssoLoginRequest.findUnique({ where: { handoffCode: String(code) } }));
  if (!rec || !rec.userId) throw err(400, "Invalid SSO code");
  if (rec.expiresAt < new Date()) throw err(400, "This SSO code expired — please sign in again");

  // Single use: burn the code before issuing the session.
  await runUnscoped(() => prisma.ssoLoginRequest.update({ where: { id: rec.id }, data: { handoffCode: null } }));

  return runUnscoped(async () => {
    const user = await prisma.user.findUnique({
      where: { id: rec.userId },
      include: { tenant: true, role: true },
    });
    if (!user || !user.isActive) throw err(403, "Account is not active");

    const session = await prisma.userSession.create({
      data: {
        userId: user.id, tenantId: user.tenantId,
        ipAddress: req?.ip ?? null, userAgent: req?.headers?.["user-agent"] ?? null, isActive: true,
      },
    });
    const token = jwt.sign(
      {
        userId: user.id, tenantId: user.tenantId, role: user.role.name,
        department: user.department ?? null, sessionId: session.id, amr: ["sso"],
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "1d" }
    );
    await Promise.all([
      prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
      prisma.auditLog.create({
        data: {
          userId: user.id, tenantId: user.tenantId, action: "login_sso", resource: "auth",
          detail: `SSO login (${rec.protocol.toUpperCase()})`, ipAddress: req?.ip ?? null,
        },
      }),
    ]);

    return {
      token,
      redirectTo: rec.redirectTo || "/overview",
      user: {
        id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName,
        employeeId: user.employeeId, tenantId: user.tenantId,
        enterprise: user.tenant?.name ?? null, enterpriseCode: user.tenant?.code ?? null,
        role: user.role.name, department: user.department ?? null, avatarUrl: user.avatarUrl ?? null,
        plan: user.tenant?.plan ?? "executive", planSolutions: user.tenant?.planSolutions ?? [],
      },
    };
  });
}

/** Housekeeping: drop expired login requests (called opportunistically). */
export async function pruneLoginRequests() {
  try {
    await runUnscoped(() => prisma.ssoLoginRequest.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 864e5) } } }));
  } catch { /* best effort */ }
}

export const _internal = { mapProfile, shape, last4 };
