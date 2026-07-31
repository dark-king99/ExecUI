import { execSync } from "child_process";
import app from "./app.js";
import prisma from "./config/database.js";
import { log } from "./lib/logger.js";
import { shutdownAnalytics } from "./lib/analytics.js";
import { startReportScheduler, stopReportScheduler } from "./modules/reports/reports.schedule.js";
import { startWebhookWorker, stopWebhookWorker } from "./modules/webhooks/webhooks.service.js";
import { startWorkflowEngine, stopWorkflowEngine } from "./modules/workflows/workflows.engine.js";
import { startRetentionScheduler, stopRetentionScheduler } from "./modules/governance/governance.scheduler.js";
import { startClmScheduler, stopClmScheduler } from "./modules/documents/contracts.scheduler.js";
import { startHrScheduler, stopHrScheduler } from "./modules/hr/hr.scheduler.js";
import { startHelpdeskScheduler, stopHelpdeskScheduler } from "./modules/helpdesk/helpdesk.scheduler.js";
import { startTenantScheduler, stopTenantScheduler } from "./modules/tenants/tenants.scheduler.js";
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 5555;

// ── Apply pending migrations on boot ──────────────────────────────────────────
// Keeps the database schema in lockstep with the code on every start, so a
// pulled commit can never run against a drifted database. Non-fatal: if the
// prisma CLI is unavailable (e.g. offline), we log and boot anyway.
function applyMigrations() {
  try {
    execSync("npx prisma migrate deploy", { stdio: "pipe", timeout: 60_000, env: process.env });
    log.info("migrations_applied");
  } catch (err) {
    log.warn("migrations_skipped", {
      hint: "run `npx prisma migrate deploy` manually",
      error: String(err.stderr ?? err.message).slice(0, 300),
    });
  }
}

// ── Keep the server alive ─────────────────────────────────────────────────────
// A single bad request or stray rejection must never take the whole API down.
// Log loudly, but stay up so every other route keeps serving.
process.on("uncaughtException", (err) => {
  console.error("⚠️  Uncaught exception (server staying up):", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("⚠️  Unhandled promise rejection (server staying up):", reason);
});

// ── Ensure PostgreSQL is running before accepting traffic ─────────────────────
async function ensureDatabase(attempt = 1) {
  try {
    await prisma.$connect();
    console.log("✅ Database connected");
  } catch (err) {
    if (attempt <= 2) {
      // Try to start PostgreSQL, then retry
      try {
        console.warn(`⚠️  DB not reachable (attempt ${attempt}). Starting PostgreSQL...`);
        execSync("pg_ctlcluster 16 main start", { stdio: "ignore" });
      } catch {
        // Already running or no pg_ctlcluster — ignore
      }
      setTimeout(() => ensureDatabase(attempt + 1), 3000);
    } else {
      // Keep retrying every 5 s in case DB comes up later
      console.error("❌ Database still not ready — will retry every 5 s");
      setTimeout(() => ensureDatabase(attempt + 1), 5000);
    }
  }
}

applyMigrations();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

ensureDatabase();

// Deliver scheduled report exports on their cadence.
startReportScheduler();

// Capture domain events and deliver outbound webhooks.
startWebhookWorker();

// Run automation rules when records change.
startWorkflowEngine();

// Apply data-retention policies daily.
startRetentionScheduler();

// Contract renewal reminders + signature-envelope expiry, daily.
startClmScheduler();

// Leave-year rollover, plus the leave/payroll approval hooks.
startHrScheduler();

// Expire portal sign-in links and dead customer sessions.
startHelpdeskScheduler();

// Carry out organization deletions whose grace window has elapsed.
startTenantScheduler();

// Flush buffered analytics on graceful shutdown so nothing is lost.
for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, async () => {
    stopReportScheduler();
    stopWebhookWorker();
    stopWorkflowEngine();
    stopRetentionScheduler();
    stopClmScheduler();
    stopHrScheduler();
    stopHelpdeskScheduler();
    stopTenantScheduler();
    await shutdownAnalytics();
    process.exit(0);
  });
}
