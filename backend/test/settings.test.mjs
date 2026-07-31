import test from "node:test";
import assert from "node:assert/strict";
import {
  SETTINGS, GROUPS, getSetting, coerce, DEFAULTS, PUBLIC_KEYS,
} from "../src/modules/settings/settings.registry.js";
import { brandingFromTenant, planAllows, senderFor, PLATFORM } from "../src/modules/settings/settings.service.js";
import { entitlementsFor, PLANS } from "../src/modules/billing/plans.config.js";

// ── Registry integrity ───────────────────────────────────────────────────────
test("every setting is internally consistent", () => {
  const types = ["string", "color", "email", "url", "boolean"];
  for (const s of SETTINGS) {
    assert.ok(s.key.includes("."), `${s.key} should be namespaced (group.name)`);
    assert.ok(s.label, `${s.key} needs a label`);
    assert.ok(s.describe, `${s.key} needs a description — it is shown in the admin UI`);
    assert.ok(types.includes(s.type), `${s.key} has an unknown type "${s.type}"`);
    assert.ok(GROUPS.some((g) => g.id === s.group), `${s.key} names group "${s.group}" which doesn't exist`);
    if (s.type !== "boolean") assert.ok(s.max > 0, `${s.key} needs a length cap`);
  }
});

test("setting keys are unique", () => {
  const keys = SETTINGS.map((s) => s.key);
  assert.equal(new Set(keys).size, keys.length);
});

test("defaults cover every declared key", () => {
  for (const s of SETTINGS) assert.ok(s.key in DEFAULTS, `${s.key} missing from DEFAULTS`);
});

// This is the one that matters for a public endpoint: the portal serves these
// to anyone who knows a slug, so the list must never quietly grow.
test("only deliberately public settings are exposed without a session", () => {
  assert.deepEqual(
    [...PUBLIC_KEYS].sort(),
    [
      "branding.hidePoweredBy",
      "branding.logoUrl",
      "branding.primaryColor",
      "branding.productName",
      "branding.supportEmail",
    ],
  );
  // The email sender name is internal configuration — it says how the org's
  // mail is set up, which a stranger has no business reading.
  assert.ok(!PUBLIC_KEYS.includes("branding.emailFromName"));
});

// ── Validation ───────────────────────────────────────────────────────────────
test("colours must be hex", () => {
  assert.equal(coerce("branding.primaryColor", "#4F46E5").value, "#4f46e5");
  assert.ok(coerce("branding.primaryColor", "red").error);
  assert.ok(coerce("branding.primaryColor", "#fff").error);
});

test("email addresses are validated and lowercased", () => {
  assert.equal(coerce("branding.supportEmail", "Help@Acme.COM").value, "help@acme.com");
  assert.ok(coerce("branding.supportEmail", "not-an-email").error);
});

test("logo accepts an upload path or an absolute http(s) URL, nothing else", () => {
  assert.equal(coerce("branding.logoUrl", "/api/uploads/abc.png").value, "/api/uploads/abc.png");
  assert.equal(coerce("branding.logoUrl", "https://cdn.acme.com/logo.png").value, "https://cdn.acme.com/logo.png");
  // A javascript: URL rendered into an <img src> is the reason this is a
  // whitelist rather than a format check.
  assert.ok(coerce("branding.logoUrl", "javascript:alert(1)").error);
  assert.ok(coerce("branding.logoUrl", "data:image/png;base64,AAAA").error);
});

test("clearing a value falls back to the default rather than storing empty", () => {
  assert.equal(coerce("branding.productName", "").value, null);
  assert.equal(coerce("branding.productName", null).value, null);
  assert.equal(coerce("branding.hidePoweredBy", "").value, false);
});

test("over-long values are refused, not silently truncated", () => {
  const def = getSetting("branding.productName");
  assert.ok(coerce("branding.productName", "x".repeat(def.max + 1)).error);
  assert.equal(coerce("branding.productName", "x".repeat(def.max)).value.length, def.max);
});

test("unknown keys are refused", () => {
  assert.ok(coerce("branding.nope", "x").error);
  assert.equal(getSetting("branding.nope"), null);
});

// ── Plan gating ──────────────────────────────────────────────────────────────
test("branding is an Enterprise/Executive entitlement", () => {
  assert.equal(entitlementsFor("standard").branding, false);
  assert.equal(entitlementsFor("premium").branding, false);
  assert.equal(entitlementsFor("enterprise").branding, true);
  assert.equal(entitlementsFor("executive").branding, true);
});

test("every plan declares branding as a boolean", () => {
  for (const p of PLANS) {
    assert.equal(typeof entitlementsFor(p.id).branding, "boolean", `${p.id} branding must be boolean`);
  }
});

test("planAllows reads the entitlement, and a null flag allows anything", () => {
  assert.equal(planAllows({ plan: "enterprise" }, "branding"), true);
  assert.equal(planAllows({ plan: "standard" }, "branding"), false);
  assert.equal(planAllows({ plan: "standard" }, null), true);
});

// ── Resolution ───────────────────────────────────────────────────────────────
const values = {
  "branding.productName": "AcmeDesk",
  "branding.logoUrl": "/api/uploads/acme.png",
  "branding.primaryColor": "#ff0000",
  "branding.supportEmail": "help@acme.com",
  "branding.hidePoweredBy": true,
};

test("an entitled tenant gets its own branding", () => {
  const b = brandingFromTenant({ name: "Acme", plan: "executive" }, values);
  assert.equal(b.entitled, true);
  assert.equal(b.productName, "AcmeDesk");
  assert.equal(b.logoUrl, "/api/uploads/acme.png");
  assert.equal(b.hidePoweredBy, true);
  assert.equal(b.organizationName, "Acme");
});

// The downgrade case: the rows are still there, they just stop applying. This
// is what makes a plan change take effect everywhere at once without deleting
// anything the customer gets back by upgrading again.
test("an unentitled tenant falls back to the platform, keeping its stored values", () => {
  const b = brandingFromTenant({ name: "Acme", plan: "standard" }, values);
  assert.equal(b.entitled, false);
  assert.equal(b.productName, PLATFORM.productName);
  assert.equal(b.logoUrl, null);
  assert.equal(b.primaryColor, null);
  // Notably: the platform credit comes BACK on a downgrade.
  assert.equal(b.hidePoweredBy, false);
  // …but who they are is not branding, so it still shows.
  assert.equal(b.organizationName, "Acme");
});

test("an entitled tenant that set nothing still gets the platform defaults", () => {
  const b = brandingFromTenant({ name: "Acme", plan: "executive" }, {});
  assert.equal(b.productName, "ExecUI");
  assert.equal(b.logoUrl, null);
  assert.equal(b.hidePoweredBy, false);
});

test("empty strings count as unset, not as a blank product name", () => {
  const b = brandingFromTenant({ name: "Acme", plan: "executive" }, { "branding.productName": "" });
  assert.equal(b.productName, "ExecUI");
});

// ── Email sender ─────────────────────────────────────────────────────────────
test("the sender keeps the platform's verified address and changes only the name", () => {
  const prev = process.env.RESEND_FROM;
  process.env.RESEND_FROM = "ExecUI <noreply@execui.test>";
  try {
    assert.equal(
      senderFor({ entitled: true, productName: "AcmeDesk", emailFromName: "Acme Support" }),
      '"Acme Support" <noreply@execui.test>',
    );
    // Falls back to the product name when no explicit sender name is set.
    assert.equal(
      senderFor({ entitled: true, productName: "AcmeDesk" }),
      '"AcmeDesk" <noreply@execui.test>',
    );
    // Unentitled → undefined, so lib/email.js uses RESEND_FROM unchanged.
    assert.equal(senderFor({ entitled: false, productName: "ExecUI" }), undefined);
    assert.equal(senderFor(null), undefined);
  } finally {
    if (prev === undefined) delete process.env.RESEND_FROM; else process.env.RESEND_FROM = prev;
  }
});

test("a display name cannot break out of the header", () => {
  const prev = process.env.RESEND_FROM;
  process.env.RESEND_FROM = "ExecUI <noreply@execui.test>";
  try {
    const from = senderFor({ entitled: true, emailFromName: 'Acme" <evil@attacker.test>, x' });
    assert.ok(!from.includes("evil@attacker.test>,"), `quote injection survived: ${from}`);
    assert.equal(from.match(/</g).length, 1, `more than one address in ${from}`);
  } finally {
    if (prev === undefined) delete process.env.RESEND_FROM; else process.env.RESEND_FROM = prev;
  }
});
