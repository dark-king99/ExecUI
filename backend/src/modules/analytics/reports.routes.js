/**
 * Custom reporting (BI) routes — mounted at /api/reports.
 *
 * Every route is authenticated; dataset-level authorization happens in the
 * service (department ∩ plan, admin-only for employee data), so a caller can
 * never report on data they couldn't otherwise see.
 */
import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import * as c from "./reports.controller.js";

const router = express.Router();

// Builder metadata: which datasets/fields/operators this caller may use.
router.get("/datasets", authenticate, c.listDatasets);

// Ad-hoc run (live preview in the builder) and export.
router.post("/preview", authenticate, c.preview);
router.post("/export", authenticate, c.exportReport);

// Delivery schedules — registered before the "/:id" report routes so a literal
// "schedules" path can never be swallowed as a report id.
router.get("/schedules", authenticate, c.listSchedules);
router.post("/schedules", authenticate, c.createSchedule);
router.put("/schedules/:id", authenticate, c.updateSchedule);
router.delete("/schedules/:id", authenticate, c.deleteSchedule);
router.post("/schedules/:id/run", authenticate, c.runScheduleNow);

// Saved reports.
router.get("/", authenticate, c.listReports);
router.post("/", authenticate, c.createReport);
router.get("/:id", authenticate, c.getReport);
router.put("/:id", authenticate, c.updateReport);
router.delete("/:id", authenticate, c.deleteReport);
router.post("/:id/run", authenticate, c.runSaved);

export default router;
