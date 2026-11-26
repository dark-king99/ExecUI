/**
 * Enterprise sign-up requires a verified email: nothing exists until the code
 * sent to the address is entered. Resend is a fake `fetch`; DNS is stubbed;
 * the database and HTTP routes are real.
 */
import test from "node:test";
import assert from "node:assert/strict";

const HAS_DB = !!process.env.DATABASE_URL;
process.env.RESEND_API_KEY ||= "re_test_signup";

test("addresses: format, throwaway inboxes, and domains that can't receive mail", async () => {
  const { checkAddress, resolver } = await import("../src/modules/auth/signup.service.js");
  const real = { ...resolver };
  resolver.mx = async (d) => ({ "acme.test": [{ exchange: "mx.acme.test", priority: 10 }], "nullmx.test": [{ exchange: ".", priority: 0 }] })[d] ?? [];
  resolver.a = async (d) => (d === "aonly.test" ? ["93.184.216.34"] : []);
  try {
    assert.equal(await checkAddress("  Ann@ACME.test "), "ann@acme.test");
    assert.equal(await checkAddress("ann@aonly.test"), "ann@aonly.test", "an A record is a valid fallback (RFC 5321)");
    await assert.rejects(checkAddress("not-an-email"), /valid email/);
    await assert.rejects(checkAddress("a@b"), /valid email/);
    await assert.rejects(checkAddress("x@mailinator.com"), /temporary inboxes/);
    await assert.rejects(checkAddress("x@sub.yopmail.com"), /temporary inboxes/);
    await assert.rejects(checkAddress("x@nowhere-at-all.test"), /couldn't find a mail server/);
    await assert.rejects(checkAddress("x@nullmx.test"), /doesn't accept email/);
  } finally {
    Object.assign(resolver, real);
  }
});

test("enterprise sign-up end to end", { skip: !HAS_DB && "DATABASE_URL not set" }, async (t) => {
  const { default: prisma } = await import("../src/config/database.js");
  const { runUnscoped } = await import("../src/lib/tenantContext.js");
  const signup = await import("../src/modules/auth/signup.service.js");
  const { default: app } = await import("../src/app.js");
  const bcrypt = (await import("bcrypt")).default;

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const domain = `verify-${stamp}.test`;
  const addr = (n) => `${n}@${domain}`;
  const realResolver = { ...signup.resolver };
  signup.resolver.mx = async (d) => (d === domain ? [{ exchange: `mx.${domain}`, priority: 10 }] : []);
  signup.resolver.a = async () => [];

  // Fake Resend: capture the codes we send.
  const sent = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    if (!String(url).startsWith("https://api.resend.com")) return original(url, init);
    const body = JSON.parse(init.body);
    sent.push({ to: body.to[0], code: /(\d{6}) is your/.exec(body.subject)?.[1], html: body.html });
    return new Response(JSON.stringify({ id: `em_${sent.length}` }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const codeFor = (email) => [...sent].reverse().find((s) => s.to === email)?.code;

  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api/auth`;
  const post = async (path, json) => {
    const r = await original(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(json) });
    return { status: r.status, data: await r.json() };
  };
  t.after(async () => {
    server.close();
    globalThis.fetch = original;
    Object.assign(signup.resolver, realResolver);
    await runUnscoped(async () => {
      await prisma.signupVerification.deleteMany({ where: { email: { endsWith: `@${domain}` } } });
      const users = await prisma.user.findMany({ where: { email: { endsWith: `@${domain}` } }, select: { tenantId: true } });
      for (const id of new Set(users.map((u) => u.tenantId))) {
        await prisma.auditLog.deleteMany({ where: { tenantId: id } }).catch(() => {});
        await prisma.user.deleteMany({ where: { tenantId: id } });
        await prisma.rolePermission.deleteMany({ where: { role: { tenantId: id } } });
        await prisma.role.deleteMany({ where: { tenantId: id } });
        await prisma.tenant.delete({ where: { id } }).catch(() => {});
      }
    });
  });
  const users = (email) => runUnscoped(() => prisma.user.count({ where: { email } }));
  const tenants = (name) => runUnscoped(() => prisma.tenant.count({ where: { name } }));

  await t.test("sign-up creates nothing until the emailed code is entered", async () => {
    const company = `Acme ${stamp}`;
    const r = await post("/signup", { company, email: addr("ann"), password: "correct horse 9", firstName: "Ann", lastName: "Lee" });
    assert.equal(r.status, 202);
    assert.equal(r.data.pending, true);
    assert.equal(r.data.token, undefined, "no session before verification");
    assert.equal(await users(addr("ann")), 0);
    assert.equal(await tenants(company), 0);
    const code = codeFor(addr("ann"));
    assert.match(code, /^\d{6}$/);
    const pending = await runUnscoped(() => prisma.signupVerification.findUnique({ where: { email: addr("ann") } }));
    assert.ok(!JSON.stringify(pending).includes(code), "the code is stored only as a hash");
    assert.ok(!JSON.stringify(pending).includes("correct horse 9"), "the password is stored only as a hash");

    const wrong = await post("/signup/verify", { email: addr("ann"), code: code === "000000" ? "111111" : "000000" });
    assert.equal(wrong.status, 400);
    assert.match(wrong.data.message, /4 attempts left/);

    const ok = await post("/signup/verify", { email: addr("ann"), code });
    assert.equal(ok.status, 201);
    assert.ok(ok.data.token);
    assert.equal(ok.data.user.role, "enterprise_admin");
    const u = await runUnscoped(() => prisma.user.findFirst({ where: { email: addr("ann") } }));
    assert.ok(u.emailVerifiedAt, "the admin's address is marked verified");
    assert.equal(u.provisionedVia, "signup");
    assert.ok(await bcrypt.compare("correct horse 9", u.passwordHash), "the password chosen at sign-up works");
    assert.equal(await tenants(company), 1);

    assert.equal((await post("/signup/verify", { email: addr("ann"), code })).status, 410, "a code works once");
    assert.equal((await post("/signup", { company: "Again", email: addr("ANN"), password: "correct horse 9" })).status, 409, "the address is taken (any case)");
  });

  await t.test("throwaway and undeliverable addresses can't start a sign-up", async () => {
    const r1 = await post("/signup", { company: "Spam Co", email: "x@mailinator.com", password: "password123" });
    assert.equal(r1.status, 400);
    const r2 = await post("/signup", { company: "Typo Co", email: "x@no-such-domain-xyz.test", password: "password123" });
    assert.equal(r2.status, 400);
    assert.match(r2.data.message, /mail server/);
  });

  await t.test("five wrong codes end the attempt", async () => {
    await signup.startSignup({ company: "Guess Co", email: addr("guess"), password: "password123" });
    const code = codeFor(addr("guess"));
    const bad = code === "123456" ? "654321" : "123456";
    for (let i = 0; i < 4; i++) await assert.rejects(signup.verifySignup({ email: addr("guess"), code: bad }), /isn't right/);
    await assert.rejects(signup.verifySignup({ email: addr("guess"), code: bad }), /Too many wrong codes/);
    await assert.rejects(signup.verifySignup({ email: addr("guess"), code }), /expired/, "even the right code no longer works");
    assert.equal(await users(addr("guess")), 0);
  });

  await t.test("expired codes, resend cooldown, and resend replaces the old code", async () => {
    await signup.startSignup({ company: "Slow Co", email: addr("slow"), password: "password123" });
    const first = codeFor(addr("slow"));
    await assert.rejects(signup.resendCode(addr("slow")), /Wait a minute/);
    await assert.rejects(signup.startSignup({ company: "Slow Co", email: addr("slow"), password: "password123" }), /Wait a minute/);
    await runUnscoped(() => prisma.signupVerification.update({ where: { email: addr("slow") }, data: { lastSentAt: new Date(Date.now() - 61_000) } }));
    await signup.resendCode(addr("slow"));
    const second = codeFor(addr("slow"));
    if (second !== first) await assert.rejects(signup.verifySignup({ email: addr("slow"), code: first }), /isn't right/, "the old code stops working");
    await runUnscoped(() => prisma.signupVerification.update({ where: { email: addr("slow") }, data: { expiresAt: new Date(Date.now() - 1000) } }));
    await assert.rejects(signup.verifySignup({ email: addr("slow"), code: second }), /expired/);
    assert.equal(await users(addr("slow")), 0);
  });

  await t.test("the same code submitted twice at once creates one enterprise", async () => {
    const company = `Race ${stamp}`;
    await signup.startSignup({ company, email: addr("race"), password: "password123" });
    const code = codeFor(addr("race"));
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => signup.verifySignup({ email: addr("race"), code })));
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(await tenants(company), 1);
  });
});
