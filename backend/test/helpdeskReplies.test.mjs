/**
 * Help-desk replies from the connected support mailbox: sent from the support
 * address, in the customer's thread, and never able to smuggle extra headers.
 * Google is a fake `fetch`; the database, encryption and ticket flow are real.
 */
import test from "node:test";
import assert from "node:assert/strict";

const HAS_DB = !!process.env.DATABASE_URL;

test("support replies go out from the support mailbox, threaded", { skip: !HAS_DB && "DATABASE_URL not set" }, async (t) => {
  const { default: prisma } = await import("../src/config/database.js");
  const { runUnscoped, runWithTenant } = await import("../src/lib/tenantContext.js");
  const { encryptSecret } = await import("../src/lib/secrets.js");
  const { addMessage } = await import("../src/modules/helpdesk/tickets.service.js");

  process.env.GOOGLE_CLIENT_ID ??= "test-client";
  process.env.GOOGLE_CLIENT_SECRET ??= "test-secret";

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const ws = await runUnscoped(async () => {
    const tenant = await prisma.tenant.create({ data: { name: `HD ${stamp}`, slug: `hd-${stamp}`, code: `HD${stamp}`.slice(0, 12), plan: "executive" } });
    const role = await prisma.role.create({ data: { name: "enterprise_admin", tenantId: tenant.id } });
    const agent = await prisma.user.create({ data: { email: `hd-${stamp}@t.test`, firstName: "Ama", lastName: "Agent", passwordHash: "x", tenantId: tenant.id, roleId: role.id } });
    const tok = encryptSecret("ya29.SUPPORT");
    const connection = await prisma.oAuthConnection.create({
      data: {
        tenantId: tenant.id, userId: agent.id, provider: "google", purpose: "support_inbox", accountEmail: "support@us.test",
        scopes: ["openid", "email", "https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.send"],
        accessCipher: tok.ciphertext, accessIv: tok.iv, accessTag: tok.tag, expiresAt: new Date(Date.now() + 3600_000),
      },
    });
    const ticket = await prisma.crmTicket.create({
      data: { tenantId: tenant.id, ticket_number: `TKT-${stamp.slice(-5)}`, subject: "Login broken\r\nBcc: attacker@evil.test", customer_name: "Buyer", contactEmail: "buyer@acme.test", source: "email", status: "open" },
    });
    await prisma.supportEmail.create({ data: { tenantId: tenant.id, connectionId: connection.id, externalId: "orig-1", ticketId: ticket.id, outcome: "created", receivedAt: new Date() } });
    return { tenant, agent, connection, ticket };
  });
  const tenantId = ws.tenant.id;
  t.after(() => runUnscoped(async () => {
    for (const m of ["ticketMessage", "supportEmail", "crmTicket", "oAuthConnection", "notification", "auditLog"]) await prisma[m].deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.role.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
  }));

  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const json = (b) => new Response(JSON.stringify(b), { headers: { "Content-Type": "application/json" } });
    if (/messages\/orig-1\?/.test(url)) {
      return json({ id: "orig-1", threadId: "thread-9", snippet: "", internalDate: String(Date.now()), payload: { headers: [{ name: "Message-ID", value: "<abc@mail.acme.test>" }, { name: "From", value: "buyer@acme.test" }, { name: "Subject", value: "Login broken" }] } });
    }
    if (/messages\/send$/.test(url)) return json({ id: "sent-1" });
    return new Response("{}", { status: 404 });
  };
  t.after(() => { globalThis.fetch = original; });

  const reply = () => runWithTenant({ tenantId }, () => addMessage({ userId: ws.agent.id }, ws.ticket.id, { body: "We've reset your password." }));

  await t.test("the reply is sent from the mailbox, in the customer's thread", async () => {
    const result = await reply();
    const send = calls.find((c) => /messages\/send$/.test(c.url));
    assert.ok(send, "Gmail send was called");
    const body = JSON.parse(send.init.body);
    assert.equal(body.threadId, "thread-9");
    const raw = Buffer.from(body.raw, "base64url").toString("utf8");
    assert.match(raw, /^To: buyer@acme\.test\r$/m);
    assert.match(raw, /^In-Reply-To: <abc@mail\.acme\.test>\r$/m);
    assert.ok(!/^Bcc:/mi.test(raw), "a line break in the subject can't add a header");
    assert.match(Buffer.from(raw.split("\r\n\r\n")[1].replace(/\r\n/g, ""), "base64").toString(), /reset your password/);
    const last = result.messages?.at?.(-1) ?? (await runUnscoped(() => prisma.ticketMessage.findFirst({ where: { ticketId: ws.ticket.id }, orderBy: { createdAt: "desc" } })));
    assert.equal(last.emailed, true);
  });

  await t.test("without send permission, the mailbox isn't used", async () => {
    await runUnscoped(() => prisma.oAuthConnection.update({ where: { id: ws.connection.id }, data: { scopes: ["openid", "email", "https://www.googleapis.com/auth/gmail.readonly"] } }));
    calls.length = 0;
    await reply();
    assert.ok(!calls.some((c) => /messages\/send$/.test(c.url)), "a read-only grant never sends");
  });
});
