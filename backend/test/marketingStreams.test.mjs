/**
 * Data Streams and Content Studio, end to end through the real HTTP app:
 * hosted signup forms (consent only when ticked, honeypot, rate limits, one
 * contact per address under concurrency), the events API (hashed keys,
 * idempotent ids, per-event validation), CSV import (mapping, row errors,
 * consent that never overrides an opt-out), and asset uploads typed by their
 * bytes, versioned, approved and protected once used in a sent email.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, preview } from "../src/modules/marketing/streams/csv.js";
import { customType } from "../src/modules/marketing/streams/ingest.js";
import { sniff } from "../src/modules/marketing/content/assets.service.js";
import { limited, resetLimits } from "../src/modules/marketing/streams/public.routes.js";

const HAS_DB = !!process.env.DATABASE_URL;
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4a10000000049454e44ae426082", "hex");

test("CSV parsing: quotes, embedded newlines, other delimiters, BOM", () => {
  const rows = parseCsv('﻿Email,Name,Note\r\nann@x.test,"Lee, Ann","said ""hi""\nthen left"\r\n\r\nbob@x.test,Bob,\n');
  assert.deepEqual(rows, [["Email", "Name", "Note"], ["ann@x.test", "Lee, Ann", 'said "hi"\nthen left'], ["bob@x.test", "Bob", ""]]);
  assert.deepEqual(parseCsv("e-mail;first name\nc@x.test;Cy"), [["e-mail", "first name"], ["c@x.test", "Cy"]]);
  assert.throws(() => parseCsv('a,b\n"unterminated,x'), /quoted field/);
  const p = preview("Contact,E-mail Address,Surname\nAnn,ann@x.test,Lee\nBob,bob@x.test,Ray");
  assert.deepEqual(p.mapping, { email: "E-mail Address", name: "Contact", last_name: "Surname" });
  const guessed = preview("who,addr\nA,a@x.test\nB,b@x.test\nC,c@x.test");
  assert.equal(guessed.mapping.email, "addr", "finds the email column from its contents");
});

test("event names are namespaced and validated", () => {
  assert.equal(customType("Trial Started"), "custom:trial_started");
  assert.equal(customType("order.paid"), "custom:order.paid");
  assert.throws(() => customType(""), /Event names/);
  assert.throws(() => customType("x".repeat(80)), /Event names/);
});

test("file types come from the bytes, not the name", () => {
  assert.deepEqual(sniff(PNG), { mime: "image/png", kind: "image" });
  assert.deepEqual(sniff(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), { mime: "image/jpeg", kind: "image" });
  assert.deepEqual(sniff(Buffer.from("%PDF-1.7")), { mime: "application/pdf", kind: "document" });
  assert.equal(sniff(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')), null, "SVG can carry script");
  assert.equal(sniff(Buffer.from("<!doctype html><script>")), null);
});

test("rate limiter", () => {
  resetLimits();
  for (let i = 0; i < 5; i++) assert.equal(limited("k", 5, 60_000, 1000 + i), false);
  assert.equal(limited("k", 5, 60_000, 1010), true);
  assert.equal(limited("k", 5, 60_000, 70_000), false, "the window slides");
});

test("data streams and content studio end to end", { skip: !HAS_DB && "DATABASE_URL not set" }, async (t) => {
  const { default: prisma } = await import("../src/config/database.js");
  const { runUnscoped, runWithTenant } = await import("../src/lib/tenantContext.js");
  const { default: app } = await import("../src/app.js");
  const foundation = await import("../src/modules/marketing/foundation.js");
  const engine = await import("../src/modules/marketing/journeys/engine.js");
  const journeys = await import("../src/modules/marketing/journeys/journeys.service.js");
  const { previewAudience } = await import("../src/modules/marketing/segments.js");
  const jwt = (await import("jsonwebtoken")).default;

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const ws = await runUnscoped(async () => {
    const mkT = (x) => prisma.tenant.create({ data: { name: `Str ${x} ${stamp}`, slug: `str-${x}-${stamp}`, code: `ST${x}${stamp}`.slice(0, 12), plan: "executive" } });
    const tenant = await mkT("a"), other = await mkT("b");
    const adminRole = await prisma.role.create({ data: { name: "enterprise_admin", tenantId: tenant.id } });
    const empRole = await prisma.role.create({ data: { name: "employee", tenantId: tenant.id } });
    const admin = await prisma.user.create({ data: { email: `str-a-${stamp}@t.test`, firstName: "Ama", lastName: "Admin", passwordHash: "x", tenantId: tenant.id, roleId: adminRole.id } });
    const emp = await prisma.user.create({ data: { email: `str-e-${stamp}@t.test`, firstName: "Eli", lastName: "Emp", passwordHash: "x", tenantId: tenant.id, roleId: empRole.id } });
    return { tenant, other, admin, emp };
  });
  const tenantId = ws.tenant.id;
  const inT = (fn) => runWithTenant({ tenantId, userId: ws.admin.id, role: "enterprise_admin" }, fn);
  t.after(() => runUnscoped(async () => {
    const storage = await import("../src/lib/storage.js");
    for (const v of await prisma.marketingAssetVersion.findMany({ where: { tenantId: { in: [ws.tenant.id, ws.other.id] } } })) storage.remove(v.url);
    for (const id of [ws.tenant.id, ws.other.id]) {
      for (const m of ["marketingJourneyStep", "marketingJourneyEnrollment", "marketingJourneyVersion", "marketingJourney", "marketingIngestRun", "marketingDataSource", "marketingAssetVersion", "marketingAsset", "marketingEvent", "marketingConsent", "marketingSuppression", "marketingCampaign", "marketingAudience", "auditLog", "contact"]) {
        await prisma[m].deleteMany({ where: { tenantId: id } }).catch(() => {});
      }
      await prisma.user.deleteMany({ where: { tenantId: id } });
      await prisma.role.deleteMany({ where: { tenantId: id } });
      await prisma.tenant.delete({ where: { id } }).catch(() => {});
    }
  }));

  const server = app.listen(0);
  t.after(() => server.close());
  const root = `http://127.0.0.1:${server.address().port}/api`;
  const tok = (u, role) => jwt.sign({ userId: u.id, tenantId: u.tenantId, role, email: u.email }, process.env.JWT_SECRET);
  const admin = tok(ws.admin, "enterprise_admin"), emp = tok(ws.emp, "employee");
  const call = async (method, path, { token = admin, json, body, headers = {} } = {}) => {
    const r = await fetch(`${root}${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...(json ? { "Content-Type": "application/json" } : {}), ...headers }, body: json ? JSON.stringify(json) : body });
    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    return { status: r.status, data };
  };
  const contactsFor = (email) => runUnscoped(() => prisma.contact.findMany({ where: { tenantId, email: { equals: email, mode: "insensitive" } } }));
  const consentOf = async (email) => {
    const [c] = await contactsFor(email);
    return c ? (await runUnscoped(() => prisma.marketingConsent.findFirst({ where: { tenantId, contactId: c.id } })))?.status ?? null : undefined;
  };
  const mail = (n) => `${n}-${stamp}@people.test`;

  let form;
  await t.test("signup forms: consent only when ticked, one contact per address", async () => {
    assert.equal((await call("POST", "/marketing/streams", { json: { kind: "form", name: "Newsletter" } })).status, 400, "the consent sentence is required");
    assert.equal((await call("POST", "/marketing/streams", { token: emp, json: { kind: "form", name: "x", config: { consentText: "Email me news please" } } })).status, 403);
    const r = await call("POST", "/marketing/streams", { json: { kind: "form", name: "Newsletter", config: { title: "<script>alert(1)</script>News", consentText: "Email me news and offers. I can unsubscribe any time.", fields: [{ key: "company", label: "Company" }] } } });
    assert.equal(r.status, 200);
    form = r.data;
    assert.match(form.formUrl, /\/api\/public\/marketing\/forms\/[A-Za-z0-9_-]{16}$/);
    const formPath = new URL(form.formUrl).pathname;
    const pub = (body, headers = {}) => fetch(`http://127.0.0.1:${server.address().port}${formPath}`, { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", ...headers }, body: new URLSearchParams(body).toString() });

    const pageRes = await fetch(`http://127.0.0.1:${server.address().port}${formPath}`);
    const html = await pageRes.text();
    assert.ok(!html.includes("<script>alert(1)"), "form text is escaped");
    assert.match(pageRes.headers.get("content-security-policy") ?? "", /default-src 'none'/);

    resetLimits();
    assert.equal((await pub({ email: mail("ann"), name: "Ann Lee", consent: "yes", company: "Acme" })).status, 200);
    assert.equal(await consentOf(mail("ann")), "subscribed");
    const ev = await runUnscoped(() => prisma.marketingEvent.findFirst({ where: { tenantId, type: "form.submitted" } }));
    assert.equal(ev.properties.sourceId, form.id);
    assert.equal(ev.properties.fields.company, "Acme");
    const consentRow = await runUnscoped(() => prisma.marketingConsent.findFirst({ where: { tenantId, status: "subscribed" } }));
    assert.match(consentRow.evidence, /Email me news and offers/, "the consent wording is kept as evidence");

    assert.equal((await pub({ email: mail("ANN").replace("ANN", "Ann"), name: "Someone Else", consent: "yes" })).status, 200);
    const anns = await contactsFor(mail("ann"));
    assert.equal(anns.length, 1, "the same address (any case) is the same contact");
    assert.equal(anns[0].name, "Ann Lee", "a form never overwrites a name");

    await pub({ email: mail("bob"), name: "Bob" });
    assert.equal(await consentOf(mail("bob")), null, "no tick, no consent");
    await pub({ email: mail("bot"), website: "http://spam.example", consent: "yes" });
    assert.equal((await contactsFor(mail("bot"))).length, 0, "the honeypot stores nothing");
    assert.equal((await pub({ email: "not-an-email" }, { Accept: "application/json" })).status, 400);

    // An unsubscribe can be undone by ticking the box again — but a suppression can't.
    const [ann] = anns;
    await inT(() => foundation.setConsent(tenantId, ann.id, { status: "unsubscribed", source: "unsubscribe_link" }));
    resetLimits();
    await pub({ email: mail("ann"), consent: "yes" });
    assert.equal(await consentOf(mail("ann")), "subscribed");
    await inT(() => foundation.suppress(tenantId, mail("bob"), "complaint"));
    await pub({ email: mail("bob"), consent: "yes" });
    assert.equal(await consentOf(mail("bob")), null, "a suppressed address stays unsubscribed");

    // Rate limit and paused forms.
    resetLimits();
    const codes = [];
    for (let i = 0; i < 6; i++) codes.push((await pub({ email: mail(`r${i}`) })).status);
    assert.deepEqual(codes, [200, 200, 200, 200, 200, 429]);
    await call("PUT", `/marketing/streams/${form.id}`, { json: { status: "paused" } });
    assert.equal((await pub({ email: mail("late") })).status, 410);
    await call("PUT", `/marketing/streams/${form.id}`, { json: { status: "active" } });
  });

  await t.test("simultaneous submissions for a new address make one contact", async () => {
    const s = await runUnscoped(() => prisma.marketingDataSource.findFirst({ where: { id: form.id } }));
    const { submitForm } = await import("../src/modules/marketing/streams/ingest.js");
    for (let round = 0; round < 3; round++) {
      await Promise.all(Array.from({ length: 12 }, () => runWithTenant({ tenantId }, () => submitForm(s, { email: mail(`race${round}`), consent: "yes" }))));
      assert.equal((await contactsFor(mail(`race${round}`))).length, 1);
    }
  });

  await t.test("a form submission starts a journey filtered to that form", async () => {
    const j = await inT(() => journeys.create(tenantId, ws.admin.id, { name: "Welcome from form" }));
    await inT(() => journeys.updateDraft(tenantId, j.id, { draft: { trigger: { type: "event", event: "form.submitted", sourceId: form.id }, entry: "w", nodes: { w: { type: "wait", amount: 1, unit: "days", next: null } } } }));
    await inT(() => journeys.publish(tenantId, ws.admin.id, j.id));
    const off = foundation.onMarketingEvent((e) => engine.onEvent(e));
    resetLimits();
    await fetch(form.formUrl.replace(/^https?:\/\/[^/]+/, `http://127.0.0.1:${server.address().port}`), { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `email=${encodeURIComponent(mail("cy"))}&consent=yes` });
    off();
    await new Promise((r) => setTimeout(r, 200));
    const [cy] = await contactsFor(mail("cy"));
    assert.ok(await runUnscoped(() => prisma.marketingJourneyEnrollment.findFirst({ where: { journeyId: j.id, contactId: cy.id } })), "the submitter is enrolled");
  });

  await t.test("events API: hashed keys, idempotent ids, per-event errors", async () => {
    const c = await call("POST", "/marketing/streams", { json: { kind: "api", name: "Product" } });
    const key = c.data.secret;
    assert.match(key, /^mks_/);
    const stored = await runUnscoped(() => prisma.marketingDataSource.findFirst({ where: { id: c.data.id } }));
    assert.notEqual(stored.secretHash, key, "only a hash is stored");
    assert.ok(!JSON.stringify((await call("GET", "/marketing/streams")).data).includes(key), "the key is never listed again");

    const ingest = (k, events) => fetch(`${root}/public/marketing/ingest/events`, { method: "POST", headers: { Authorization: `Bearer ${k}`, "Content-Type": "application/json" }, body: JSON.stringify({ events }) });
    assert.equal((await ingest("mks_wrongwrongwrongwrongwrong", [{ event: "x", email: mail("x") }])).status, 401);
    const r1 = await (await ingest(key, [
      { event: "Trial Started", email: mail("dee"), name: "Dee", id: "evt-1", properties: { plan: "pro" } },
      { event: "Trial Started", email: mail("dee"), id: "evt-1" },
      { event: "bad name!!", email: mail("dee") },
      { event: "seen", email: "nope" },
    ])).json();
    assert.equal(r1.accepted, 2);
    assert.equal(r1.duplicates, 1, "a retried id is recorded once");
    assert.deepEqual(r1.rejected.map((x) => x.index), [3], "names are normalised; bad emails are rejected per event");
    const types = (await call("GET", "/marketing/streams/custom-events")).data.map((x) => x.type).sort();
    assert.deepEqual(types, ["custom:bad_name", "custom:trial_started"]);
    assert.equal(await consentOf(mail("dee")), null, "events never record consent");

    // Custom events are usable in audience rules.
    const aud = { id: "x", kind: "dynamic", definition: { op: "and", rules: [{ field: "event", cmp: "within_days", type: "custom:trial_started", value: 7 }] } };
    const pv = await inT(() => previewAudience(tenantId, aud, new Set()));
    assert.equal(pv.members, 1);

    const rot = await call("POST", `/marketing/streams/${c.data.id}/rotate-key`);
    assert.equal((await ingest(key, [{ event: "x", email: mail("x") }])).status, 401, "a rotated key stops working");
    assert.equal((await ingest(rot.data.secret, [{ event: "x", email: mail("x") }])).status, 200);
  });

  await t.test("CSV import: mapping, row errors, and consent that never overrides an opt-out", async () => {
    const s = (await call("POST", "/marketing/streams", { json: { kind: "csv", name: "Trade show" } })).data;
    const csv = `First,Last,Email\nAnn,Lee,${mail("ann")}\nNew,Person,${mail("newbie")}\nDup,Row,${mail("newbie")}\nBad,Row,not-an-email\nBob,Ray,${mail("bob")}\nEve,Opt,${mail("eve")}\n`;
    const csvForm = (fields = {}) => { const fd = new FormData(); fd.append("file", new Blob([csv], { type: "text/csv" }), "show.csv"); for (const [k, v] of Object.entries(fields)) fd.append(k, v); return fd; };
    const pv = await call("POST", "/marketing/streams/csv/preview", { body: csvForm() });
    assert.equal(pv.status, 200, JSON.stringify(pv.data));
    assert.deepEqual(pv.data.mapping, { email: "Email", first_name: "First", last_name: "Last" });

    // Eve unsubscribed earlier.
    const { upsertContact } = await import("../src/modules/marketing/streams/ingest.js");
    const eve = (await inT(() => upsertContact(tenantId, { email: mail("eve"), name: "Eve" }))).contact;
    await inT(() => foundation.setConsent(tenantId, eve.id, { status: "unsubscribed", source: "unsubscribe_link" }));

    const mapping = JSON.stringify(pv.data.mapping);
    assert.equal((await call("POST", `/marketing/streams/${s.id}/import`, { body: csvForm({ mapping, consentEvidence: "Show sheet" }) })).status, 400, "consent needs the attestation");
    const r = await call("POST", `/marketing/streams/${s.id}/import`, { body: csvForm({ mapping, consentEvidence: "Signed sheet at Lagos trade show, Nov 2026", attested: "1" }) });
    assert.equal(r.status, 200);
    assert.deepEqual([r.data.rows, r.data.created, r.data.updated, r.data.skipped], [6, 1, 3, 2]);
    assert.deepEqual(r.data.errors.filter((e) => /email|Duplicate/.test(e.error)).map((e) => e.row), [4, 5], "row numbers match the file");
    assert.equal(await consentOf(mail("newbie")), "subscribed");
    assert.equal((await contactsFor(mail("newbie")))[0].name, "New Person");
    assert.equal(await consentOf(mail("eve")), "unsubscribed", "an import never re-subscribes an unsubscribe");
    assert.equal(await consentOf(mail("bob")), null, "a suppressed address isn't subscribed");
    const runs = (await call("GET", `/marketing/streams/${s.id}/runs`)).data;
    assert.equal(runs[0].status, "completed");

    // The older consent import follows the same rule.
    const imp = await inT(() => foundation.importConsent(tenantId, { emails: [mail("eve")], evidence: "Old list" }));
    assert.equal(imp.recorded, 0);
    assert.equal(await consentOf(mail("eve")), "unsubscribed");
  });

  await t.test("content studio: typed uploads, versions, approval, and protection once sent", async () => {
    const up = (path, buf, name, fields = {}) => {
      const fd = new FormData();
      fd.append("file", new Blob([buf]), name);
      for (const [k, v] of Object.entries(fields)) fd.append(k, v);
      return call("POST", path, { body: fd });
    };
    const svg = await up("/marketing/content/assets", Buffer.from("<svg><script>alert(1)</script></svg>"), "logo.png");
    assert.equal(svg.status, 400, "a script file renamed .png is refused");
    const a = await up("/marketing/content/assets", PNG, "banner.png", { name: "Banner", tags: "Launch, hero" });
    assert.equal(a.status, 200);
    assert.deepEqual([a.data.kind, a.data.mimeType, a.data.status, a.data.version], ["image", "image/png", "draft", 1]);
    assert.deepEqual(a.data.tags, ["launch", "hero"]);
    const served = await fetch(`http://127.0.0.1:${server.address().port}${a.data.url}`);
    assert.equal(served.status, 200);

    assert.equal((await call("POST", `/marketing/content/assets/${a.data.id}/approve`, { token: emp })).status, 403);
    assert.match((await call("POST", `/marketing/content/assets/${a.data.id}/approve`)).data.message, /alt text/);
    await call("PUT", `/marketing/content/assets/${a.data.id}`, { json: { altText: "Launch banner" } });
    assert.equal((await call("POST", `/marketing/content/assets/${a.data.id}/approve`)).data.status, "approved");

    const v2 = await up(`/marketing/content/assets/${a.data.id}/versions`, PNG, "banner2.png", { note: "brighter" });
    assert.equal(v2.data.version, 2);
    assert.equal(v2.data.status, "draft", "a new file needs approval again");
    assert.notEqual(v2.data.url, a.data.url);
    assert.equal((await fetch(`http://127.0.0.1:${server.address().port}${a.data.url}`)).status, 200, "the old version's URL keeps working");
    assert.equal((await up(`/marketing/content/assets/${a.data.id}/versions`, Buffer.from("%PDF-1.4"), "x.pdf")).status, 400, "a version keeps its kind");

    // Used in an email that went out: archive, don't delete.
    await inT(() => prisma.marketingCampaign.create({ data: { tenantId, name: "Launch", channel: "email", status: "completed", sendStartedAt: new Date(), htmlBody: `<img src="${a.data.absoluteUrl}">` } }));
    const detail = (await call("GET", `/marketing/content/assets/${a.data.id}`)).data;
    assert.deepEqual(detail.usage.map((u) => u.name), ["Launch"]);
    assert.equal((await call("DELETE", `/marketing/content/assets/${a.data.id}`)).status, 409);
    assert.equal((await call("POST", `/marketing/content/assets/${a.data.id}/archive`)).data.status, "archived");

    const b = await up("/marketing/content/assets", Buffer.from("%PDF-1.7 test"), "deck.pdf");
    assert.equal(b.data.kind, "document");
    assert.equal((await call("DELETE", `/marketing/content/assets/${b.data.id}`)).status, 200, "unused assets can be deleted");
    const { pathFor } = await import("../src/lib/storage.js");
    const fs = await import("node:fs");
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(fs.existsSync(pathFor(b.data.url.split("/").pop())), false, "and their file is gone");
    assert.notEqual((await fetch(`http://127.0.0.1:${server.address().port}${b.data.url}`)).status, 200);

    const sum = (await call("GET", "/marketing/content/assets/summary")).data;
    assert.deepEqual([sum.total, sum.archived], [0, 1]);
    // Other tenants can't see it.
    const otherAdmin = await runUnscoped(async () => {
      const role = await prisma.role.create({ data: { name: "enterprise_admin", tenantId: ws.other.id } });
      return prisma.user.create({ data: { email: `str-o-${stamp}@t.test`, firstName: "Oz", lastName: "Other", passwordHash: "x", tenantId: ws.other.id, roleId: role.id } });
    });
    const otherTok = tok(otherAdmin, "enterprise_admin");
    const foreign = await call("GET", `/marketing/content/assets/${a.data.id}`, { token: otherTok });
    assert.equal(foreign.status, 404, JSON.stringify(foreign.data));
  });

  await t.test("the data cloud overview counts what arrived", async () => {
    const o = (await call("GET", "/marketing/streams/overview")).data;
    assert.equal(o.sources, 3);
    assert.ok(o.events >= 4);
    assert.ok(o.eventsByType.some((e) => e.type === "form.submitted"));
    const m = (await call("GET", "/marketing/cdp/metrics")).data;
    assert.equal(m.totalSources, 3);
    assert.equal(m.resolvedIdentities, null, "identity resolution isn't claimed before it exists");
  });
});
