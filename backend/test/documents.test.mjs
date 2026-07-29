import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTRACT_STATES, CONTRACT_STATUSES, CONTRACT_TYPES, LIVE_STATUSES,
  DOCUMENT_CATEGORIES, SIGNER_ROLES, ACTING_ROLES,
  canTransition, transitionError, nextStates, validateSigners, activeSigners,
  isEnvelopeComplete, daysUntil, noticeDeadline, addMonths, renewalStatus,
  RENEWAL_LABELS, catalog, isEmail, documentCategory, contractType,
} from "../src/modules/documents/documents.registry.js";
import {
  placeholdersIn, mergeVariables, missingVariables, render,
} from "../src/modules/documents/templates.service.js";
import {
  hashToken, newToken, canonicalize, certificateHash, buildCertificate,
  verifyCertificate, signingUrl,
} from "../src/modules/documents/signatures.service.js";

// ── Registry integrity ───────────────────────────────────────────────────────
test("every lifecycle state is internally consistent", () => {
  for (const [id, s] of Object.entries(CONTRACT_STATES)) {
    assert.ok(s.label, `${id} needs a label`);
    assert.ok(s.description, `${id} needs a description a person can read`);
    assert.ok(Array.isArray(s.to), `${id} must declare its transitions`);
    for (const target of s.to) {
      assert.ok(CONTRACT_STATES[target], `${id} points at unknown state "${target}"`);
      assert.notEqual(target, id, `${id} must not declare a transition to itself`);
    }
    if (s.terminal) assert.ok(!s.countsAsLive, `${id} can't be both terminal and in force`);
  }
});

test("only 'active' counts as legally in force", () => {
  // The renewal scheduler and the committed-value total both key off this, so a
  // stray flag here would silently start emailing people about drafts.
  assert.deepEqual(LIVE_STATUSES, ["active"]);
});

test("a contract cannot reach active without passing through signature or review", () => {
  // draft → active IS allowed (a countersigned paper contract entered after the
  // fact is a real case), but the terminal states must be dead ends.
  for (const id of ["renewed", "terminated"]) {
    assert.deepEqual(CONTRACT_STATES[id].to, [], `${id} must be a dead end`);
  }
  assert.ok(!canTransition("terminated", "active"), "a terminated contract can't be revived in place");
  assert.ok(!canTransition("renewed", "active"), "a renewed contract is superseded, not reusable");
});

test("transitions are validated in both directions", () => {
  assert.ok(canTransition("draft", "in_review"));
  assert.ok(canTransition("pending_signature", "active"));
  assert.ok(canTransition("active", "terminated"));
  assert.ok(!canTransition("draft", "renewed"), "you can't renew something that never took effect");
  assert.ok(!canTransition("active", "in_review"));
  assert.ok(!canTransition("nonsense", "active"));
  assert.ok(!canTransition("active", "nonsense"));
});

test("a refused transition explains itself in plain language", () => {
  const msg = transitionError("active", "in_review");
  assert.match(msg, /active contract can only move to/i);
  assert.match(msg, /renewed|expired|terminated/);
  assert.match(transitionError("terminated", "active"), /create a renewal instead/i);
  assert.match(transitionError("draft", "draft"), /already/i);
  assert.match(transitionError("draft", "bogus"), /isn't a contract status/);
  assert.deepEqual(nextStates("terminated"), []);
});

test("ids are unique across the registry", () => {
  for (const list of [DOCUMENT_CATEGORIES, CONTRACT_TYPES]) {
    const ids = list.map((x) => x.id);
    assert.equal(new Set(ids).size, ids.length, "duplicate id");
  }
  assert.equal(documentCategory("nope"), null);
  assert.equal(contractType("nope"), null);
  assert.ok(documentCategory("contract"));
  assert.ok(contractType("nda"));
});

test("the catalog exposes what the UI needs and nothing internal", () => {
  const c = catalog();
  assert.equal(c.contractStates.length, CONTRACT_STATUSES.length);
  assert.ok(c.contractStates.every((s) => "to" in s && "terminal" in s));
  assert.ok(c.signerRoles.length === Object.keys(SIGNER_ROLES).length);
  // Every renewal state the classifier can produce must have a label.
  for (const state of ["overdue", "notice_passed", "due_soon", "notice_soon", "evergreen", "ok", "n/a"]) {
    assert.ok(RENEWAL_LABELS[state], `${state} has no label`);
  }
});

// ── Signers ──────────────────────────────────────────────────────────────────
test("signer lists are normalized and de-duplicated", () => {
  const out = validateSigners([
    { name: "  Zoe Adams ", email: "ZOE@Example.COM ", role: "signer", order: 1 },
    { name: "Ben Cole", email: "ben@example.com", role: "approver", order: 0 },
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].email, "ben@example.com", "sorted by signing order");
  assert.equal(out[1].email, "zoe@example.com", "email is lower-cased and trimmed");
  assert.equal(out[1].name, "Zoe Adams");
});

test("a signer list that can't complete is refused", () => {
  assert.throws(() => validateSigners([]), /at least one signer/i);
  assert.throws(() => validateSigners([{ name: "V", email: "v@x.co", role: "viewer" }]), /viewers can't complete/i);
  assert.throws(() => validateSigners([{ name: "", email: "a@b.co" }]), /needs a name/i);
  assert.throws(() => validateSigners([{ name: "A", email: "not-an-email" }]), /valid email/i);
  assert.throws(() => validateSigners([{ name: "A", email: "ghost", role: "wizard" }]), /valid email/i);
  assert.throws(() => validateSigners([{ name: "A", email: "a@b.co", role: "wizard" }]), /unknown signer role/i);
  assert.throws(() => validateSigners([
    { name: "A", email: "same@b.co" }, { name: "B", email: "SAME@b.co" },
  ]), /listed twice/i);
  assert.throws(
    () => validateSigners(Array.from({ length: 26 }, (_, i) => ({ name: `P${i}`, email: `p${i}@x.co` }))),
    /at most 25/i,
  );
});

test("email validation rejects the usual near-misses", () => {
  for (const ok of ["a@b.co", "first.last+tag@sub.example.com"]) assert.ok(isEmail(ok), ok);
  for (const bad of ["", "a@b", "a b@c.co", "@b.co", "a@.co", "a@b .co", null]) assert.ok(!isEmail(bad), String(bad));
});

test("parallel envelopes invite everyone; sequential ones invite one group at a time", () => {
  const signers = [
    { id: "1", role: "signer", order: 0, status: "sent" },
    { id: "2", role: "signer", order: 1, status: "pending" },
    { id: "3", role: "viewer", order: 0, status: "pending" },
  ];
  assert.deepEqual(activeSigners(signers).map((s) => s.id), ["1", "2"], "viewers never block or act");
  assert.deepEqual(activeSigners(signers, { sequential: true }).map((s) => s.id), ["1"]);

  const afterFirst = [{ ...signers[0], status: "signed" }, signers[1], signers[2]];
  assert.deepEqual(activeSigners(afterFirst, { sequential: true }).map((s) => s.id), ["2"], "advances to the next order");
});

test("an envelope completes only when every acting party has signed", () => {
  assert.ok(!isEnvelopeComplete([]), "an empty envelope is not complete");
  assert.ok(!isEnvelopeComplete([{ role: "viewer", status: "pending" }]), "viewers alone can't complete it");
  assert.ok(!isEnvelopeComplete([
    { role: "signer", status: "signed" }, { role: "approver", status: "pending" },
  ]));
  assert.ok(isEnvelopeComplete([
    { role: "signer", status: "signed" }, { role: "approver", status: "signed" }, { role: "viewer", status: "pending" },
  ]), "an outstanding viewer must not hold the envelope open");
  assert.ok(!isEnvelopeComplete([{ role: "signer", status: "declined" }]));
  assert.deepEqual(ACTING_ROLES, ["signer", "approver"]);
});

// ── Contract date maths ──────────────────────────────────────────────────────
test("the notice deadline is the notice period before the end date", () => {
  const d = noticeDeadline({ endDate: "2026-12-31T00:00:00Z", noticePeriodDays: 60 });
  assert.equal(d.toISOString().slice(0, 10), "2026-11-01");
  assert.equal(noticeDeadline({ endDate: null }), null);
  assert.equal(
    noticeDeadline({ endDate: "2026-12-31T00:00:00Z" }).toISOString().slice(0, 10),
    "2026-12-31", "no notice period ⇒ the deadline is the end date",
  );
});

test("month arithmetic clamps to the end of short months", () => {
  // A 31 January contract renewing monthly must not silently land on 3 March.
  assert.equal(addMonths(new Date("2026-01-31T00:00:00Z"), 1).toISOString().slice(0, 10), "2026-02-28");
  assert.equal(addMonths(new Date("2028-01-31T00:00:00Z"), 1).toISOString().slice(0, 10), "2028-02-29", "leap year");
  assert.equal(addMonths(new Date("2026-01-15T00:00:00Z"), 12).toISOString().slice(0, 10), "2027-01-15");
  assert.equal(addMonths(new Date("2026-08-31T00:00:00Z"), 1).toISOString().slice(0, 10), "2026-09-30");
});

test("daysUntil counts whole days and goes negative in the past", () => {
  const now = new Date("2026-07-29T12:00:00Z");
  assert.equal(daysUntil("2026-08-08T12:00:00Z", now), 10);
  assert.equal(daysUntil("2026-07-19T12:00:00Z", now), -10);
  assert.equal(daysUntil(null, now), null);
});

test("renewal urgency is classified the same way for emails and the UI", () => {
  const now = new Date("2026-07-29T00:00:00Z");
  const base = { status: "active", noticePeriodDays: 30 };

  assert.equal(renewalStatus({ ...base, endDate: "2026-07-01T00:00:00Z" }, now).state, "overdue");
  // Ends in 40 days with 30 days' notice ⇒ notice is due in 10 days.
  assert.equal(renewalStatus({ ...base, endDate: "2026-09-07T00:00:00Z" }, now).state, "notice_soon");
  // Ends in 12 days with 30 days' notice ⇒ the notice window has already closed.
  // That's the more actionable fact than "ends soon", so it wins.
  assert.equal(renewalStatus({ ...base, endDate: "2026-08-10T00:00:00Z" }, now).state, "notice_passed");
  assert.equal(renewalStatus({ ...base, endDate: "2026-08-20T00:00:00Z", noticePeriodDays: 60 }, now).state, "notice_passed");
  // Same 12 days, but no notice required ⇒ simply ending soon.
  assert.equal(renewalStatus({ ...base, endDate: "2026-08-10T00:00:00Z", noticePeriodDays: 0 }, now).state, "due_soon");
  assert.equal(renewalStatus({ ...base, endDate: "2027-07-29T00:00:00Z" }, now).state, "ok");
  assert.equal(renewalStatus({ ...base, endDate: null }, now).state, "evergreen");
  assert.equal(renewalStatus({ status: "draft", endDate: "2026-08-01T00:00:00Z" }, now).state, "n/a",
    "a draft is not a commitment, so it can't be overdue");
  assert.equal(renewalStatus(null, now).state, "n/a");
});

// ── Templates ────────────────────────────────────────────────────────────────
test("placeholders are discovered from the body, in order, without duplicates", () => {
  const body = "{{company}} and {{counterparty}} agree. Signed by {{company}} on {{ date }}. Generated {{now}}.";
  assert.deepEqual(placeholdersIn(body), ["company", "counterparty", "date"], "{{now}} is filled in by the engine");
  assert.deepEqual(placeholdersIn(""), []);
  assert.deepEqual(placeholdersIn(null), []);
});

test("declared variable metadata is merged with what the body actually uses", () => {
  const vars = mergeVariables("Hi {{client_name}}, fee is {{fee}}.", [
    { key: "fee", label: "Total fee", required: false },
    { key: "unused", label: "Ghost" },
  ]);
  assert.deepEqual(vars.map((v) => v.key), ["client_name", "fee"], "a declared-but-unused variable is dropped");
  assert.equal(vars[0].label, "Client Name", "a label is derived when none is declared");
  assert.equal(vars[0].required, true, "variables are required by default");
  assert.equal(vars[1].label, "Total fee");
  assert.equal(vars[1].required, false);
});

test("missing required values are reported by label", () => {
  const vars = [{ key: "a", label: "Client", required: true }, { key: "b", label: "Fee", required: false }];
  assert.deepEqual(missingVariables(vars, {}), ["Client"]);
  assert.deepEqual(missingVariables(vars, { a: "   " }), ["Client"], "whitespace is not a value");
  assert.deepEqual(missingVariables(vars, { a: "Acme" }), []);
});

test("rendering substitutes values and never leaks internals", () => {
  assert.equal(render("Hello {{name}}", { name: "Acme" }), "Hello Acme");
  assert.equal(render("Missing: [{{nope}}]", {}), "Missing: []", "an unknown placeholder renders empty");
  // Prototype access must not resolve, and non-primitives must not be stringified
  // into a legal document.
  assert.equal(render("[{{__proto__}}]", {}), "[]");
  assert.equal(render("[{{constructor}}]", {}), "[]");
  assert.equal(render("[{{obj}}]", { obj: { secret: 1 } }), "[]");
  assert.equal(render("[{{fn}}]", { fn: () => "x" }), "[]");
  assert.equal(render("[{{n}}]", { n: 0 }), "[0]", "zero is a value, not a blank");
  assert.equal(render("[{{f}}]", { f: false }), "[false]");
});

// ── Signature tokens ─────────────────────────────────────────────────────────
test("signing tokens are long, unguessable and stored only as hashes", () => {
  const a = newToken(), b = newToken();
  assert.notEqual(a, b);
  assert.ok(a.length >= 40, "a signing token must carry real entropy");
  assert.match(a, /^[A-Za-z0-9_-]+$/, "url-safe so it survives being emailed");

  const hash = hashToken(a);
  assert.equal(hash.length, 64, "sha-256 hex");
  assert.notEqual(hash, a, "the token itself is never what we store");
  assert.equal(hashToken(a), hash, "hashing is stable, so lookups work");
  assert.notEqual(hashToken(b), hash);
});

test("the signing URL embeds the token in the path", () => {
  const url = signingUrl("abc123");
  assert.match(url, /\/sign\/abc123$/);
  assert.ok(url.startsWith("http"), "it has to be clickable in an email");
});

// ── Completion certificate ───────────────────────────────────────────────────
test("canonical JSON is order-independent", () => {
  // Without this, verification would depend on property insertion order — i.e.
  // it would sometimes fail on a certificate nobody touched.
  assert.equal(canonicalize({ a: 1, b: 2 }), canonicalize({ b: 2, a: 1 }));
  assert.equal(canonicalize({ x: { p: 1, q: 2 } }), canonicalize({ x: { q: 2, p: 1 } }));
  assert.notEqual(canonicalize([1, 2]), canonicalize([2, 1]), "array order is meaningful");
  assert.equal(canonicalize(null), "null");
  assert.equal(certificateHash({ a: 1 }), certificateHash({ a: 1 }));
  assert.notEqual(certificateHash({ a: 1 }), certificateHash({ a: 2 }));
});

const sampleEnvelope = () => ({
  request: { id: "env_1", title: "MSA", sequential: false, createdAt: "2026-07-01T00:00:00Z", sentAt: "2026-07-02T00:00:00Z" },
  document: { id: "doc_1", title: "Master Services Agreement" },
  version: { fileName: "msa.pdf", version: 2, size: 1234, checksum: "a".repeat(64) },
  signers: [
    { name: "Zoe Adams", email: "zoe@buyer.co", role: "signer", signatureName: "Zoe Adams", consent: true, signedAt: "2026-07-03T10:00:00Z", viewedAt: "2026-07-02T09:00:00Z", ip: "203.0.113.9" },
    { name: "Ben Cole", email: "ben@seller.co", role: "approver", signatureName: "Ben Cole", consent: true, signedAt: "2026-07-03T11:00:00Z", viewedAt: null, ip: "203.0.113.10" },
    { name: "Ada Legal", email: "legal@seller.co", role: "viewer", signedAt: null },
  ],
  issuedAt: "2026-07-03T11:00:01Z",
});

test("the certificate binds the signatures to the exact file", () => {
  const cert = buildCertificate(sampleEnvelope());
  assert.equal(cert.document.sha256, "a".repeat(64), "the fingerprint is the whole point");
  assert.equal(cert.document.version, 2);
  assert.equal(cert.signatures.length, 2, "viewers are listed as copies, not signatures");
  assert.equal(cert.copies.length, 1);
  assert.equal(cert.signatures[0].email, "ben@seller.co", "signatures are sorted for a stable hash");
  assert.ok(cert.signatures.every((s) => s.consented === true), "consent is recorded per signature");
  assert.ok(cert.signatures.every((s) => s.ip), "the IP is evidence and must be present");
  assert.ok(cert.hash);
});

test("a certificate verifies against itself", () => {
  const cert = buildCertificate(sampleEnvelope());
  const check = verifyCertificate(cert);
  assert.equal(check.valid, true, check.reason);
});

test("tampering with a stored certificate is detectable", () => {
  const cert = buildCertificate(sampleEnvelope());

  // Someone edits the signer's name after the fact…
  const forged = structuredClone(cert);
  forged.signatures[0].signedAs = "Someone Else";
  assert.equal(verifyCertificate(forged).valid, false);

  // …or swaps the document fingerprint for a different file…
  const swapped = structuredClone(cert);
  swapped.document.sha256 = "b".repeat(64);
  assert.equal(verifyCertificate(swapped).valid, false);

  // …or adds a signature that never happened.
  const padded = structuredClone(cert);
  padded.signatures.push({ name: "Ghost", email: "ghost@x.co", role: "signer", signedAt: null });
  assert.equal(verifyCertificate(padded).valid, false);

  // Re-hashing after editing does NOT help an attacker who can only change the
  // stored copy, but the check must still be honest about what it proves.
  const rehashed = structuredClone(cert);
  rehashed.signatures[0].signedAs = "Someone Else";
  const { hash: _drop, ...body } = rehashed;
  assert.equal(verifyCertificate({ ...body, hash: certificateHash(body) }).valid, true);
});

test("a missing or hash-less certificate fails closed", () => {
  assert.equal(verifyCertificate(null).valid, false);
  assert.equal(verifyCertificate(undefined).valid, false);
  assert.equal(verifyCertificate("nope").valid, false);
  assert.equal(verifyCertificate({ document: {} }).valid, false);
  assert.match(verifyCertificate(null).reason, /no certificate/i);
});

test("a certificate for an unsigned envelope reports no fingerprint rather than inventing one", () => {
  const env = sampleEnvelope();
  env.version = { fileName: "msa.pdf", version: 1, size: 10, checksum: null };
  const cert = buildCertificate(env);
  assert.equal(cert.document.sha256, null);
  assert.equal(verifyCertificate(cert).valid, true, "it still verifies as an honest record");
});
