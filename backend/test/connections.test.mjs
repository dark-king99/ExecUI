/**
 * Connected accounts: the OAuth handshake, token handling, and what a sync
 * does with mail and calendar data.
 *
 * Google and Microsoft are replaced by a fake `fetch` that answers the same
 * URLs with the same JSON shapes their APIs return. Everything else is real —
 * the database, the encryption, the help desk, the CRM tables.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { parseAddresses, getProvider, providerList } from "../src/modules/connections/providers.js";
import { skipReason, stripQuoted } from "../src/modules/connections/sync.service.js";
import { mailboxTools } from "../src/modules/assistant/assistant.mailbox.js";

const HAS_DB = !!process.env.DATABASE_URL;

function withGoogleEnv(fn) {
  const saved = { id: process.env.GOOGLE_CLIENT_ID, secret: process.env.GOOGLE_CLIENT_SECRET };
  process.env.GOOGLE_CLIENT_ID = "test-client";
  process.env.GOOGLE_CLIENT_SECRET = "test-secret";
  const restore = () => {
    if (saved.id === undefined) delete process.env.GOOGLE_CLIENT_ID; else process.env.GOOGLE_CLIENT_ID = saved.id;
    if (saved.secret === undefined) delete process.env.GOOGLE_CLIENT_SECRET; else process.env.GOOGLE_CLIENT_SECRET = saved.secret;
  };
  return Promise.resolve().then(fn).finally(restore);
}

/** Route fake fetch calls by URL. Each handler returns [status, json]. */
function fakeFetch(routes) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const hit = routes.find(([match]) => (typeof match === "string" ? String(url).startsWith(match) : match.test(String(url))));
    if (!hit) throw new Error(`unexpected fetch ${url}`);
    const [status, body] = await hit[1](String(url), init);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  };
  return { calls, restore: () => { globalThis.fetch = original; } };
}

const b64url = (s) => Buffer.from(s).toString("base64url");

// ── Pure pieces ──────────────────────────────────────────────────────────────
test("addresses are parsed out of display-name headers", () => {
  assert.deepEqual(parseAddresses('"Doe, Ann" <Ann@Acme.com>, bob@x.io, not-an-address'), ["ann@acme.com", "bob@x.io"]);
  assert.deepEqual(parseAddresses(null), []);
});

test("a provider with no credentials is reported as not set up", () => {
  const saved = process.env.MICROSOFT_CLIENT_ID;
  delete process.env.MICROSOFT_CLIENT_ID;
  try {
    assert.equal(providerList().find((p) => p.id === "microsoft").configured, false);
  } finally {
    if (saved !== undefined) process.env.MICROSOFT_CLIENT_ID = saved;
  }
});

test("Google sign-in asks for offline, read-only access with PKCE", () => withGoogleEnv(() => {
  const url = new URL(getProvider("google").authorizeUrl({ redirectUri: "https://app.test/cb", state: "s1", codeChallenge: "c1" }));
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("access_type"), "offline");
  assert.equal(url.searchParams.get("state"), "s1");
  const scopes = url.searchParams.get("scope").split(" ");
  assert.ok(scopes.every((s) => !/gmail\.(send|modify|compose)|auth\/calendar$/.test(s)), "only read-only scopes");
}));

test("robots, bounces and the inbox itself never become tickets", () => {
  const base = { from: "ann@acme.com", headers: {} };
  assert.equal(skipReason(base, "support@us.com"), null);
  assert.match(skipReason({ ...base, from: "support@us.com" }, "support@us.com"), /itself/);
  assert.match(skipReason({ ...base, from: "mailer-daemon@googlemail.com" }, "support@us.com"), /bounce/);
  assert.match(skipReason({ ...base, from: "no-reply@shop.com" }, "support@us.com"), /no-reply/);
  assert.match(skipReason({ ...base, headers: { "auto-submitted": "auto-replied" } }, "support@us.com"), /auto-reply/);
  assert.match(skipReason({ ...base, headers: { precedence: "bulk" } }, "support@us.com"), /bulk/);
});

test("quoted history is dropped from a reply", () => {
  const text = "Still broken, sorry.\n\nOn Tue, 3 Nov 2026 at 10:00, Support <support@us.com> wrote:\n> We fixed it\n> Thanks";
  assert.equal(stripQuoted(text), "Still broken, sorry.");
});

test("ExecAI gets mailbox tools only when the person has connected one", () => {
  assert.deepEqual(mailboxTools(null), []);
  const names = mailboxTools({ provider: "google", accountEmail: "me@x.io" }).map((t) => t.function.name);
  assert.deepEqual(names, ["search_my_email", "list_my_calendar"]);
});

// ── Against the database ─────────────────────────────────────────────────────
test("connected accounts end to end", { skip: !HAS_DB && "DATABASE_URL not set" }, async (t) => {
  const { default: prisma } = await import("../src/config/database.js");
  const { runUnscoped, runWithTenant } = await import("../src/lib/tenantContext.js");
  const svc = await import("../src/modules/connections/connections.service.js");
  const { syncConnection } = await import("../src/modules/connections/sync.service.js");
  const { runMailboxTool } = await import("../src/modules/assistant/assistant.mailbox.js");
  const { getAccountTimeline } = await import("../src/modules/crm/crm.service.js");

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const ws = await runUnscoped(async () => {
    const tenant = await prisma.tenant.create({ data: { name: `Conn ${stamp}`, slug: `conn-${stamp}`, code: `CN${stamp}`.slice(0, 12), plan: "executive" } });
    const adminRole = await prisma.role.create({ data: { name: "enterprise_admin", tenantId: tenant.id } });
    const empRole = await prisma.role.create({ data: { name: "employee", tenantId: tenant.id } });
    const mk = (n, roleId) => prisma.user.create({ data: { email: `conn-${n}-${stamp}@t.test`, firstName: n, lastName: "T", passwordHash: "x", tenantId: tenant.id, roleId } });
    const contact = await prisma.contact.create({ data: { tenantId: tenant.id, name: "Acme Corp", email: "buyer@acme.test", key: `acme-${stamp}` } });
    return { tenant, admin: await mk("admin", adminRole.id), emp: await mk("emp", empRole.id), other: await mk("other", empRole.id), contact };
  });
  const tenantId = ws.tenant.id;
  const as = (u, role) => ({ tenantId, userId: u.id, role });
  const inTenant = (fn) => runWithTenant({ tenantId }, fn);

  t.after(async () => {
    await runUnscoped(async () => {
      for (const m of ["supportEmail", "mailActivity", "oAuthConnection", "oAuthRequest", "ticketMessage", "crmTicket", "crmFollowUp", "notification", "auditLog", "contact"]) {
        await prisma[m].deleteMany({ where: { tenantId } }).catch(() => {});
      }
      await prisma.user.deleteMany({ where: { tenantId } });
      await prisma.role.deleteMany({ where: { tenantId } });
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    });
  });

  /** Run the whole connect handshake as `actor` with a fake Google. */
  const connect = (actor, { email, purpose = "personal", tokens = {} } = {}) => withGoogleEnv(async () => {
    const { url } = await inTenant(() => svc.startConnect(actor, "google", purpose));
    const state = new URL(url).searchParams.get("state");
    const fake = fakeFetch([
      ["https://oauth2.googleapis.com/token", () => [200, { access_token: "ya29.ACCESS", refresh_token: "1//REFRESH", expires_in: 3600, scope: "openid email", ...tokens }]],
      ["https://openidconnect.googleapis.com/v1/userinfo", () => [200, { email }]],
    ]);
    try {
      return { state, ...(await svc.completeConnect("google", { code: "auth-code", state })) };
    } finally { fake.restore(); }
  });

  let personal;
  await t.test("connecting stores encrypted tokens and never returns them", async () => {
    const { connection, state } = await connect(as(ws.emp, "employee"), { email: "Me@Gmail.test" });
    personal = connection;
    assert.equal(connection.accountEmail, "me@gmail.test");
    assert.equal(connection.status, "active");
    assert.ok(!JSON.stringify(connection).includes("ACCESS") && !JSON.stringify(connection).includes("REFRESH"), "no token in the response shape");
    assert.deepEqual(Object.keys(connection).filter((k) => /cipher|token|iv$|tag$|scope/i.test(k)), [], "not even the ciphertext leaves the server");
    const row = await runUnscoped(() => prisma.oAuthConnection.findFirst({ where: { id: connection.id } }));
    assert.notEqual(row.accessCipher, "ya29.ACCESS");
    assert.ok(!JSON.stringify(row).includes("ya29.ACCESS"), "token is ciphertext at rest");

    // The same state can't be used twice.
    await assert.rejects(withGoogleEnv(() => svc.completeConnect("google", { code: "again", state })), /already used/);
  });

  await t.test("a forged, expired or mismatched state connects nothing", async () => {
    await assert.rejects(svc.completeConnect("google", { code: "x", state: "00000000-0000-0000-0000-000000000000" }), /isn't valid/);
    const { url } = await withGoogleEnv(() => inTenant(() => svc.startConnect(as(ws.emp, "employee"), "google")));
    const state = new URL(url).searchParams.get("state");
    await assert.rejects(svc.completeConnect("microsoft", { code: "x", state }), /isn't valid/, "a Google state can't finish a Microsoft connect");
    const { url: url2 } = await withGoogleEnv(() => inTenant(() => svc.startConnect(as(ws.emp, "employee"), "google")));
    const state2 = new URL(url2).searchParams.get("state");
    await runUnscoped(() => prisma.oAuthRequest.update({ where: { id: state2 }, data: { expiresAt: new Date(Date.now() - 1000) } }));
    await assert.rejects(svc.completeConnect("google", { code: "x", state: state2 }), /expired/);
  });

  await t.test("declining at Google records nothing", async () => {
    const before = await runUnscoped(() => prisma.oAuthConnection.count({ where: { tenantId } }));
    const { url } = await withGoogleEnv(() => inTenant(() => svc.startConnect(as(ws.other, "employee"), "google")));
    await assert.rejects(svc.completeConnect("google", { state: new URL(url).searchParams.get("state"), error: "access_denied" }), /declined/);
    assert.equal(await runUnscoped(() => prisma.oAuthConnection.count({ where: { tenantId } })), before);
  });

  await t.test("only admins connect the support inbox; nobody sees another person's mailbox", async () => {
    await assert.rejects(withGoogleEnv(() => inTenant(() => svc.startConnect(as(ws.emp, "employee"), "google", "support_inbox"))), /Only an admin/);
    const mine = await inTenant(() => svc.listConnections(as(ws.other, "employee")));
    assert.equal(mine.connections.length, 0, "a colleague's personal connection is invisible");
    await assert.rejects(inTenant(() => svc.disconnect(as(ws.other, "employee"), personal.id)), /not found/);
  });

  await t.test("an expired token is refreshed; a revoked grant asks for a reconnect", async () => {
    await runUnscoped(() => prisma.oAuthConnection.update({ where: { id: personal.id }, data: { expiresAt: new Date(Date.now() - 1000) } }));
    let row = await runUnscoped(() => prisma.oAuthConnection.findFirst({ where: { id: personal.id } }));
    let fake = fakeFetch([["https://oauth2.googleapis.com/token", () => [200, { access_token: "ya29.FRESH", expires_in: 3600 }]]]);
    try { assert.equal(await withGoogleEnv(() => svc.accessTokenFor(row)), "ya29.FRESH"); } finally { fake.restore(); }

    await runUnscoped(() => prisma.oAuthConnection.update({ where: { id: personal.id }, data: { expiresAt: new Date(Date.now() - 1000) } }));
    row = await runUnscoped(() => prisma.oAuthConnection.findFirst({ where: { id: personal.id } }));
    fake = fakeFetch([["https://oauth2.googleapis.com/token", () => [400, { error: "invalid_grant", error_description: "Token has been expired or revoked." }]]]);
    try { await assert.rejects(withGoogleEnv(() => svc.accessTokenFor(row))); } finally { fake.restore(); }
    row = await runUnscoped(() => prisma.oAuthConnection.findFirst({ where: { id: personal.id } }));
    assert.equal(row.status, "needs_reauth");
    await runUnscoped(() => prisma.oAuthConnection.update({ where: { id: personal.id }, data: { status: "active", expiresAt: new Date(Date.now() + 3600_000), lastError: null } }));
  });

  const gmail = (messages) => [
    [/gmail\/v1\/users\/me\/messages\?/, () => [200, { messages: messages.map((m) => ({ id: m.id })) }]],
    [/gmail\/v1\/users\/me\/messages\/[^?]+\?/, (url) => {
      const id = decodeURIComponent(url.match(/messages\/([^?]+)/)[1]);
      const m = messages.find((x) => x.id === id);
      const headers = [["From", m.from], ["To", m.to ?? "me@gmail.test"], ["Subject", m.subject], ...(m.headers ?? [])].map(([name, value]) => ({ name, value }));
      return [200, {
        id: m.id, threadId: `t-${m.id}`, snippet: m.snippet ?? "", internalDate: String(Date.now()),
        payload: { mimeType: "text/plain", headers, body: { data: b64url(m.body ?? m.snippet ?? "") } },
      }];
    }],
  ];

  await t.test("only email with CRM contacts is logged, once, without the body", async () => {
    const row = await runUnscoped(() => prisma.oAuthConnection.findFirst({ where: { id: personal.id } }));
    await runUnscoped(() => prisma.oAuthConnection.update({ where: { id: personal.id }, data: { logMeetings: false } }));
    const messages = [
      { id: "m1", from: "Buyer <buyer@acme.test>", subject: "Pricing question", snippet: "Can you send the quote?", body: "SECRET BODY TEXT" },
      { id: "m2", from: "friend@personal.test", subject: "Dinner?", snippet: "Private" },
      { id: "m3", from: "me@gmail.test", to: "buyer@acme.test", subject: "Re: Pricing question", snippet: "Attached." },
    ];
    for (let run = 0; run < 2; run++) {
      const fake = fakeFetch(gmail(messages));
      try {
        const r = await withGoogleEnv(() => syncConnection({ ...row, logMeetings: false }));
        assert.equal(r.ok, true, r.error);
      } finally { fake.restore(); }
    }
    const logged = await runUnscoped(() => prisma.mailActivity.findMany({ where: { connectionId: personal.id }, orderBy: { externalId: "asc" } }));
    assert.deepEqual(logged.map((m) => [m.externalId, m.direction]), [["m1", "inbound"], ["m3", "outbound"]], "the personal email is not stored; nothing twice");
    assert.ok(!JSON.stringify(logged).includes("SECRET BODY TEXT"));

    const timeline = await inTenant(() => getAccountTimeline(tenantId, ws.contact.id));
    assert.ok(timeline.some((e) => e.type === "email" && /Pricing question/.test(e.description)), "it shows on the account timeline");
    assert.ok(!timeline.some((e) => /Last contacted via email/.test(e.description)), "the old fabricated entry is gone");
  });

  await t.test("meetings with CRM contacts become CRM meetings, and follow cancellations", async () => {
    await runUnscoped(() => prisma.oAuthConnection.update({ where: { id: personal.id }, data: { logEmails: false, logMeetings: true } }));
    const row = await runUnscoped(() => prisma.oAuthConnection.findFirst({ where: { id: personal.id } }));
    const start = new Date(Date.now() + 86_400_000).toISOString();
    const events = (status) => [[/calendar\/v3\/calendars\/primary\/events/, () => [200, { items: [
      { id: "e1", status, summary: "Acme renewal call", start: { dateTime: start }, end: { dateTime: start }, attendees: [{ email: "buyer@acme.test" }] },
      { id: "e2", status: "confirmed", summary: "Dentist", start: { dateTime: start }, end: { dateTime: start }, attendees: [] },
    ] }]]];
    let fake = fakeFetch(events("confirmed"));
    try { assert.equal((await withGoogleEnv(() => syncConnection(row))).ok, true); } finally { fake.restore(); }
    let meetings = await runUnscoped(() => prisma.crmFollowUp.findMany({ where: { tenantId } }));
    assert.equal(meetings.length, 1, "the dentist isn't a CRM meeting");
    assert.equal(meetings[0].status, "scheduled");
    assert.equal(meetings[0].contactId, ws.contact.id);

    fake = fakeFetch(events("cancelled"));
    try { await withGoogleEnv(() => syncConnection(row)); } finally { fake.restore(); }
    meetings = await runUnscoped(() => prisma.crmFollowUp.findMany({ where: { tenantId } }));
    assert.equal(meetings.length, 1);
    assert.equal(meetings[0].status, "cancelled");
  });

  await t.test("the support inbox turns mail into tickets, threads replies, and ignores robots", async () => {
    const { connection } = await connect(as(ws.admin, "enterprise_admin"), { email: "support@us.test", purpose: "support_inbox" });
    // Pretend it was connected an hour ago so the messages below are "new".
    await runUnscoped(() => prisma.oAuthConnection.update({ where: { id: connection.id }, data: { syncedThrough: new Date(Date.now() - 3600_000) } }));
    const row = () => runUnscoped(() => prisma.oAuthConnection.findFirst({ where: { id: connection.id } }));

    let fake = fakeFetch(gmail([
      { id: "s1", from: "Buyer <buyer@acme.test>", subject: "Login broken", body: "I can't sign in." },
      { id: "s2", from: "no-reply@vendor.test", subject: "Your receipt", body: "Thanks" },
    ]));
    try { assert.equal((await withGoogleEnv(async () => syncConnection(await row()))).ok, true); } finally { fake.restore(); }
    const tickets = await runUnscoped(() => prisma.crmTicket.findMany({ where: { tenantId } }));
    assert.equal(tickets.length, 1, "the no-reply receipt is skipped");
    assert.equal(tickets[0].source, "email");
    assert.equal(tickets[0].contactId, ws.contact.id, "linked to the CRM contact by address");
    const ref = tickets[0].ticket_number;

    fake = fakeFetch(gmail([
      { id: "s1", from: "buyer@acme.test", subject: "Login broken", body: "dup" },
      { id: "s3", from: "buyer@acme.test", subject: `Re: [${ref}] Login broken`, body: `Still broken.\n\nOn Mon, Support wrote:\n> fixed` },
      { id: "s4", from: "stranger@evil.test", subject: `Re: [${ref}] Login broken`, body: "Let me in" },
    ]));
    try { await withGoogleEnv(async () => syncConnection(await row())); } finally { fake.restore(); }
    const after = await runUnscoped(() => prisma.crmTicket.findMany({ where: { tenantId }, orderBy: { createdAt: "asc" } }));
    assert.equal(after.length, 2, "s1 isn't re-imported; the stranger gets their own ticket");
    const thread = await runUnscoped(() => prisma.ticketMessage.findMany({ where: { ticketId: tickets[0].id }, orderBy: { createdAt: "asc" } }));
    assert.equal(thread.at(-1).body, "Still broken.", "the reply joins the ticket without the quoted history");
    assert.ok(!thread.some((m) => /Let me in/.test(m.body)), "quoting a reference doesn't get you into someone else's ticket");
  });

  await t.test("ExecAI reads only the signed-in person's own mailbox", async () => {
    const row = await svc.personalConnection(tenantId, ws.emp.id);
    assert.ok(row);
    assert.equal(await runUnscoped(() => svc.personalConnection(tenantId, ws.other.id)), null, "a colleague has no mailbox to read");
    const fake = fakeFetch(gmail([{ id: "q1", from: "buyer@acme.test", subject: "Invoice 42", snippet: "Please pay" }]));
    try {
      const step = await withGoogleEnv(() => runMailboxTool("search_my_email", { query: "invoice" }, { connection: row }));
      assert.equal(step.action, "read");
      assert.equal(step.modelOutput[0].subject, "Invoice 42");
      assert.ok(fake.calls.every((c) => !/send|drafts|modify|trash/.test(c.url)), "read-only calls only");
    } finally { fake.restore(); }
    await assert.rejects(runMailboxTool("search_my_email", { query: "x" }, { connection: null }), /Connect your/);
  });

  await t.test("disconnecting deletes the tokens and what they unlocked stays only as history", async () => {
    const fake = fakeFetch([["https://oauth2.googleapis.com/revoke", () => [200, {}]]]);
    try { await inTenant(() => svc.disconnect(as(ws.emp, "employee"), personal.id)); } finally { fake.restore(); }
    assert.ok(fake.calls.some((c) => c.url.startsWith("https://oauth2.googleapis.com/revoke")), "Google is told to revoke the grant");
    assert.equal(await runUnscoped(() => prisma.oAuthConnection.count({ where: { id: personal.id } })), 0);
  });
});
