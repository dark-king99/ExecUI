import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { createPkce, buildAuthorizationUrl, verifyIdToken } from "../src/lib/oidc.js";
import {
  parseFilter, toScimUser, fromScimUser, toScimGroup,
  serviceProviderConfig, resourceTypes, schemas, ScimError,
  USER_SCHEMA, ENTERPRISE_USER_SCHEMA,
} from "../src/modules/scim/scim.service.js";
import { hashToken } from "../src/modules/scim/scim.tokens.js";
import { entitlementsFor, PLANS } from "../src/modules/billing/plans.config.js";

// ── Plan gating ──────────────────────────────────────────────────────────────
test("SSO is entitled on Enterprise and Executive only", () => {
  assert.equal(entitlementsFor("standard").sso, false);
  assert.equal(entitlementsFor("premium").sso, false);
  assert.equal(entitlementsFor("enterprise").sso, true);
  assert.equal(entitlementsFor("executive").sso, true);
  assert.equal(entitlementsFor("custom", ["crm:leads"]).sso, false);
  // Every plan object still resolves to a boolean (no undefined leaking out).
  for (const p of PLANS) assert.equal(typeof entitlementsFor(p.id).sso, "boolean");
});

// ── OIDC ─────────────────────────────────────────────────────────────────────
test("PKCE challenge is the base64url SHA-256 of the verifier", () => {
  const { codeVerifier, codeChallenge } = createPkce();
  const expected = crypto.createHash("sha256").update(codeVerifier).digest("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  assert.equal(codeChallenge, expected);
  assert.ok(codeVerifier.length >= 43); // RFC 7636 minimum entropy
});

test("authorization URL carries the required OIDC parameters", () => {
  const u = new URL(buildAuthorizationUrl({
    endpoints: { authorization_endpoint: "https://idp.test/authorize" },
    clientId: "cid", redirectUri: "https://app.test/cb",
    scopes: "openid email", state: "st8", nonce: "n1", codeChallenge: "cc",
  }));
  assert.equal(u.searchParams.get("response_type"), "code");
  assert.equal(u.searchParams.get("client_id"), "cid");
  assert.equal(u.searchParams.get("code_challenge_method"), "S256");
  assert.equal(u.searchParams.get("state"), "st8");
  assert.equal(u.searchParams.get("nonce"), "n1");
});

test("id_token verification enforces signature, nonce and algorithm", async (t) => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "k1", alg: "RS256", use: "sig" };
  const endpoints = { issuer: "https://idp.test", jwks_uri: "https://idp.test/jwks" };

  const realFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ keys: [jwk] }), { status: 200, headers: { "content-type": "application/json" } });
  t.after(() => { global.fetch = realFetch; });

  const good = jwt.sign({ sub: "u1", email: "a@b.co", nonce: "n1" }, privateKey,
    { algorithm: "RS256", issuer: endpoints.issuer, audience: "cid", expiresIn: "5m", keyid: "k1" });

  const claims = await verifyIdToken({ idToken: good, endpoints, clientId: "cid", nonce: "n1" });
  assert.equal(claims.sub, "u1");

  // Replayed/forged nonce
  await assert.rejects(() => verifyIdToken({ idToken: good, endpoints, clientId: "cid", nonce: "other" }), /nonce/i);
  // Wrong audience
  await assert.rejects(() => verifyIdToken({ idToken: good, endpoints, clientId: "different", nonce: "n1" }), /audience/i);
  // "alg: none" downgrade attack
  const none = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url") + "." +
    Buffer.from(JSON.stringify({ sub: "x" })).toString("base64url") + ".";
  await assert.rejects(() => verifyIdToken({ idToken: none, endpoints, clientId: "cid" }), /Unsupported id_token algorithm/);
});

// ── SCIM: filters ────────────────────────────────────────────────────────────
test("SCIM filter parses the expressions IdPs actually send", () => {
  assert.deepEqual(parseFilter('userName eq "A@B.co"'), { email: "a@b.co" });
  assert.deepEqual(parseFilter('externalId eq "okta-1"'), { externalId: "okta-1" });
  assert.deepEqual(parseFilter("active eq true"), { isActive: true });
  assert.deepEqual(parseFilter('emails.value eq "x@y.co"'), { email: "x@y.co" });
  assert.deepEqual(parseFilter('userName eq "a@b.co" and active eq true'), { email: "a@b.co", isActive: true });
  assert.deepEqual(parseFilter(undefined), {});
});

test("SCIM filter rejects unsupported attributes with the right error", () => {
  assert.throws(() => parseFilter('nickName co "bob"'), (e) => e instanceof ScimError && e.status === 400 && e.scimType === "invalidFilter");
  assert.throws(() => parseFilter("garbage"), (e) => e instanceof ScimError);
});

// ── SCIM: resource mapping ───────────────────────────────────────────────────
const dbUser = {
  id: "u-1", email: "jane@acme.co", firstName: "Jane", lastName: "Doe",
  employeeId: "abc1234", department: "Finance", jobTitle: "Analyst", phone: "+123",
  isActive: true, externalId: "okta-9", roleId: "r-1", role: { name: "employee" },
  createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-02-01"),
};

test("Prisma user → SCIM User carries the enterprise extension", () => {
  const s = toScimUser(dbUser, "https://app.test/scim/v2");
  assert.ok(s.schemas.includes(USER_SCHEMA));
  assert.equal(s.userName, "jane@acme.co");
  assert.equal(s.name.givenName, "Jane");
  assert.equal(s.displayName, "Jane Doe");
  assert.equal(s.active, true);
  assert.equal(s.externalId, "okta-9");
  assert.equal(s[ENTERPRISE_USER_SCHEMA].department, "Finance");
  assert.equal(s[ENTERPRISE_USER_SCHEMA].employeeNumber, "abc1234");
  assert.equal(s.emails[0].value, "jane@acme.co");
  assert.equal(s.meta.location, "https://app.test/scim/v2/Users/u-1");
});

test("SCIM User → ExecUI fields, including deactivation", () => {
  const mapped = fromScimUser({
    schemas: [USER_SCHEMA],
    userName: "New.Person@Acme.co",
    name: { givenName: "New", familyName: "Person" },
    externalId: "ext-1", title: "Manager", active: false,
    [ENTERPRISE_USER_SCHEMA]: { department: "Ops", employeeNumber: "XYZ9876" },
  });
  assert.equal(mapped.email, "new.person@acme.co"); // normalized
  assert.equal(mapped.firstName, "New");
  assert.equal(mapped.lastName, "Person");
  assert.equal(mapped.jobTitle, "Manager");
  assert.equal(mapped.department, "Ops");
  assert.equal(mapped.isActive, false);
  assert.equal(mapped.employeeId, "xyz9876"); // normalized to the 7-char format
});

test("SCIM mapping falls back to displayName / emails when name is absent", () => {
  const m = fromScimUser({ displayName: "Ada Lovelace", emails: [{ value: "ada@acme.co", primary: true }] });
  assert.equal(m.email, "ada@acme.co");
  assert.equal(m.firstName, "Ada");
  assert.equal(m.lastName, "Lovelace");
  // `active` omitted ⇒ we must NOT invent a value (would deactivate on PUT).
  assert.equal(m.isActive, undefined);
});

test("roles map to SCIM Groups with members", () => {
  const g = toScimGroup({ id: "r-1", name: "employee" }, [dbUser], "https://app.test/scim/v2");
  assert.equal(g.displayName, "employee");
  assert.equal(g.members.length, 1);
  assert.equal(g.members[0].value, "u-1");
  assert.equal(g.members[0].display, "Jane Doe");
});

// ── SCIM: discovery documents ────────────────────────────────────────────────
test("SCIM discovery documents advertise what we actually implement", () => {
  const cfg = serviceProviderConfig("https://app.test/scim/v2");
  assert.equal(cfg.patch.supported, true);
  assert.equal(cfg.filter.supported, true);
  assert.equal(cfg.bulk.supported, false);       // honest: we don't implement bulk
  assert.equal(cfg.changePassword.supported, false); // passwords live in the IdP
  assert.equal(cfg.authenticationSchemes[0].type, "oauthbearertoken");

  const rt = resourceTypes("https://app.test/scim/v2");
  assert.deepEqual(rt.Resources.map((r) => r.id).sort(), ["Group", "User"]);

  const sc = schemas("https://app.test/scim/v2");
  assert.ok(sc.Resources.some((s) => s.id === USER_SCHEMA));
  assert.ok(sc.Resources.some((s) => s.id === ENTERPRISE_USER_SCHEMA));
});

// ── SCIM tokens ──────────────────────────────────────────────────────────────
test("SCIM tokens are stored only as a stable SHA-256 hash", () => {
  const raw = "execui_scim_abc123";
  assert.equal(hashToken(raw), crypto.createHash("sha256").update(raw).digest("hex"));
  assert.equal(hashToken(raw), hashToken(raw));            // deterministic
  assert.notEqual(hashToken(raw), hashToken(raw + "x"));   // collision-free
  assert.ok(!hashToken(raw).includes(raw));                // never recoverable
});
