import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import * as c from "./analytics.controller.js";

const router = express.Router();
const auth = authenticate;

router.get("/kpis",                       auth, c.getKpis);
router.get("/health-summary",             auth, c.getHealthSummary);
router.get("/revenue-vs-plan",            auth, c.getRevenueVsPlan);
router.get("/operational/services",       auth, c.getOperationalServices);
router.get("/operational/events",         auth, c.getOperationalEvents);
router.get("/cohorts",                    auth, c.getCohorts);
router.get("/retention/by-tier",          auth, c.getRetentionByTier);
router.get("/churn-signals",              auth, c.getChurnSignals);
router.get("/revenue/segments",           auth, c.getRevenueSegments);
router.get("/revenue/expansion",          auth, c.getExpansionPipeline);
router.get("/data-quality/datasets",      auth, c.getDatasets);
router.get("/explorer/queries",           auth, c.getSavedQueries);
router.post("/explorer/run",              auth, c.runQuery);
router.post("/explorer/queries",          auth, c.saveQuery);
router.delete("/explorer/queries/:id",    auth, c.deleteQuery);
router.post("/data-quality/datasets/:id/deduplicate", auth, c.deduplicateDataset);

export default router;
