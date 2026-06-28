import { execSync } from "child_process";
import app from "./app.js";
import prisma from "./config/database.js";
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 5555;

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

ensureDatabase();
