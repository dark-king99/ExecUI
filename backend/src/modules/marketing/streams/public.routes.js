/**
 * Public Data Streams endpoints, mounted under /api/public/marketing:
 *   GET  /forms/:key          the hosted signup form (link to it or iframe it)
 *   POST /forms/:key          a submission (HTML form post or JSON)
 *   POST /ingest/events       server-to-server events, "Authorization: Bearer mks_…"
 *
 * Forms are open to anyone, so they're rate limited per address and per form,
 * carry a hidden honeypot field that bots fill in, and record consent only
 * when the person ticks the box.
 */
import express from "express";
import prisma from "../../../config/database.js";
import { runUnscoped, runWithTenant } from "../../../lib/tenantContext.js";
import { log } from "../../../lib/logger.js";
import { submitForm, ingestEvents } from "./ingest.js";
import { hashKey } from "./streams.service.js";

const router = express.Router();

// ── Rate limits (per instance; enough to stop a script hammering one form) ──
const hits = new Map();
export function limited(key, max, windowMs = 60_000, now = Date.now()) {
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 50_000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return arr.length > max;
}
export const resetLimits = () => hits.clear();

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const page = (title, body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:480px;margin:8vh auto;padding:0 16px;color:#111;background:#fff}label{display:block;margin:12px 0 4px;font-size:14px}input[type=text],input[type=email]{width:100%;box-sizing:border-box;padding:10px;border:1px solid #ccc;border-radius:8px;font:inherit}.c{display:flex;gap:8px;align-items:flex-start;margin-top:14px;font-size:14px}.c input{margin-top:4px}button{margin-top:18px;font:inherit;padding:10px 18px;border-radius:8px;border:0;background:#111;color:#fff;cursor:pointer}.hp{position:absolute;left:-10000px}.e{color:#b00020;font-size:14px}</style></head><body>${body}</body></html>`;

const secure = (res) => res.set({
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self' https:; frame-ancestors *",
  "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
});

function formHtml(s, error = null, values = {}) {
  const c = s.config ?? {};
  const field = (key, label, type = "text", required = false) =>
    `<label for="${key}">${esc(label)}${required ? " *" : ""}</label><input id="${key}" name="${key}" type="${type}" value="${esc(values[key] ?? "")}"${required ? " required" : ""} maxlength="200">`;
  return page(c.title, `<h1>${esc(c.title)}</h1>${c.intro ? `<p>${esc(c.intro)}</p>` : ""}${error ? `<p class="e">${esc(error)}</p>` : ""}
<form method="post" action="${esc(s.publicKey)}">
${field("email", "Email", "email", true)}
${field("name", "Name", "text", !!c.requireName)}
${(c.fields ?? []).map((f) => field(f.key, f.label, "text", f.required)).join("\n")}
<div class="hp" aria-hidden="true"><label for="website">Leave this empty</label><input id="website" name="website" tabindex="-1" autocomplete="off"></div>
${c.askConsent !== false ? `<div class="c"><input id="consent" name="consent" type="checkbox" value="yes"><label for="consent" style="margin:0">${esc(c.consentText)}</label></div>` : ""}
<button type="submit">${esc(c.button || "Sign up")}</button></form>`);
}

const loadForm = (key) => runUnscoped(() => prisma.marketingDataSource.findFirst({ where: { publicKey: String(key), kind: "form" } }));

router.get("/forms/:key", async (req, res) => {
  const s = await loadForm(req.params.key).catch(() => null);
  secure(res);
  if (!s) return res.status(404).type("html").send(page("Not found", "<h1>Form not found</h1>"));
  if (s.status !== "active") return res.status(410).type("html").send(page("Closed", "<h1>This form is closed</h1>"));
  res.type("html").send(formHtml(s));
});

router.post("/forms/:key", express.urlencoded({ extended: false, limit: "20kb" }), express.json({ limit: "20kb" }), async (req, res) => {
  const wantsJson = req.is("application/json") || /json/.test(req.get("accept") ?? "");
  const reply = (status, payload, html) => (wantsJson ? res.status(status).json(payload) : secure(res).status(status).type("html").send(html));
  const s = await loadForm(req.params.key).catch(() => null);
  if (!s) return reply(404, { message: "Form not found" }, page("Not found", "<h1>Form not found</h1>"));
  if (s.status !== "active") return reply(410, { message: "This form is closed" }, page("Closed", "<h1>This form is closed</h1>"));
  const ip = req.ip;
  if (limited(`ip:${ip}:${s.id}`, 5) || limited(`form:${s.id}`, 300)) {
    return reply(429, { message: "Too many sign-ups from here — try again in a minute" }, formHtml(s, "Too many attempts — please try again in a minute.", req.body));
  }
  const body = req.body ?? {};
  const done = () => (s.config?.redirectUrl && !wantsJson ? res.redirect(303, s.config.redirectUrl) : reply(200, { ok: true, message: s.config?.successMessage }, page(s.config?.title, `<h1>${esc(s.config?.successMessage || "Thanks!")}</h1>`)));
  if (body.website) return done(); // honeypot: look successful, store nothing
  for (const f of s.config?.fields ?? []) {
    if (f.required && !String(body[f.key] ?? "").trim()) return reply(400, { message: `${f.label} is required` }, formHtml(s, `${f.label} is required.`, body));
  }
  try {
    await runWithTenant({ tenantId: s.tenantId }, async () => {
      await submitForm(s, body, { ip, userAgent: req.get("user-agent") });
      await prisma.marketingDataSource.update({ where: { id: s.id }, data: { received: { increment: 1 }, lastReceivedAt: new Date() } });
    });
    return done();
  } catch (e) {
    if ((e.status ?? 500) >= 500) log.warn?.("marketing_form_failed", { sourceId: s.id, error: e.message });
    await runUnscoped(() => prisma.marketingDataSource.update({ where: { id: s.id }, data: { rejected: { increment: 1 } } })).catch(() => {});
    const msg = (e.status ?? 500) < 500 ? e.message : "Something went wrong — please try again.";
    return reply(e.status && e.status < 500 ? e.status : 500, { message: msg }, formHtml(s, msg, body));
  }
});

router.post("/ingest/events", express.json({ limit: "1mb" }), async (req, res) => {
  const m = /^Bearer\s+(mks_[A-Za-z0-9_-]{20,})$/.exec(req.get("authorization") ?? "");
  if (!m) return res.status(401).json({ message: "Send the stream's API key as Authorization: Bearer mks_…" });
  const s = await runUnscoped(() => prisma.marketingDataSource.findFirst({ where: { secretHash: hashKey(m[1]), kind: "api" } })).catch(() => null);
  if (!s) return res.status(401).json({ message: "Unknown or rotated API key" });
  if (s.status !== "active") return res.status(409).json({ message: "This data stream is paused" });
  if (limited(`api:${s.id}`, 120)) return res.status(429).set("Retry-After", "60").json({ message: "Rate limit: 120 requests a minute per stream" });
  try {
    const out = await runWithTenant({ tenantId: s.tenantId }, async () => {
      const r = await ingestEvents(s, req.body?.events);
      await prisma.marketingDataSource.update({
        where: { id: s.id },
        data: { received: { increment: r.accepted }, rejected: { increment: r.rejected.length }, lastReceivedAt: new Date(), lastError: r.rejected[0]?.error ?? null },
      });
      return r;
    });
    res.status(out.rejected.length && !out.accepted && !out.duplicates ? 400 : 200).json(out);
  } catch (e) {
    res.status(e.status ?? 500).json({ message: e.message });
  }
});

export default router;
