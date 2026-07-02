import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { errorHandler } from "./middleware/error.middleware.js";
import { requestLogger } from "./lib/logger.js";
import routes from "./routes/index.js";
import { STORAGE_ROOT } from "./lib/storage.js";
import { stripeWebhook } from "./modules/account/account.controller.js";
import prisma from "./config/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors());
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(requestLogger);

// Stripe webhook needs the RAW body for signature verification, so it must be
// registered before the JSON body parser runs.
app.post("/api/account/billing/webhook", express.raw({ type: "application/json" }), stripeWebhook);

app.use(express.json({ limit: "200kb" }));

// Health actually checks the database — a 200 here means the API can serve.
app.get("/health", async (_req, res) => {
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
});

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
