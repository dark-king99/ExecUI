/**
 * Public marketing endpoints — mounted at /api/public/marketing, before the
 * app's body parsers and session check:
 *   POST /email/events            provider webhooks (signature-verified, raw body)
 *   GET  /unsubscribe/:token      confirmation page
 *   POST /unsubscribe/:token      unsubscribe (form button, or RFC 8058 one-click)
 */
import express from "express";
import { verifySvix, handleProviderEvent, unsubscribeByToken, unsubscribePage, logWebhookFailure } from "./webhook.js";
import { verifyUnsubscribeToken } from "./render.js";

const router = express.Router();

router.post("/email/events", express.raw({ type: "*/*", limit: "1mb" }), async (req, res) => {
  const raw = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
  if (!verifySvix(raw, req.headers)) { logWebhookFailure("bad signature"); return res.status(401).json({ message: "Invalid signature" }); }
  try {
    const out = await handleProviderEvent(JSON.parse(raw), req.headers["svix-id"]);
    res.json({ ok: true, ...out });
  } catch (e) {
    // 5xx makes the provider retry; the idempotency key makes the retry safe.
    res.status(500).json({ message: e.message });
  }
});

router.get("/unsubscribe/:token", (req, res) => {
  const valid = !!verifyUnsubscribeToken(req.params.token);
  res.type("html").send(unsubscribePage({ invalid: !valid, token: req.params.token }));
});

router.post("/unsubscribe/:token", express.urlencoded({ extended: false, limit: "10kb" }), async (req, res) => {
  const r = await unsubscribeByToken(req.params.token).catch(() => ({ ok: false }));
  res.status(r.ok ? 200 : 400).type("html").send(unsubscribePage({ done: r.ok, invalid: !r.ok, email: r.email }));
});

export default router;
