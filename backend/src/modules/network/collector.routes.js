/**
 * The collector's API — mounted at /api/collector, outside the session check.
 *
 * A collector authenticates with its own bearer token (`exc_…`), never a user
 * session, and can do exactly three things: say hello, read its configuration,
 * and post what it found. A revoked token stops working immediately.
 */
import express from "express";
import { collectorForToken, collectorConfig, ingestReport } from "./network.collectors.js";
import { log } from "../../lib/logger.js";

const router = express.Router();

// Reports can be large (thousands of devices); this router parses its own body.
router.use(express.json({ limit: "5mb" }));

router.use(async (req, res, next) => {
  const token = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const collector = await collectorForToken(token).catch(() => null);
  if (!collector) return res.status(401).json({ message: "Unknown or revoked collector token" });
  req.collector = collector;
  next();
});

const handle = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (e) {
    log.warn?.("collector_request_failed", { collectorId: req.collector?.id, error: e.message });
    res.status(e.status ?? 500).json({ message: e.message });
  }
};

router.post("/hello",  handle((req) => collectorConfig(req.collector, req.body ?? {})));
router.get("/config",  handle((req) => collectorConfig(req.collector)));
router.post("/report", handle((req) => ingestReport(req.collector, req.body ?? {})));

export default router;
