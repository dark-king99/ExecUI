import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { errorHandler } from "./middleware/error.middleware.js";
import routes from "./routes/index.js";
import { STORAGE_ROOT } from "./lib/storage.js";
import { stripeWebhook } from "./modules/account/account.controller.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors());
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));

// Stripe webhook needs the RAW body for signature verification, so it must be
// registered before the JSON body parser runs.
app.post("/api/account/billing/webhook", express.raw({ type: "application/json" }), stripeWebhook);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
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
