import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { errorHandler } from "./middleware/error.middleware.js";
import { requestLogger } from "./lib/logger.js";
import {
  sanitizeInput, enforceJsonContentType, concurrencyLimiter, requestTimeout,
} from "./middleware/hardening.middleware.js";
import routes from "./routes/index.js";
import { STORAGE_ROOT } from "./lib/storage.js";
import { stripeWebhook } from "./modules/account/account.controller.js";
import prisma from "./config/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Correct client IPs behind a proxy/ingress so rate limiting keys on the real
// address (Retry-After, per-IP budgets, audit logs).
app.set("trust proxy", 1);
app.disable("x-powered-by");

// ── Speed ────────────────────────────────────────────────────────────────────
app.use(compression());

// ── Security headers ─────────────────────────────────────────────────────────
// CORS: when CORS_ORIGINS is set (comma-separated), only those origins may call
// the API cross-origin. Unset ⇒ reflect (fine for the same-origin SPA / dev).
// Auth rides in the Authorization header (no cookies), so credentials stay off.
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin: ALLOWED_ORIGINS.length
    ? (origin, cb) => cb(null, !origin || ALLOWED_ORIGINS.includes(origin))
    : true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  maxAge: 86400,
}));
app.use(helmet({
  contentSecurityPolicy: false,          // SPA is served same-origin
  crossOriginResourcePolicy: false,      // uploaded assets are cross-origin-read
  hsts: { maxAge: 15552000, includeSubDomains: true },
}));

app.use(requestLogger);

// ── Overload protection (shed load before the event loop drowns) ─────────────
app.use(concurrencyLimiter({ max: Number(process.env.MAX_INFLIGHT) || 250 }));
app.use(requestTimeout({ ms: Number(process.env.REQUEST_TIMEOUT_MS) || 25_000 }));

// Global per-IP rate limit — a coarse backstop; auth/write routes add stricter
// limits of their own. Health checks are never limited.
app.use(rateLimit({
  windowMs: 60_000,
  max: Number(process.env.RATE_LIMIT_PER_MIN) || 600,
  standardHeaders: true,
  legacyHeaders: false,
  // Never limit health probes — under both the bare and /api-prefixed paths that
  // orchestrators hit — or a traffic spike would 429 the probes and get the pod
  // wrongly restarted/evicted.
  skip: (req) => /^\/(api\/)?health(\/(live|ready))?$/.test(req.path),
  message: { message: "Too many requests — slow down and try again shortly.", status: 429 },
}));

// Stripe webhook needs the RAW body for signature verification, so it must be
// registered before the JSON body parser runs.
app.post("/api/account/billing/webhook", express.raw({ type: "application/json" }), stripeWebhook);

// ── Body parsing + universal input hygiene ───────────────────────────────────
app.use(enforceJsonContentType);
app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: false, limit: "200kb" }));
app.use(sanitizeInput);   // reject prototype-pollution / oversized payloads

// ── Health checks ────────────────────────────────────────────────────────────
// Liveness: is the process up? (No DB — a DB blip must not restart the pod.)
const live = (_req, res) => res.json({ status: "ok", uptimeSec: Math.round(process.uptime()) });
app.get("/health/live", live);
app.get("/api/health/live", live);

// Readiness / full health: can we actually serve? (DB reachable within 2s.)
const ready = async (_req, res) => {
  const started = Date.now();
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, rej) => setTimeout(() => rej(new Error("db timeout")), 2000)),
    ]);
    res.json({ status: "ok", db: "up", dbMs: Date.now() - started, uptimeSec: Math.round(process.uptime()) });
  } catch (err) {
    res.status(503).json({ status: "degraded", db: "down", error: err.message, uptimeSec: Math.round(process.uptime()) });
  }
};
app.get("/health", ready);
app.get("/health/ready", ready);
app.get("/api/health", ready);

// ── Object storage (uploaded assets served from disk, not the DB) ─────────
app.use("/api/uploads", express.static(STORAGE_ROOT, { maxAge: "7d", immutable: true }));

// ── API routes ────────────────────────────────────────────────────────────
app.use("/api", routes);

// ── Unmatched /api/* always return JSON (never HTML) ─────────────────────
app.use("/api", (_req, res) => {
  res.status(404).json({ message: "Not found" });
});

// ── Serve frontend build (production) ────────────────────────────────────
const distPath = path.resolve(__dirname, "../../frontend/dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback: all non-API routes return index.html
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.use(errorHandler);

export default app;
