/**
 * Phase 2 integrations: Slack and Teams channel posting, Zoom meetings, and
 * Drive/OneDrive file search. The providers are a fake `fetch`; everything
 * else — database, encryption, permissions — is real.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { validateTeamsWebhook } from "../src/modules/connections/chat.service.js";
import { validateAction } from "../src/modules/workflows/workflows.actions.js";

const HAS_DB = !!process.env.DATABASE_URL;
const tick = () => new Promise((r) => setTimeout(r, 50));

test("a Teams webhook must be a Microsoft webhook over HTTPS", () => {
  assert.doesNotThrow(() => validateTeamsWebhook("https://prod-12.westeurope.logic.azure.com/workflows/abc/triggers/manual/paths/invoke?sig=x"));
  assert.doesNotThrow(() => validateTeamsWebhook("https://default123.environment.api.powerplatform.com/powerautomate/automations/direct/x"));
  for (const bad of ["http://prod.logic.azure.com/x", "https://169.254.169.254/latest", "https://evil.test/logic.azure.com", "https://logic.azure.com.evil.test/x"]) {
    assert.throws(() => validateTeamsWebhook(bad), /isn't a Microsoft Teams webhook/, bad);
  }
});

test("a workflow can post to a channel, but needs one and a message", () => {
  assert.deepEqual(validateAction("contacts", { type: "post_chat", routeId: "r1", text: "New contact {{record.name}}" }), { type: "post_chat", routeId: "r1", text: "New contact {{record.name}}" });
  assert.throws(() => validateAction("contacts", { type: "post_chat", text: "hi" }), /channel/);
  assert.throws(() => validateAction("contacts", { type: "post_chat", routeId: "r1" }), /message/);
});

test("Slack, Teams, Zoom and Drive against the database", { skip: !HAS_DB && "DATABASE_URL not set" }, async (t) => {
  const { default: prisma } = await import("../src/config/database.js");
  const { runUnscoped, runWithTenant } = await import("../src/lib/tenantContext.js");
  const { encryptSecret } = await import("../src/lib/secrets.js");
  const svc = await import("../src/modules/connections/connections.service.js");
  const chat = await import("../src/modules/connections/chat.service.js");
  const workspace = await import("../src/modules/connections/workspace.service.js");
  const { executeAction } = await import("../src/modules/workflows/workflows.actions.js");
  const { mailboxTools } = await import("../src/modules/assistant/assistant.mailbox.js");
  const { performAction } = await import("../src/modules/assistant/assistant.actions.js");
  const { intersectWithPlan, accessFor } = await import("../src/modules/access/access.policy.js");
  const { entitlementsFor } = await import("../src/modules/billing/plans.config.js");

  for (const [k, v] of [["SLACK_CLIENT_ID", "s"], ["SLACK_CLIENT_SECRET", "s"], ["ZOOM_CLIENT_ID", "z"], ["ZOOM_CLIENT_SECRET", "z"], ["GOOGLE_CLIENT_ID", "g"], ["GOOGLE_CLIENT_SECRET", "g"]]) process.env[k] ??= v;

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const ws = await runUnscoped(async () => {
    const tenant = await prisma.tenant.create({ data: { name: `WS ${stamp}`, slug: `ws-${stamp}`, code: `WS${stamp}`.slice(0, 12), plan: "executive" } });
    const adminRole = await prisma.role.create({ data: { name: "enterprise_admin", tenantId: tenant.id } });
    const empRole = await prisma.role.create({ data: { name: "employee", tenantId: tenant.id } });
    const mk = (n, roleId) => prisma.user.create({ data: { email: `ws-${n}-${stamp}@t.test`, firstName: n, lastName: "T", passwordHash: "x", tenantId: tenant.id, roleId } });
    const contact = await prisma.contact.create({ data: { tenantId: tenant.id, name: "Acme", email: "buyer@acme.test", key: `ws-${stamp}` } });
    return { tenant, admin: await mk("admin", adminRole.id), emp: await mk("emp", empRole.id), other: await mk("other", empRole.id), contact };
  });
  const tenantId = ws.tenant.id;
  const as = (u, role) => ({ tenantId, userId: u.id, role });
  const inT = (fn) => runWithTenant({ tenantId }, fn);
  t.after(() => runUnscoped(async () => {
    for (const m of ["chatRoute", "attachment", "crmFollowUp", "oAuthConnection", "oAuthRequest", "networkAlert", "networkDevice", "auditLog"]) await prisma[m].deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.role.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
  }));

  // One fake internet for the whole test.
  const calls = [];
  let teamsStatus = 200;
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    calls.push({ url: u, init });
    const json = (b, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });
    if (u.endsWith("/api/oauth.v2.access")) return json({ ok: true, access_token: "xoxb-SLACK", scope: "chat:write,channels:read", team: { id: "T1", name: "Acme HQ" } });
    if (u.endsWith("/api/conversations.list")) return json({ ok: true, channels: [{ id: "C0123ABCD", name: "it-alerts", is_private: false, is_member: true }] });
    if (u.endsWith("/api/chat.postMessage")) return json({ ok: true });
    if (u.includes("logic.azure.com")) return new Response("", { status: teamsStatus });
    if (u === "https://zoom.us/oauth/token") return json({ access_token: "zoom-ACCESS", refresh_token: "zoom-REFRESH", expires_in: 3600, scope: "meeting:write:meeting user:read:user" });
    if (u === "https://api.zoom.us/v2/users/me") return json({ email: "Rep@Acme.test" });
    if (u === "https://api.zoom.us/v2/users/me/meetings") return json({ id: 987654321, join_url: "https://zoom.us/j/987654321" });
    if (u === "https://oauth2.googleapis.com/token") return json({ access_token: "ya29.G", refresh_token: "1//R", expires_in: 3600, scope: "openid email https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly" });
    if (u === "https://openidconnect.googleapis.com/v1/userinfo") return json({ email: "admin@acme.test" });
    if (u.startsWith("https://www.googleapis.com/drive/v3/files")) return json({ files: [{ id: "f1", name: "Acme proposal.pdf", mimeType: "application/pdf", webViewLink: "https://drive.google.com/file/d/f1/view", modifiedTime: "2026-11-01T00:00:00Z", owners: [{ displayName: "Ama" }] }] });
    return new Response("{}", { status: 404 });
  };
  t.after(() => { globalThis.fetch = original; });

  const connect = async (actor, provider, purpose, features = []) => {
    const { url } = await inT(() => svc.startConnect(actor, provider, purpose, features));
    return svc.completeConnect(provider, { code: "c", state: new URL(url).searchParams.get("state") });
  };

  await t.test("only an admin connects Slack, and it's stored as the workspace", async () => {
    await assert.rejects(inT(() => svc.startConnect(as(ws.emp, "employee"), "slack", "workspace")), /Only an admin/);
    await assert.rejects(inT(() => svc.startConnect(as(ws.admin, "enterprise_admin"), "slack", "personal")), /can't be connected that way/);
    const { connection } = await connect(as(ws.admin, "enterprise_admin"), "slack", "workspace");
    assert.equal(connection.accountEmail, "Acme HQ (Slack)");
  });

  let slackRoute, teamsRoute;
  await t.test("routes: a Slack channel and an encrypted Teams webhook", async () => {
    const channels = await inT(() => chat.slackChannels(tenantId));
    assert.equal(channels[0].name, "it-alerts");
    slackRoute = await inT(() => chat.addRoute(tenantId, ws.admin.id, { provider: "slack", category: "network_alerts", channel: "C0123ABCD", channelName: "it-alerts" }));
    assert.equal(slackRoute.label, "#it-alerts");
    const hook = "https://prod-1.westeurope.logic.azure.com/workflows/abc/triggers/manual/paths/invoke?sig=SECRETSIG";
    teamsRoute = await inT(() => chat.addRoute(tenantId, ws.admin.id, { provider: "teams", category: "network_alerts", webhookUrl: hook, label: "IT › Alerts" }));
    const row = await runUnscoped(() => prisma.chatRoute.findFirst({ where: { id: teamsRoute.id } }));
    assert.ok(!JSON.stringify(row).includes("SECRETSIG"), "the webhook URL is ciphertext at rest");
    assert.ok(!JSON.stringify(await inT(() => chat.overview(tenantId))).includes("SECRETSIG"), "and never comes back");
    await assert.rejects(inT(() => chat.addRoute(tenantId, ws.admin.id, { provider: "teams", category: "network_alerts", webhookUrl: "https://10.0.0.5/hook" })), /isn't a Microsoft Teams webhook/);
  });

  await t.test("a network alert is posted to both channels; a failing channel records why", async () => {
    calls.length = 0;
    teamsStatus = 500;
    chat.notifyChat(tenantId, "network_alerts", { title: "core-rtr is unreachable", text: "192.168.1.1 stopped answering", link: "/network/alerts" });
    await tick();
    const slackPost = calls.find((c) => c.url.endsWith("/api/chat.postMessage"));
    assert.equal(JSON.parse(slackPost.init.body).channel, "C0123ABCD");
    assert.match(JSON.parse(slackPost.init.body).text, /core-rtr is unreachable/);
    const teamsPost = calls.find((c) => c.url.includes("logic.azure.com"));
    assert.equal(JSON.parse(teamsPost.init.body).attachments[0].contentType, "application/vnd.microsoft.card.adaptive");
    const failed = await runUnscoped(() => prisma.chatRoute.findFirst({ where: { id: teamsRoute.id } }));
    assert.match(failed.lastError, /500/);
    teamsStatus = 200;

    // Other categories, and disabled routes, aren't posted to.
    calls.length = 0;
    await inT(() => chat.toggleRoute(tenantId, slackRoute.id, false));
    chat.notifyChat(tenantId, "network_alerts", { title: "x" });
    chat.notifyChat(tenantId, "approvals", { title: "y" });
    await tick();
    assert.ok(!calls.some((c) => c.url.endsWith("/api/chat.postMessage")));
    await inT(() => chat.toggleRoute(tenantId, slackRoute.id, true));
  });

  await t.test("the collector's alerts reach chat on their own", async () => {
    const collectors = await import("../src/modules/network/network.collectors.js");
    const { collector, token } = await inT(() => collectors.createCollector(tenantId, ws.admin.id, { name: "HQ" }));
    calls.length = 0;
    const c = await collectors.collectorForToken(token);
    await collectors.ingestReport(c, { devices: [{ ip: "192.168.9.1", reachable: true, cpu: 99, snmp: true }] });
    await tick();
    assert.ok(calls.some((x) => x.url.endsWith("/api/chat.postMessage") && /CPU at 99%/.test(JSON.parse(x.init.body).text)));
    await runUnscoped(() => prisma.networkCollector.delete({ where: { id: collector.id } }));
  });

  await t.test("a workflow posts to a chosen channel with its template filled in", async () => {
    calls.length = 0;
    await inT(() => executeAction({ type: "post_chat", routeId: slackRoute.id, text: "New contact {{record.name}}" }, { tenantId, record: { name: "Acme" }, event: "contacts.created" }));
    assert.match(JSON.parse(calls.find((c) => c.url.endsWith("/api/chat.postMessage")).init.body).text, /New contact Acme/);
  });

  await t.test("Zoom meetings are created in the owner's own Zoom", async () => {
    const meeting = await runUnscoped(() => prisma.crmFollowUp.create({ data: { tenantId, userId: ws.emp.id, customer_name: "Acme", notes: "Acme renewal call", follow_up_type: "meeting", status: "scheduled", scheduled_date: new Date(Date.now() + 86_400_000) } }));
    await assert.rejects(inT(() => workspace.addZoomMeeting(as(ws.emp, "employee"), meeting.id)), /Connect Zoom first/);
    await connect(as(ws.emp, "employee"), "zoom", "personal");
    await assert.rejects(inT(() => workspace.addZoomMeeting(as(ws.other, "employee"), meeting.id)), /owner/);
    const updated = await inT(() => workspace.addZoomMeeting(as(ws.emp, "employee"), meeting.id));
    assert.equal(updated.meetingUrl, "https://zoom.us/j/987654321");
    const create = calls.find((c) => c.url === "https://api.zoom.us/v2/users/me/meetings");
    assert.equal(JSON.parse(create.init.body).topic, "Acme renewal call");
    assert.equal(await svc.personalConnection(tenantId, ws.emp.id), null, "a Zoom connection isn't mistaken for a mailbox");
  });

  await t.test("ExecAI can schedule a meeting with a Zoom link", async () => {
    const access = intersectWithPlan(accessFor({ role: "employee", department: "sales" }), entitlementsFor("executive"));
    const { result } = await runWithTenant({ tenantId, userId: ws.emp.id, role: "employee" }, () => performAction("crm_schedule_meeting",
      { title: "Acme demo", scheduledAt: new Date(Date.now() + 2 * 86_400_000).toISOString(), zoom: true },
      { tenantId, userId: ws.emp.id, role: "employee", access, permissions: new Set() }));
    assert.equal(result.meetingProvider, "zoom");
  });

  await t.test("file search needs the files grant, and only Drive links can be attached", async () => {
    await connect(as(ws.admin, "enterprise_admin"), "google", "personal");
    let mine = await svc.personalConnection(tenantId, ws.admin.id);
    assert.equal(mailboxTools(mine).some((x) => x.function.name === "search_my_files"), false, "no files grant, no tool");
    await assert.rejects(inT(() => workspace.searchMyFiles(as(ws.admin, "enterprise_admin"), "proposal")), /wasn't granted/);
    await assert.rejects(inT(() => svc.startConnect(as(ws.admin, "enterprise_admin"), "google", "support_inbox", ["files"])), /only available on a personal/);

    // Reconnect with files. The fake token endpoint echoes what Google would grant.
    const { url } = await inT(() => svc.startConnect(as(ws.admin, "enterprise_admin"), "google", "personal", ["files"]));
    assert.match(decodeURIComponent(url), /drive\.metadata\.readonly/);
    await runUnscoped(() => prisma.oAuthConnection.updateMany({ where: { tenantId, userId: ws.admin.id, provider: "google" }, data: { scopes: { push: "https://www.googleapis.com/auth/drive.metadata.readonly" } } }));
    mine = await svc.personalConnection(tenantId, ws.admin.id);
    assert.ok(mailboxTools(mine).some((x) => x.function.name === "search_my_files"));

    calls.length = 0;
    const files = await inT(() => workspace.searchMyFiles(as(ws.admin, "enterprise_admin"), "Acme's proposal"));
    assert.equal(files[0].name, "Acme proposal.pdf");
    const q = new URL(calls[0].url).searchParams.get("q");
    assert.equal(q, "name contains 'Acme\\'s proposal' and trashed = false", "a quote in the search can't break out of the query");

    const att = await inT(() => workspace.attachFile(as(ws.admin, "enterprise_admin"), { entityType: "contact", entityId: ws.contact.id, file: { name: files[0].name, url: files[0].url } }));
    assert.equal(att.url, "https://drive.google.com/file/d/f1/view");
    await assert.rejects(inT(() => workspace.attachFile(as(ws.admin, "enterprise_admin"), { entityType: "contact", entityId: ws.contact.id, file: { name: "x", url: "https://evil.test/x" } })), /Only Google Drive or OneDrive/);
  });
});
