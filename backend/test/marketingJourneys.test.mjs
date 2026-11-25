/**
 * Journey Builder and Automation Studio, end to end: definitions are validated
 * (no loops, no dangling steps, no private-network webhooks), publishing
 * freezes versions, the engine moves real contacts through real steps with
 * persistent waits, duplicate prevention, retries and exactly-once steps.
 *
 * The database, the claim query (FOR UPDATE SKIP LOCKED) and the email queue
 * are real; only the outbound webhook transport is faked.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { validate } from "../src/modules/marketing/journeys/definition.js";
import { isPublicAddress, checkWebhookUrl, guardedLookup } from "../src/lib/safeHttp.js";

const HAS_DB = !!process.env.DATABASE_URL;
process.env.MARKETING_RESEND_API_KEY ??= "re_test";

const n = (type, extra = {}) => ({ type, ...extra });

test("journey definitions: loops, dangling steps and half-built graphs are refused", () => {
  const ok = validate({ trigger: { type: "manual" }, entry: "a", nodes: { a: n("wait", { amount: 1, unit: "days", next: "b" }), b: n("split", { percent: 50, a: null, b: null }) } }, { strict: true });
  assert.equal(ok.entry, "a");
  assert.equal(ok.reentry, "never", "admit once unless told otherwise");
  assert.throws(() => validate({ trigger: { type: "manual" }, entry: "a", nodes: { a: n("wait", { amount: 1, unit: "days", next: "b" }), b: n("wait", { amount: 1, unit: "days", next: "a" }) } }), /loop back/);
  assert.throws(() => validate({ trigger: { type: "manual" }, entry: "a", nodes: { a: n("wait", { amount: 1, unit: "days", next: "a" }) } }), /itself/);
  assert.throws(() => validate({ trigger: { type: "manual" }, entry: "a", nodes: { a: n("wait", { amount: 1, unit: "days", next: "nope" }) } }), /doesn't exist/);
  assert.throws(() => validate({ trigger: { type: "manual" }, entry: "a", nodes: { a: n("wait", { amount: 1, unit: "days", next: null }), lost: n("wait", { amount: 1, unit: "days", next: null }) } }, { strict: true }), /can't be reached/);
  assert.throws(() => validate({ trigger: { type: "manual" }, entry: null, nodes: {} }, { strict: true }), /first step/);
  assert.doesNotThrow(() => validate({ trigger: { type: "manual" }, entry: null, nodes: {} }), "a draft may be empty");
  assert.throws(() => validate({ trigger: { type: "manual" }, entry: "a", nodes: { a: n("run_script", { code: "rm -rf /" }) } }), /unknown step type/);
  assert.throws(() => validate({ trigger: { type: "event", event: "anything.i.like" }, nodes: {} }), /Unknown trigger event/);
  assert.throws(() => validate({ trigger: { type: "audience", every: "day" }, nodes: {} }, { strict: true }), /Choose the audience/);
  assert.throws(() => validate({ trigger: { type: "manual" }, entry: "a", nodes: { a: n("wait", { amount: 0, unit: "days" }) } }), /whole number/);
});

test("webhook URLs can't reach this server's network", () => {
  for (const ip of ["127.0.0.1", "10.0.0.5", "172.16.3.4", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "224.0.0.1"]) {
    assert.equal(isPublicAddress(ip), false, ip);
  }
  for (const ip of ["93.184.216.34", "1.1.1.1", "2606:4700:4700::1111"]) assert.equal(isPublicAddress(ip), true, ip);
  assert.throws(() => checkWebhookUrl("http://hooks.example.com/x"), /https/);
  assert.throws(() => checkWebhookUrl("https://169.254.169.254/latest/meta-data"), /private/);
  assert.throws(() => checkWebhookUrl("https://[::1]/x"), /private/);
  assert.throws(() => checkWebhookUrl("https://localhost/x"), /private/);
  assert.throws(() => checkWebhookUrl("https://u:p@hooks.example.com/x"), /credentials/);
  assert.throws(() => checkWebhookUrl("https://hooks.example.com:6379/x"), /port/);
  assert.equal(checkWebhookUrl("https://hooks.example.com/x").hostname, "hooks.example.com");
  assert.throws(() => validate({ trigger: { type: "manual" }, entry: "a", nodes: { a: n("webhook", { url: "https://10.1.2.3/hook" }) } }), /private/);
});

test("the socket's own DNS lookup refuses names that resolve to private addresses", async () => {
  const e = await new Promise((resolve) => guardedLookup("localhost", {}, (err) => resolve(err)));
  assert.ok(e, "localhost resolves to loopback and is refused");
  assert.match(e.message, /private/);
});

test("journeys end to end", { skip: !HAS_DB && "DATABASE_URL not set" }, async (t) => {
  const { default: prisma } = await import("../src/config/database.js");
  const { runUnscoped, runWithTenant } = await import("../src/lib/tenantContext.js");
  const svc = await import("../src/modules/marketing/journeys/journeys.service.js");
  const engine = await import("../src/modules/marketing/journeys/engine.js");
  const email = await import("../src/modules/marketing/email/email.service.js");
  const foundation = await import("../src/modules/marketing/foundation.js");

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const ws = await runUnscoped(async () => {
    const mkT = (x) => prisma.tenant.create({ data: { name: `Jrn ${x} ${stamp}`, slug: `jrn-${x}-${stamp}`, code: `JR${x}${stamp}`.slice(0, 12), plan: "executive" } });
    const tenant = await mkT("a"), other = await mkT("b");
    const role = await prisma.role.create({ data: { name: "enterprise_admin", tenantId: tenant.id } });
    const admin = await prisma.user.create({ data: { email: `jrn-${stamp}@t.test`, firstName: "Ama", lastName: "Admin", passwordHash: "x", tenantId: tenant.id, roleId: role.id } });
    const c = (nm, mail, tid = tenant.id) => prisma.contact.create({ data: { tenantId: tid, name: nm, email: mail, key: `${nm}-${stamp}-${tid.slice(0, 4)}` } });
    const out = {
      tenant, other, admin,
      ann: await c("Ann Lee", `ann@acme-${stamp}.test`), bob: await c("Bob Ray", `bob@beta-${stamp}.test`),
      cy: await c("Cy", `cy@acme-${stamp}.test`), dee: await c("Dee", `dee@acme-${stamp}.test`),
      foreign: await c("Xi", `xi@other-${stamp}.test`, other.id),
    };
    out.domain = await prisma.marketingSendingDomain.create({ data: { tenantId: tenant.id, domain: `mail.acme-${stamp}.test`, provider: "resend", providerDomainId: `d_${stamp}`, status: "verified", records: [], verifiedAt: new Date() } });
    await prisma.marketingEmailSettings.create({ data: { tenantId: tenant.id, postalAddress: "1 Broad St, Monrovia" } });
    out.foreignCampaign = await prisma.marketingCampaign.create({ data: { tenantId: other.id, name: "Theirs", channel: "email", mode: "triggered", status: "active" } });
    return out;
  });
  const tenantId = ws.tenant.id;
  const inT = (fn) => runWithTenant({ tenantId, userId: ws.admin.id, role: "enterprise_admin" }, fn);
  t.after(() => runUnscoped(async () => {
    for (const id of [ws.tenant.id, ws.other.id]) {
      for (const m of ["marketingJourneyStep", "marketingJourneyEnrollment", "marketingJourneyVersion", "marketingJourney", "marketingEvent", "marketingEmailDelivery", "marketingAudienceMember", "marketingConsent", "marketingSuppression", "marketingCampaign", "marketingAudience", "marketingSendingDomain", "marketingEmailSettings", "notification", "crmTask", "auditLog", "contact"]) {
        await prisma[m].deleteMany({ where: { tenantId: id } }).catch(() => {});
      }
      await prisma.user.deleteMany({ where: { tenantId: id } });
      await prisma.role.deleteMany({ where: { tenantId: id } });
      await prisma.tenant.delete({ where: { id } }).catch(() => {});
    }
  }));

  // Consent: Ann, Cy and Dee subscribed; Bob unsubscribed.
  await inT(async () => {
    for (const c of [ws.ann, ws.cy, ws.dee]) await foundation.setConsent(tenantId, c.id, { status: "subscribed", source: "form", evidence: "signup" });
    await foundation.setConsent(tenantId, ws.bob.id, { status: "unsubscribed", source: "manual" });
  });
  const vip = await inT(() => prisma.marketingAudience.create({ data: { tenantId, name: "Engaged", kind: "static", size: 0 } }));

  // Webhook calls go to a fake transport.
  const hooks = [];
  let hookFails = 0;
  const realTransport = engine.transport.postJson;
  engine.transport.postJson = async (url, body, opts) => {
    if (hookFails > 0) { hookFails -= 1; throw Object.assign(new Error("connect ETIMEDOUT"), { transient: true }); }
    hooks.push({ url, body, opts });
    return { status: 200, body: "ok" };
  };
  t.after(() => { engine.transport.postJson = realTransport; });

  const due = (journeyId) => runUnscoped(() => prisma.marketingJourneyEnrollment.updateMany({ where: { journeyId, status: { in: ["active", "waiting"] } }, data: { waitUntil: new Date(Date.now() - 1000) } }));
  const enr = (journeyId, contactId) => runUnscoped(() => prisma.marketingJourneyEnrollment.findFirst({ where: { journeyId, contactId }, orderBy: { enteredAt: "desc" } }));

  let welcome, journey;
  await t.test("a journey email must be active, and publishing checks every reference", async () => {
    welcome = await inT(() => email.createEmailCampaign(tenantId, ws.admin.id, { name: "Welcome", mode: "triggered", subject: "Welcome {{first_name}}", htmlBody: "<p>Hi</p>", fromLocalPart: "hello", sendingDomainId: ws.domain.id }));
    assert.equal(welcome.mode, "triggered");
    await assert.rejects(inT(() => email.start(tenantId, welcome.id)), /not started/);

    journey = await inT(() => svc.create(tenantId, ws.admin.id, { name: "Onboarding" }));
    const draft = {
      trigger: { type: "manual" }, entry: "send", reentry: "never",
      nodes: {
        send: n("send_email", { campaignId: welcome.id, next: "isAcme" }),
        isAcme: n("condition", { rules: { op: "and", rules: [{ field: "email", cmp: "contains", value: "@acme-" }] }, yes: "task", no: "hook" }),
        task: n("create_task", { title: "Call {{first_name}}", taskType: "call", assigneeId: ws.admin.id, dueInDays: 2, next: "pause" }),
        hook: n("webhook", { url: "https://hooks.example.com/journey", next: "pause" }),
        pause: n("wait", { amount: 2, unit: "days", next: "tag" }),
        tag: n("add_to_audience", { audienceId: vip.id, next: null }),
      },
    };
    await inT(() => svc.updateDraft(tenantId, journey.id, { draft }));
    const chk = await inT(() => svc.check(tenantId, journey.id));
    assert.equal(chk.ready, false);
    assert.match(chk.problems.join(" "), /activate the journey email/);
    await assert.rejects(inT(() => svc.publish(tenantId, ws.admin.id, journey.id)), /activate/);

    await inT(() => email.activate(tenantId, welcome.id));
    const pub = await inT(() => svc.publish(tenantId, ws.admin.id, journey.id, { note: "first" }));
    assert.equal(pub.status, "active");
    assert.equal(pub.version, 1);

    // Another tenant's email can't be referenced.
    const j2 = await inT(() => svc.create(tenantId, ws.admin.id, { name: "Sneaky" }));
    await inT(() => svc.updateDraft(tenantId, j2.id, { draft: { trigger: { type: "manual" }, entry: "a", nodes: { a: n("send_email", { campaignId: ws.foreignCampaign.id, next: null }) } } }));
    await assert.rejects(inT(() => svc.publish(tenantId, ws.admin.id, j2.id)), /no longer exists/);
    // The editor's dropdowns list only this tenant's things.
    const pk = await inT(() => svc.pickers(tenantId));
    assert.deepEqual(pk.emails.map((e) => e.name), ["Welcome"]);
    assert.ok(pk.members.some((m) => m.id === ws.admin.id));
    const found = await inT(() => svc.searchContacts(tenantId, "xi@other"));
    assert.equal(found.length, 0, "contact search can't see another tenant");
    // …and this tenant's journeys aren't visible from the other one.
    await assert.rejects(runWithTenant({ tenantId: ws.other.id }, () => svc.get(ws.other.id, journey.id)), /not found/);
  });

  await t.test("testing a journey shows the path without doing anything", async () => {
    const before = await runUnscoped(() => prisma.crmTask.count({ where: { tenantId } }));
    const sim = await inT(() => svc.simulate(tenantId, journey.id, { contactId: ws.bob.id }));
    assert.deepEqual(sim.path.map((s) => s.nodeId), ["send", "isAcme", "hook", "pause", "tag"]);
    assert.match(sim.path[0].note, /no email consent/);
    const simAnn = await inT(() => svc.simulate(tenantId, journey.id, { contactId: ws.ann.id }));
    assert.equal(simAnn.path[2].nodeId, "task");
    assert.equal(await runUnscoped(() => prisma.crmTask.count({ where: { tenantId } })), before, "a simulation creates nothing");
    assert.equal(hooks.length, 0);
    await assert.rejects(inT(() => svc.simulate(tenantId, journey.id, { contactId: ws.foreign.id })), /Choose a contact/);
  });

  await t.test("the engine moves contacts through real steps, and waits survive between passes", async () => {
    // Paused, a journey email still queues — it sends when resumed. (Paused here
    // also keeps other suites' email workers from sending it mid-test.)
    await inT(() => email.pause(tenantId, welcome.id));
    const r = await inT(() => svc.enrollContacts(tenantId, ws.admin.id, journey.id, [ws.ann.id, ws.bob.id, ws.ann.id, ws.foreign.id]));
    assert.equal(r.enrolled, 2, "duplicates and other tenants' contacts are dropped");
    const again = await inT(() => svc.enrollContacts(tenantId, ws.admin.id, journey.id, [ws.ann.id]));
    assert.equal(again.enrolled, 0, "one live trip per contact");

    await engine.runJourneyWorker();
    const ann = await enr(journey.id, ws.ann.id), bob = await enr(journey.id, ws.bob.id);
    assert.equal(ann.status, "waiting");
    assert.equal(ann.nodeId, "pause");
    assert.ok(ann.waitUntil > new Date(Date.now() + 47 * 3_600_000), "a two-day wait is stored, not slept");
    const deliveries = await runUnscoped(() => prisma.marketingEmailDelivery.findMany({ where: { campaignId: welcome.id } }));
    assert.equal(deliveries.length, 1, "only the consented contact is queued for the email worker");
    assert.equal(deliveries[0].contactId, ws.ann.id);
    assert.equal(deliveries[0].sendKey, `${ann.id}:0`);
    assert.equal(deliveries[0].status, "queued");
    const annHist = await inT(() => svc.history(tenantId, journey.id, ann.id));
    assert.match(annHist[0].detail.note, /paused/);
    const tasks = await runUnscoped(() => prisma.crmTask.findMany({ where: { tenantId } }));
    assert.deepEqual(tasks.map((x) => x.title), ["Call Ann"]);
    assert.equal(hooks.length, 1, "Bob's branch called the webhook");
    assert.equal(hooks[0].body.contact.id, ws.bob.id);
    assert.equal(hooks[0].opts.headers["Idempotency-Key"], `${bob.id}:2`);
    const hist = await inT(() => svc.history(tenantId, journey.id, bob.id));
    assert.deepEqual(hist.map((h) => [h.nodeId, h.outcome]), [["send", "skipped"], ["isAcme", "done"], ["hook", "done"], ["pause", "started"]]);

    // Nothing moves before the wait is over.
    await engine.runJourneyWorker();
    assert.equal((await enr(journey.id, ws.ann.id)).nodeId, "pause");

    await due(journey.id);
    await engine.runJourneyWorker();
    const done = await enr(journey.id, ws.ann.id);
    assert.equal(done.status, "completed");
    assert.equal(done.activeKey, null);
    assert.equal(await runUnscoped(() => prisma.marketingAudienceMember.count({ where: { audienceId: vip.id } })), 2);
    const st = await inT(() => svc.stats(tenantId, journey.id));
    assert.equal(st.completed, 2);
    assert.equal(st.nodes.send.skipped, 1);
    assert.equal(st.nodes.send.done, 1);

    const back = await inT(() => svc.enrollContacts(tenantId, ws.admin.id, journey.id, [ws.ann.id]));
    assert.equal(back.enrolled, 0, "a once-only journey doesn't readmit anyone");
  });

  await t.test("publishing again creates a new version; people inside stay on theirs", async () => {
    const j = await inT(() => svc.create(tenantId, ws.admin.id, { name: "Versioned" }));
    const v1 = { trigger: { type: "manual" }, entry: "w", reentry: "after_finish", nodes: { w: n("wait", { amount: 1, unit: "hours", next: "t1" }), t1: n("create_task", { title: "v1 {{name}}", assigneeId: ws.admin.id, next: null }) } };
    await inT(() => svc.updateDraft(tenantId, j.id, { draft: v1 }));
    await inT(() => svc.publish(tenantId, ws.admin.id, j.id));
    await inT(() => svc.enrollContacts(tenantId, ws.admin.id, j.id, [ws.cy.id]));
    assert.equal((await inT(() => svc.enrollContacts(tenantId, ws.admin.id, j.id, [ws.cy.id]))).enrolled, 0, "even a re-entry journey holds one live trip per contact");
    await engine.runJourneyWorker();

    const v2 = { ...v1, nodes: { w: v1.nodes.w, t2: n("create_task", { title: "v2 {{name}}", assigneeId: ws.admin.id, next: null }) } };
    v2.nodes.w = { ...v1.nodes.w, next: "t2" };
    await inT(() => svc.updateDraft(tenantId, j.id, { draft: v2 }));
    const pub = await inT(() => svc.publish(tenantId, ws.admin.id, j.id, { note: "new task" }));
    assert.equal(pub.version, 2);
    assert.equal(pub.versions.length, 2);
    await inT(() => svc.enrollContacts(tenantId, ws.admin.id, j.id, [ws.dee.id]));
    await engine.runJourneyWorker();
    await due(j.id);
    await engine.runJourneyWorker();
    const titles = (await runUnscoped(() => prisma.crmTask.findMany({ where: { tenantId, title: { startsWith: "v" } } }))).map((x) => x.title).sort();
    assert.deepEqual(titles, ["v1 Cy", "v2 Dee"]);
    const again = await inT(() => svc.enrollContacts(tenantId, ws.admin.id, j.id, [ws.cy.id]));
    assert.equal(again.enrolled, 1, "an after-finish journey readmits people who've finished");
  });

  await t.test("a step that already finished isn't repeated after a crash", async () => {
    const j = await inT(() => svc.create(tenantId, ws.admin.id, { name: "Crashy" }));
    await inT(() => svc.updateDraft(tenantId, j.id, { draft: { trigger: { type: "manual" }, entry: "t", nodes: { t: n("create_task", { title: "Once only", assigneeId: ws.admin.id, next: null }) } } }));
    await inT(() => svc.publish(tenantId, ws.admin.id, j.id));
    await inT(() => svc.enrollContacts(tenantId, ws.admin.id, j.id, [ws.ann.id]));
    const e = await enr(j.id, ws.ann.id);
    // Simulate: the task was created and the step marked done, then the instance died before moving on.
    await inT(() => prisma.marketingJourneyStep.create({ data: { tenantId, journeyId: j.id, enrollmentId: e.id, seq: 0, nodeId: "t", type: "create_task", outcome: "done", detail: { __next: null } } }));
    await engine.runJourneyWorker();
    assert.equal((await enr(j.id, ws.ann.id)).status, "completed");
    assert.equal(await runUnscoped(() => prisma.crmTask.count({ where: { tenantId, title: "Once only" } })), 0, "the finished step wasn't run again");
  });

  await t.test("temporary failures retry with backoff; then the trip fails with the reason", async () => {
    const j = await inT(() => svc.create(tenantId, ws.admin.id, { name: "Flaky hook" }));
    await inT(() => svc.updateDraft(tenantId, j.id, { draft: { trigger: { type: "manual" }, entry: "h", reentry: "after_finish", nodes: { h: n("webhook", { url: "https://hooks.example.com/flaky", next: null }) } } }));
    await inT(() => svc.publish(tenantId, ws.admin.id, j.id));
    await inT(() => svc.enrollContacts(tenantId, ws.admin.id, j.id, [ws.cy.id]));
    hookFails = 1;
    await engine.runJourneyWorker();
    let e = await enr(j.id, ws.cy.id);
    assert.equal(e.status, "active");
    assert.equal(e.attempts, 1);
    assert.ok(e.waitUntil > new Date(), "retry is scheduled, not immediate");
    await due(j.id);
    await engine.runJourneyWorker();
    e = await enr(j.id, ws.cy.id);
    assert.equal(e.status, "completed", "the retry succeeded");

    await inT(() => svc.enrollContacts(tenantId, ws.admin.id, j.id, [ws.cy.id]));
    hookFails = 99;
    for (let i = 0; i < 5; i++) { await due(j.id); await engine.runJourneyWorker(); }
    e = await enr(j.id, ws.cy.id);
    assert.equal(e.status, "failed");
    assert.match(e.lastError, /ETIMEDOUT/);
    assert.equal(e.activeKey, null, "a failed trip frees the contact to enter again");
    hookFails = 0;
  });

  await t.test("event triggers, waiting for an event, goals and exits", async () => {
    // The event bus reaches listeners.
    const seen = [];
    const off = foundation.onMarketingEvent((evt) => seen.push(evt.type));
    await inT(() => foundation.recordEvent({ tenantId, type: "email.opened", contactId: ws.dee.id, source: "test" }));
    off();
    assert.deepEqual(seen, ["email.opened"]);

    const j = await inT(() => svc.create(tenantId, ws.admin.id, { name: "Clicked" }));
    await inT(() => svc.updateDraft(tenantId, j.id, { draft: {
      trigger: { type: "event", event: "email.clicked" }, entry: "w",
      exit: { op: "and", rules: [{ field: "consent", cmp: "is", value: "unsubscribed" }] },
      nodes: {
        w: n("wait_for_event", { event: "email.opened", days: 3, next: "yes", timeout: "no" }),
        yes: n("create_task", { title: "Opened: {{name}}", assigneeId: ws.admin.id, next: null }),
        no: n("create_task", { title: "No open: {{name}}", assigneeId: ws.admin.id, next: null }),
      },
    } }));
    await inT(() => svc.publish(tenantId, ws.admin.id, j.id));

    const click = await inT(() => foundation.recordEvent({ tenantId, type: "email.clicked", contactId: ws.ann.id, source: "test" }));
    assert.equal(await engine.onEvent(click), 1, "the click enrolls the contact");
    assert.equal(await engine.onEvent(click), 0, "the same contact isn't enrolled twice");
    await engine.runJourneyWorker();
    let e = await enr(j.id, ws.ann.id);
    assert.equal([e.status, e.waitEvent].join(), "waiting,email.opened");

    const open = await inT(() => foundation.recordEvent({ tenantId, type: "email.opened", contactId: ws.ann.id, source: "test" }));
    await engine.onEvent(open);
    await engine.runJourneyWorker();
    e = await enr(j.id, ws.ann.id);
    assert.equal(e.status, "completed");
    assert.equal(await runUnscoped(() => prisma.crmTask.count({ where: { tenantId, title: "Opened: Ann Lee" } })), 1);

    // Timeout branch.
    await engine.onEvent(await inT(() => foundation.recordEvent({ tenantId, type: "email.clicked", contactId: ws.cy.id, source: "test" })));
    await engine.runJourneyWorker();
    await due(j.id);
    await engine.runJourneyWorker();
    assert.equal(await runUnscoped(() => prisma.crmTask.count({ where: { tenantId, title: "No open: Cy" } })), 1);

    // Exit rule: Dee unsubscribes while waiting, and leaves.
    await engine.onEvent(await inT(() => foundation.recordEvent({ tenantId, type: "email.clicked", contactId: ws.dee.id, source: "test" })));
    await engine.runJourneyWorker();
    await inT(() => foundation.setConsent(tenantId, ws.dee.id, { status: "unsubscribed", source: "unsubscribe_link" }));
    await due(j.id);
    await engine.runJourneyWorker();
    e = await enr(j.id, ws.dee.id);
    assert.equal([e.status, e.exitReason].join(), "exited,exit_rule");
  });

  await t.test("scheduled automations enroll an audience once per run, and record each run", async () => {
    const a = await inT(() => prisma.marketingAudience.create({ data: { tenantId, name: "Acme", kind: "dynamic", size: 0, definition: { op: "and", rules: [{ field: "email", cmp: "contains", value: "@acme-" }] } } }));
    const j = await inT(() => svc.create(tenantId, ws.admin.id, { name: "Daily acme", kind: "automation" }));
    assert.equal(j.draft.trigger.type, "audience");
    await inT(() => svc.updateDraft(tenantId, j.id, { draft: { trigger: { type: "audience", audienceId: a.id, every: "day" }, entry: "w", nodes: { w: n("wait", { amount: 1, unit: "days", next: null }) } } }));
    await inT(() => svc.publish(tenantId, ws.admin.id, j.id));
    const first = await engine.runScheduled(new Date(Date.now() + 1000));
    assert.equal(first, 3, "Ann, Cy and Dee match the audience");
    assert.equal(await engine.runScheduled(new Date(Date.now() + 2000)), 0, "the next run isn't due for a day");
    const st = await inT(() => svc.stats(tenantId, j.id));
    assert.equal(st.runs.length, 1);
    assert.equal(st.runs[0].enrolled, 3);
    assert.equal(st.inside, 3);

    // Pausing holds everyone; archiving removes them.
    await inT(() => svc.pause(tenantId, ws.admin.id, j.id));
    await due(j.id);
    await engine.runJourneyWorker();
    assert.equal((await enr(j.id, ws.ann.id)).status, "active", "a paused journey moves nobody");
    const arch = await inT(() => svc.archive(tenantId, ws.admin.id, j.id));
    assert.equal(arch.removed, 3);
    assert.ok(await runUnscoped(() => prisma.auditLog.findFirst({ where: { tenantId, action: "marketing.journey.published" } })), "publishing is audited");
  });
});
