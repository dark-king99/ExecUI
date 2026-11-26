/**
 * Enterprise sign-up with a verified email address.
 *
 *   1. start   — check the address is real-looking (valid, a domain that
 *                receives mail, not a throwaway inbox) and not already in use;
 *                store the sign-up as pending and email a 6-digit code.
 *   2. verify  — the code proves the person controls the address. Only then
 *                are the enterprise and its admin account created.
 *
 * Nothing is created before verification. Codes expire after 15 minutes,
 * allow 5 wrong tries, and are stored only as an HMAC. A code can be re-sent
 * once a minute, up to 5 times. Without an email provider, production refuses
 * sign-ups (an unverifiable address can't be accepted); development writes the
 * code to the server log so you can still sign up locally.
 */
import crypto from "crypto";
import dns from "dns/promises";
import bcrypt from "bcrypt";
import prisma from "../../config/database.js";
import { sendEmail, emailConfigured } from "../../lib/email.js";
import { log } from "../../lib/logger.js";
import { bootstrapEnterprise } from "./bootstrap.service.js";

const err = (message, status = 400, extra = {}) => Object.assign(new Error(message), { status, ...extra });
export const CODE_TTL_MS = 15 * 60_000;
export const MAX_ATTEMPTS = 5;
export const MAX_SENDS = 5;
export const RESEND_COOLDOWN_MS = 60_000;

// Throwaway-inbox services. Not exhaustive — the code itself is the real check —
// but it stops the common ones being used to create enterprises.
export const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com", "10minutemail.com", "10minutemail.net",
  "temp-mail.org", "tempmail.com", "tempmail.net", "tempmailo.com", "yopmail.com", "yopmail.net", "trashmail.com",
  "getnada.com", "nada.email", "dispostable.com", "maildrop.cc", "mailnesia.com", "throwawaymail.com", "fakeinbox.com",
  "mintemail.com", "mohmal.com", "emailondeck.com", "spamgourmet.com", "mytemp.email", "tempinbox.com", "burnermail.io",
  "trashmail.de", "mail.tm", "tmpmail.org", "minuteinbox.com", "discard.email", "inboxkitten.com", "moakt.com", "emailfake.com",
]);

/** Swappable in tests (no DNS in a sandbox). */
export const resolver = {
  mx: (domain) => dns.resolveMx(domain),
  a: (domain) => dns.resolve(domain),
};

export const normalizeEmail = (e) => String(e ?? "").trim().toLowerCase();
const hmac = (id, code) => crypto.createHmac("sha256", process.env.JWT_SECRET || "signup").update(`${id}:${code}`).digest("hex");
const sameHash = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const newCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
const mask = (email) => email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}${"•".repeat(Math.min(6, b.length))}${c}`);

/** Is this an address we can accept? Throws a 400 with the reason. */
export async function checkAddress(email) {
  const e = normalizeEmail(email);
  if (!/^[^\s@<>"]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(e)) throw err("Enter a valid email address");
  const domain = e.split("@")[1];
  const parent = domain.split(".").slice(-2).join(".");
  if (DISPOSABLE.has(domain) || DISPOSABLE.has(parent)) throw err("Use your work or personal email — temporary inboxes can't create an enterprise");
  const mx = await resolver.mx(domain).catch(() => []);
  if (mx.some((r) => r.exchange === "" || r.exchange === ".") && mx.length === 1) throw err(`${domain} doesn't accept email`); // RFC 7505 null MX
  if (!mx.length) {
    const a = await resolver.a(domain).catch(() => []);
    if (!a.length) throw err(`We couldn't find a mail server for ${domain}. Check the address for typos.`);
  }
  return e;
}

async function deliver(email, code, name) {
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111">
<p>Hi ${String(name).replace(/[<>&"]/g, "")},</p>
<p>Your ExecUI verification code is:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p>
<p>It expires in 15 minutes. If you didn't try to create an enterprise on ExecUI, ignore this email — nothing has been created.</p></div>`;
  const text = `Your ExecUI verification code is ${code}. It expires in 15 minutes. If you didn't try to create an enterprise on ExecUI, ignore this email.`;
  if (!emailConfigured()) {
    if (process.env.NODE_ENV === "production") throw err("Email verification isn't set up on this server, so sign-ups are closed. Ask the operator to configure RESEND_API_KEY.", 503);
    log.warn?.("signup_code_dev_only", { email, code, note: "RESEND_API_KEY is not set; this code is only logged in development" });
    return;
  }
  const r = await sendEmail({ to: email, subject: `${code} is your ExecUI verification code`, html, text, context: "auth:signup_verification" });
  if (!r.sent) throw err("We couldn't send the verification email. Check the address and try again.", 502);
}

/** Step 1: validate, store pending, email the code. */
export async function startSignup({ company, companyName, email, password, firstName, lastName }, { ip } = {}) {
  const name = String(companyName || company || "").trim();
  if (name.length < 2) throw err("Company name is required");
  if (!password || String(password).length < 8) throw err("Password must be at least 8 characters");
  const addr = await checkAddress(email);
  pruneExpired().catch(() => {});
  if (await prisma.user.findFirst({ where: { email: { equals: addr, mode: "insensitive" } }, select: { id: true } })) {
    throw err("An account with that email already exists.", 409);
  }
  const code = newCode();
  const id = crypto.randomUUID();
  const data = {
    id, email: addr, companyName: name.slice(0, 120),
    firstName: String(firstName || addr.split("@")[0]).trim().slice(0, 60), lastName: String(lastName || "User").trim().slice(0, 60),
    passwordHash: await bcrypt.hash(String(password), 10), codeHash: hmac(id, code), attempts: 0, sends: 1,
    lastSentAt: new Date(), expiresAt: new Date(Date.now() + CODE_TTL_MS), ip: ip ? String(ip).slice(0, 64) : null,
  };
  const prior = await prisma.signupVerification.findUnique({ where: { email: addr } });
  if (prior && prior.expiresAt > new Date() && Date.now() - prior.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    throw err("We just sent a code to this address. Wait a minute before asking for another.", 429);
  }
  // Starting again replaces any earlier pending sign-up for this address.
  await prisma.signupVerification.deleteMany({ where: { email: addr } });
  await prisma.signupVerification.create({ data });
  try {
    await deliver(addr, code, data.firstName);
  } catch (e) {
    await prisma.signupVerification.deleteMany({ where: { id } });
    throw e;
  }
  return { pending: true, email: addr, sentTo: mask(addr), expiresAt: data.expiresAt };
}

/** Send a fresh code (old one stops working). */
export async function resendCode(email) {
  const addr = normalizeEmail(email);
  const p = await prisma.signupVerification.findUnique({ where: { email: addr } });
  if (!p) throw err("Start the sign-up again — that request has expired.", 404);
  if (Date.now() - p.lastSentAt.getTime() < RESEND_COOLDOWN_MS) throw err("Wait a minute before asking for another code.", 429);
  if (p.sends >= MAX_SENDS) throw err("Too many codes sent. Start the sign-up again in a while.", 429);
  const code = newCode();
  await prisma.signupVerification.update({ where: { id: p.id }, data: { codeHash: hmac(p.id, code), attempts: 0, sends: { increment: 1 }, lastSentAt: new Date(), expiresAt: new Date(Date.now() + CODE_TTL_MS) } });
  await deliver(addr, code, p.firstName);
  return { pending: true, email: addr, sentTo: mask(addr), expiresAt: new Date(Date.now() + CODE_TTL_MS) };
}

/** Step 2: check the code and create the enterprise. */
export async function verifySignup({ email, code }) {
  const addr = normalizeEmail(email);
  const c = String(code ?? "").replace(/\D/g, "");
  const p = await prisma.signupVerification.findUnique({ where: { email: addr } });
  if (!p || p.expiresAt < new Date()) {
    if (p) await prisma.signupVerification.deleteMany({ where: { id: p.id } });
    throw err("This code has expired. Start the sign-up again to get a new one.", 410);
  }
  if (c.length !== 6 || !sameHash(hmac(p.id, c), p.codeHash)) {
    // Count the miss atomically, so parallel guesses can't exceed the limit.
    const r = await prisma.signupVerification.updateMany({ where: { id: p.id, attempts: { lt: MAX_ATTEMPTS } }, data: { attempts: { increment: 1 } } });
    const left = MAX_ATTEMPTS - p.attempts - 1;
    if (!r.count || left <= 0) {
      await prisma.signupVerification.deleteMany({ where: { id: p.id } });
      throw err("Too many wrong codes. Start the sign-up again.", 429);
    }
    throw err(`That code isn't right. ${left} attempt${left === 1 ? "" : "s"} left.`, 400);
  }
  // Claim the pending row so the same code can't create two enterprises.
  const claimed = await prisma.signupVerification.deleteMany({ where: { id: p.id } });
  if (!claimed.count) throw err("This sign-up was already completed.", 409);

  const slug = `${p.companyName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-${Date.now()}`;
  const result = await bootstrapEnterprise({
    companyName: p.companyName, companySlug: slug, email: p.email, passwordHash: p.passwordHash,
    firstName: p.firstName, lastName: p.lastName, emailVerifiedAt: new Date(),
  });
  await prisma.auditLog.create({ data: { tenantId: result.tenant.id, userId: result.adminUser.id, action: "enterprise_signup", resource: "auth", detail: `Enterprise created after ${p.email} was verified` } }).catch(() => {});
  return result;
}

/** Clear pending sign-ups that expired without being verified. */
export async function pruneExpired(now = new Date()) {
  const r = await prisma.signupVerification.deleteMany({ where: { expiresAt: { lt: now } } });
  return r.count;
}
