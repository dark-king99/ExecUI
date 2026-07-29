/**
 * Public signing portal API — mounted at /api/sign.
 *
 * These four endpoints are the only unauthenticated write surface in the
 * product, because a counterparty signing your contract has no account and
 * shouldn't need one. Everything that follows from that:
 *
 *   • Authorization is the token in the URL and nothing else. No session, no
 *     tenant header, no ids accepted from the caller — the token resolves to
 *     exactly one signer on exactly one envelope.
 *   • Rate-limited per IP, tighter than the global limit: a signing token is a
 *     256-bit secret, and this makes guessing pointless rather than merely
 *     impractical.
 *   • Responses never leak whether a token *was* valid once. An expired or
 *     consumed link and a fabricated one are both "not valid".
 *   • The signer's IP and user agent are recorded — they're evidence, and the
 *     signer is told as much on the page.
 */
import express from "express";
import rateLimit from "express-rate-limit";
import { ipKeyGenerator } from "express-rate-limit";
import * as signatures from "./signatures.service.js";

const router = express.Router();

const limiter = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.SIGN_RATE_LIMIT_PER_MIN) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  message: { message: "Too many attempts — wait a minute and try again." },
});

router.use(limiter);

// Where the signer is signing from. Evidence, so it goes on the record.
const from = (req) => ({
  ip: req.ip,
  userAgent: req.get("user-agent"),
});

const handle = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (err) { res.status(err.status ?? 500).json({ message: err.message }); }
};

// Open the document.
router.get("/:token", handle((req) => signatures.viewByToken(req.params.token, from(req))));

// Sign it — requires a typed name and explicit consent (see the service).
router.post("/:token/sign", handle((req) => signatures.signByToken(req.params.token, {
  signatureName: req.body?.signatureName,
  consent: req.body?.consent === true,
  ...from(req),
})));

// Decline it.
router.post("/:token/decline", handle((req) => signatures.declineByToken(req.params.token, {
  reason: req.body?.reason,
  ...from(req),
})));

export default router;
