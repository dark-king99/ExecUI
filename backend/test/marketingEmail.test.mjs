/**
 * Email Studio's engine, end to end: consent and suppression decide who gets
 * a delivery, the worker sends through the provider, provider webhooks update
 * what happened, and unsubscribe works without signing in.
 *
 * Resend is a fake `fetch` answering its documented endpoints; the database,
 * the queue claim (FOR UPDATE SKIP LOCKED), signatures and the HTTP routes are real.
 */
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { renderEmail, unsubscribeToken, verifyUnsubscribeToken } from "../src/modules/marketing/email/render.js";
import { verifySvix } from "../src/modules/marketing/email/webhook.js";

const HAS_DB = !!process.env.DATABASE_URL;
const SECRET = `whsec_${crypto.randomBytes(24).toString("base64")}`;
process.env.MARKETING_RESEND_WEBHOOK_SECRET = SECRET;
process.env.MARKETING_RESEND_API_KEY ??= "re_test";
process.env.MARKETING_EMAIL_RATE = "1000";

/** Sign like Svix does: HMAC-SHA256 over "id.timestamp.body" with the base64 secret. */
function svixHeaders(body, { id = `msg_${crypto.randomUUID()}`, ts = Math.floor(Date.now() / 1000), secret = SECRET } = {}) {
  const sig = crypto.createHmac("sha256", Buffer.from(secret.replace(/^whsec_/, ""), "base64")).update(`${id}.${ts}.${body}`).digest("base64");
  return { "svix-id": id, "svix-timestamp": String(ts), "svix-signature": `v1,${sig}` };
}

test("personalisation is escaped, and every email carries the legal footer and one-click unsubscribe", () => {
  const msg = renderEmail(
    { subject: "Hi {{first_name}}", htmlBody: "<p>Hello {{name}}</p><a href=\"{{unsubscribe_url}}\">x</a>", fromName: "Acme" },
    { postalAddress: "1 Broad St, Monrovia" },
    { name: "<b>Ann</b> Lee", email: "ann@acme.test" }, "delivery-1",
  );
  assert.equal(msg.subject, "Hi <b>Ann</b>", "subjects are text, not HTML");
  assert.match(msg.html, /Hello &lt;b&gt;Ann&lt;\/b&gt; Lee/);
  assert.match(msg.html, /1 Broad St, Monrovia/);
  assert.match(msg.text, /Unsubscribe: http.*\/unsubscribe\/delivery-1\./);
  assert.equal(msg.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
});

test("unsubscribe tokens can't be forged", () => {
  const t = unsubscribeToken("abc");
  assert.equal(verifyUnsubscribeToken(t), "abc");
  assert.equal(verifyUnsubscribeToken(`abc.${"x".repeat(32)}`), null);
  assert.equal(verifyUnsubscribeToken(`other.${t.split(".")[1]}`), null);
});

test("webhook signatures: authentic and fresh only", () => {
  const body = JSON.stringify({ type: "email.delivered" });
  assert.equal(verifySvix(body, svixHeaders(body)), true);
  assert.equal(verifySvix(body + " ", svixHeaders(body)), false, "tampered body");
  assert.equal(verifySvix(body, svixHeaders(body, { secret: `whsec_${crypto.randomBytes(24).toString("base64")}` })), false, "wrong secret");
  assert.equal(verifySvix(body, svixHeaders(body, { ts: Math.floor(Date.now() / 1000) - 3600 })), false, "replayed an hour later");
});

test("email campaigns end to end", { skip: !HAS_DB && "DATABASE_URL not set" }, async (t) => {
  const { default: prisma } = await import("../src/config/database.js");
  const { runUnscoped, runWithTenant } = await import("../src/lib/tenantContext.js");
  const email = await import("../src/modules/marketing/email/email.service.js");
  const foundation = await import("../src/modules/marketing/foundation.js");
  const audiences = await import("../src/modules/marketing/audiences.service.js");
  const worker = await import("../src/modules/marketing/email/worker.js");
  const legacy = await import("../src/modules/marketing/marketing.service.js");
  const { default: app } = await import("../src/app.js");

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const ws = await runUnscoped(async () => {
    const mkT = (n) => prisma.tenant.create({ data: { name: `Mkt ${n} ${stamp}`, slug: `mkt-${n}-${stamp}`, code: `MK${n}${stamp}`.slice(0, 12), plan: "executive" } });
    const tenant = await mkT("a"), other = await mkT("b");
    const role = await prisma.role.create({ data: { name: "enterprise_admin", tenantId: tenant.id } });
    const admin = await prisma.user.create({ data: { email: `mkt-${stamp}@t.test`, firstName: "Ama", lastName: "Admin", passwordHash: "x", tenantId: tenant.id, roleId: role.id } });
    const c = (n, mail) => prisma.contact.create({ data: { tenantId: tenant.id, name: n, email: mail, key: `${n}-${stamp}` } });
    return {
      tenant, other, admin,
      ann: await c("Ann Lee", `ann@acme-${stamp}.test`), bob: await c("Bob", `bob@acme-${stamp}.test`), cy: await c("Cy", `cy@acme-${stamp}.test`),
      dee: await c("Dee", `dee@acme-${stamp}.test`), eve: await c("Eve", `eve@acme-${stamp}.test`), zed: await c("Zed", `zed@other-${stamp}.test`),
    };
  });
  const tenantId = ws.tenant.id;
  const inT = (fn) => runWithTenant({ tenantId, userId: ws.admin.id, role: "enterprise_admin" }, fn);
  t.after(() => runUnscoped(async () => {
    for (const id of [ws.tenant.id, ws.other.id]) {
      for (const m of ["marketingEvent", "marketingEmailDelivery", "marketingAudienceMember", "marketingConsent", "marketingSuppression", "marketingCampaign", "marketingAudience", "marketingSendingDomain", "marketingEmailSettings", "auditLog", "contact"]) {
        await prisma[m].deleteMany({ where: { tenantId: id } }).catch(() => {});
      }
      await prisma.user.deleteMany({ where: { tenantId: id } });
      await prisma.role.deleteMany({ where: { tenantId: id } });
      await prisma.tenant.delete({ where: { id } }).catch(() => {});
    }
  }));

  // Fake Resend.
  const sends = [];
  let domainStatus = "pending";
  const failFor = new Map(); // email → status code
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (!u.startsWith("https://api.resend.com")) return original(url, init);
    const json = (b, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });
    const path = new URL(u).pathname;
    if (path === "/domains" && init.method === "POST") return json({ id: "dom_1", status: "pending", records: [{ record: "SPF", type: "TXT", name: "send", value: "v=spf1 include:amazonses.com ~all" }, { record: "DKIM", type: "TXT", name: "resend._domainkey", value: "p=MIG..." }] });
    if (path === "/domains/dom_1/verify") return json({ object: "domain", id: "dom_1" });
    if (path === "/domains/dom_1") return json({ id: "dom_1", status: domainStatus, records: [] });
    if (path === "/emails") {
      const body = JSON.parse(init.body);
      const code = failFor.get(body.to[0]);
      if (code) return json({ message: code === 429 ? "Too many requests" : "Invalid `to` field" }, code);
      sends.push({ body, idempotencyKey: init.headers["Idempotency-Key"] });
      return json({ id: `em_${sends.length}_${stamp}` });
    }
    return json({}, 404);
  };
  t.after(() => { globalThis.fetch = original; });

  // Consent: ann, bob, eve subscribed (bob then suppressed); cy none; dee unsubscribed; zed subscribed but outside the audience.
  await inT(async () => {
    for (const c of [ws.ann, ws.bob, ws.eve, ws.zed]) await foundation.setConsent(tenantId, c.id, { status: "subscribed", source: "form", evidence: "Signup form" });
    await foundation.setConsent(tenantId, ws.dee.id, { status: "unsubscribed", source: "manual" });
    await foundation.suppress(tenantId, ws.bob.email, "manual");
  });

  let audience, campaign, domain;
  await t.test("audiences count real contacts from rules", async () => {
    audience = await inT(() => legacy.createAudience(tenantId, { name: "Acme people" }));
    await assert.rejects(inT(() => audiences.setDefinition(tenantId, audience.id, { definition: { op: "and", rules: [{ field: "shoe_size", cmp: "is", value: 9 }] } })), /Unsupported rule/);
    await inT(() => audiences.setDefinition(tenantId, audience.id, { definition: { op: "and", rules: [{ field: "email", cmp: "ends_with", value: `acme-${stamp}.test` }] } }));
    const p = await inT(() => audiences.preview(tenantId, audience.id));
    assert.equal(p.members, 5, "ann, bob, cy, dee, eve");
    assert.equal(p.sendable, 2, "only ann and eve: consented and not suppressed");
    await assert.rejects(inT(() => audiences.setDefinition(tenantId, audience.id, { definition: { op: "and", rules: [{ field: "audience", cmp: "member", value: audience.id }] } })), /itself/);
  });

  await t.test("a campaign won't send until every requirement is met", async () => {
    campaign = await inT(() => email.createEmailCampaign(tenantId, ws.admin.id, { name: "Launch", subject: "Hi {{first_name}}", htmlBody: "<p>Big news, {{name}}.</p>", fromLocalPart: "news", fromName: "Acme", audienceId: audience.id }));
    assert.equal(campaign.status, "draft");
    let r = await inT(() => email.readiness(tenantId, campaign.id));
    assert.ok(r.problems.some((p) => /sending domain/.test(p)));
    assert.ok(r.problems.some((p) => /postal address/.test(p)));
    await assert.rejects(inT(() => email.start(tenantId, campaign.id)), /sending domain/);

    domain = await inT(() => email.addDomain(tenantId, ws.admin.id, `mail.acme-${stamp}.test`));
    assert.equal(domain.status, "pending");
    assert.ok(domain.records.some((x) => x.record === "DKIM"));
    await inT(() => email.updateEmailCampaign(tenantId, campaign.id, { sendingDomainId: domain.id }));
    await inT(() => email.updateSettings(tenantId, { postalAddress: "1 Broad St, Monrovia, Liberia" }));
    r = await inT(() => email.readiness(tenantId, campaign.id));
    assert.deepEqual(r.problems, [`The sending domain mail.acme-${stamp}.test isn't verified yet.`]);
    domainStatus = "verified";
    domain = await inT(() => email.checkDomain(tenantId, domain.id));
    assert.equal(domain.status, "verified");
    r = await inT(() => email.readiness(tenantId, campaign.id));
    assert.equal(r.ready, true);
    assert.deepEqual(r.audience, { members: 5, sendable: 2 });
  });

  await t.test("a test goes only to workspace members, and isn't a delivery", async () => {
    const out = await inT(() => email.sendTest(tenantId, ws.admin.id, campaign.id));
    assert.equal(out.to, ws.admin.email);
    assert.match(sends.at(-1).body.subject, /^\[Test\] Hi Ama/);
    await assert.rejects(inT(() => email.sendTest(tenantId, ws.admin.id, campaign.id, { to: "stranger@elsewhere.test" })), /members of this workspace/);
    assert.equal(await runUnscoped(() => prisma.marketingEmailDelivery.count({ where: { campaignId: campaign.id } })), 0);
  });

  await t.test("starting queues only consented, unsuppressed recipients; the worker sends them", async () => {
    const before = sends.length;
    const started = await inT(() => email.start(tenantId, campaign.id));
    assert.deepEqual(started, { status: "running", queued: 2 });
    await assert.rejects(inT(() => email.updateEmailCampaign(tenantId, campaign.id, { subject: "changed" })), /can't be edited/);
    // Eve unsubscribes elsewhere before the worker reaches her.
    await inT(() => foundation.setConsent(tenantId, ws.eve.id, { status: "unsubscribed", source: "manual" }));
    const out = await worker.runEmailWorker();
    assert.equal(out.sent, 1);
    assert.equal(out.skipped, 1, "consent is re-checked at send time");
    const msg = sends.slice(before).find((s) => s.body.to[0] === ws.ann.email);
    assert.equal(msg.body.from, `"Acme" <news@mail.acme-${stamp}.test>`);
    assert.match(msg.body.headers["List-Unsubscribe"], /\/api\/public\/marketing\/unsubscribe\//);
    const annDelivery = await runUnscoped(() => prisma.marketingEmailDelivery.findFirst({ where: { campaignId: campaign.id, contactId: ws.ann.id } }));
    assert.equal(msg.idempotencyKey, annDelivery.id, "the provider dedupes retries by delivery id");
    assert.equal(annDelivery.status, "sent");
    assert.equal((await inT(() => email.getEmailCampaign(tenantId, campaign.id))).status, "completed");
  });

  await t.test("provider webhooks update deliveries; forged ones are refused", async () => {
    const server = app.listen(0);
    const base = `http://127.0.0.1:${server.address().port}/api/public/marketing`;
    t.after(() => server.close());
    const annDelivery = await runUnscoped(() => prisma.marketingEmailDelivery.findFirst({ where: { campaignId: campaign.id, contactId: ws.ann.id } }));
    const post = (evt, opts) => {
      const body = JSON.stringify(evt);
      return original(`${base}/email/events`, { method: "POST", headers: { "Content-Type": "application/json", ...svixHeaders(body, opts) }, body });
    };
    const ev = (type, extra = {}) => ({ type, created_at: new Date().toISOString(), data: { email_id: annDelivery.providerMessageId, ...extra } });

    assert.equal((await post(ev("email.delivered"))).status, 200);
    const fixedId = `msg_fixed_${stamp}`;
    assert.equal((await post(ev("email.clicked", { click: { link: "https://acme.test/launch" } }), { id: fixedId })).status, 200);
    assert.equal((await post(ev("email.clicked"), { id: fixedId })).status, 200, "a provider retry is accepted…");
    assert.equal(await runUnscoped(() => prisma.marketingEvent.count({ where: { tenantId, type: "email.clicked" } })), 1, "…and recorded once");
    const forged = await original(`${base}/email/events`, { method: "POST", headers: { "Content-Type": "application/json", "svix-id": "x", "svix-timestamp": String(Math.floor(Date.now() / 1000)), "svix-signature": "v1,AAAA" }, body: JSON.stringify(ev("email.complained")) });
    assert.equal(forged.status, 401);

    let d = await runUnscoped(() => prisma.marketingEmailDelivery.findFirst({ where: { id: annDelivery.id } }));
    assert.equal(d.status, "delivered");
    assert.ok(d.clickedAt && d.openedAt, "a click implies an open");
    const s = await inT(() => email.stats(tenantId, campaign.id));
    assert.deepEqual([s.recipients, s.delivered, s.clicked, s.skipped], [2, 1, 1, 1]);

    await post(ev("email.bounced", { bounce: { type: "Permanent", message: "Mailbox does not exist" } }));
    d = await runUnscoped(() => prisma.marketingEmailDelivery.findFirst({ where: { id: annDelivery.id } }));
    assert.equal(d.status, "bounced");
    assert.ok(await runUnscoped(() => prisma.marketingSuppression.findFirst({ where: { tenantId, email: ws.ann.email, reason: "hard_bounce" } })), "a hard bounce is suppressed");
    assert.equal((await runUnscoped(() => prisma.marketingConsent.findFirst({ where: { tenantId, contactId: ws.ann.id } }))).status, "bounced");

    // One-click unsubscribe (RFC 8058), no session.
    const u = await original(`${base}/unsubscribe/${unsubscribeToken(annDelivery.id)}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "List-Unsubscribe=One-Click" });
    assert.equal(u.status, 200);
    assert.equal((await runUnscoped(() => prisma.marketingConsent.findFirst({ where: { tenantId, contactId: ws.ann.id } }))).status, "unsubscribed");
    assert.equal((await original(`${base}/unsubscribe/forged.token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "" })).status, 400);
  });

  await t.test("temporary failures retry; permanent ones fail; scheduled campaigns start on time", async () => {
    // Fresh recipients for a second campaign.
    for (const c of [ws.cy, ws.dee]) await inT(() => foundation.setConsent(tenantId, c.id, { status: "subscribed", source: "form", evidence: "Signup" }));
    failFor.set(ws.cy.email, 429);
    failFor.set(ws.dee.email, 422);
    const second = await inT(() => email.duplicate(tenantId, ws.admin.id, campaign.id));
    assert.equal(second.status, "draft");
    await assert.rejects(inT(() => email.schedule(tenantId, second.id, new Date(Date.now() + 1000))), /at least a minute/);
    await inT(() => email.schedule(tenantId, second.id, new Date(Date.now() + 120_000)));
    await runUnscoped(() => prisma.marketingCampaign.update({ where: { id: second.id }, data: { scheduledAt: new Date(Date.now() - 1000) } }));
    const out = await worker.runEmailWorker();
    assert.equal(out.started, 1, "the worker started it — no browser involved");
    assert.equal(out.failed, 1);
    assert.equal(out.retried, 1);
    const cy = await runUnscoped(() => prisma.marketingEmailDelivery.findFirst({ where: { campaignId: second.id, contactId: ws.cy.id } }));
    assert.equal(cy.status, "queued");
    assert.ok(cy.nextAttemptAt > new Date(), "retried later, with backoff");
    assert.equal((await inT(() => email.getEmailCampaign(tenantId, second.id))).status, "running", "not complete while a retry is pending");
    assert.deepEqual(await inT(() => email.pause(tenantId, second.id)), { status: "paused" });
    const cancelled = await inT(() => email.cancel(tenantId, second.id));
    assert.equal(cancelled.skipped, 1);
  });

  await t.test("old shortcuts that only flipped a status now refuse", async () => {
    await assert.rejects(inT(() => legacy.startCampaign(tenantId, campaign.id)), /Email Studio/);
    await assert.rejects(inT(() => legacy.activateAudience(tenantId, audience.id)), /destination/);
    await assert.rejects(inT(() => legacy.createLookalikeAudience(tenantId, audience.id)), /advertising platform/);
  });

  await t.test("another organization can't see or touch the campaign", async () => {
    await assert.rejects(runWithTenant({ tenantId: ws.other.id }, () => email.stats(ws.other.id, campaign.id)), /not found/);
    await assert.rejects(runWithTenant({ tenantId: ws.other.id }, () => email.start(ws.other.id, campaign.id)), /not found/);
  });
});
