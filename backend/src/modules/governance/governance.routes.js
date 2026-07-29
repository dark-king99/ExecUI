/**
 * Compliance & data governance routes — mounted at /api/governance.
 *
 * Admin-only throughout: exporting or erasing a person's data, changing how
 * long records are kept, and placing legal holds are all acts with legal weight.
 */
import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import * as svc from "./governance.service.js";

const router = express.Router();
const uid = (req) => req.user.userId;

const handle = (fn, status = 200) => async (req, res) => {
  try { res.status(status).json(await fn(req)); }
  catch (err) { res.status(err.status ?? 500).json({ message: err.message, requestId: err.requestId }); }
};

router.use(authenticate, requireRole("enterprise_admin", "system_admin"));

router.get("/catalog", handle(() => svc.catalog()));

// ── Data-subject requests ────────────────────────────────────────────────────
router.get("/subject", handle((req) => svc.findSubject(req.query.email)));
router.get("/requests", handle((req) => svc.listRequests({ limit: req.query.limit })));
router.get("/requests/:id", handle((req) => svc.getRequest(req.params.id)));
router.post("/export", handle((req) => svc.exportSubject(uid(req), req.body?.email), 201));
router.post("/erase", handle((req) => svc.eraseSubject(uid(req), req.body?.email, { note: req.body?.note }), 201));

// Download an export bundle as a JSON file (portable, machine-readable).
router.get("/requests/:id/download", async (req, res) => {
  try {
    const request = await svc.getRequest(req.params.id);
    if (request.type !== "export") return res.status(400).json({ message: "Only export requests have a downloadable bundle." });
    const name = `data-export-${request.subjectEmail.replace(/[^a-z0-9]/gi, "-")}-${request.createdAt.toISOString().slice(0, 10)}.json`;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    res.send(JSON.stringify(request.result, null, 2));
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
});

// ── Retention ────────────────────────────────────────────────────────────────
router.get("/retention", handle(() => svc.listPolicies()));
router.put("/retention", handle((req) => svc.upsertPolicy(uid(req), req.body)));
router.delete("/retention/:id", handle((req) => svc.deletePolicy(req.params.id)));
router.get("/retention/preview", handle(() => svc.previewRetention()));
router.post("/retention/run", handle(() => svc.runRetention()));

// ── Legal holds ──────────────────────────────────────────────────────────────
router.get("/holds", handle(() => svc.listHolds()));
router.post("/holds", handle((req) => svc.placeHold(uid(req), req.body), 201));
router.post("/holds/:id/release", handle((req) => svc.releaseHold(uid(req), req.params.id)));

export default router;
