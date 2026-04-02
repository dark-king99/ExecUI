import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import * as c from "./service.controller.js";

const router = express.Router();
const auth = authenticate;

router.get("/dashboard/overview",       auth, c.getDashboardOverview);
router.get("/catalog",                  auth, c.listCatalogItems);
router.post("/catalog",                 auth, c.createCatalogItem);
router.get("/requests",                 auth, c.listRequests);
router.post("/requests",                auth, c.createRequest);
router.get("/requests/:id",             auth, c.getRequest);
router.patch("/requests/:id/status",    auth, c.updateRequestStatus);
router.get("/approvals/pending",        auth, c.listPendingApprovals);
router.post("/approvals/:id/approve",   auth, c.approveRequest);
router.post("/approvals/:id/reject",    auth, c.rejectRequest);
router.get("/knowledge",                auth, c.listKBArticles);
router.post("/knowledge",               auth, c.createKBArticle);
router.get("/reports/summary",          auth, c.getReportsSummary);
router.get("/sla",                      auth, c.getSLAStats);
router.get("/settings",                 auth, c.getSettings);
router.put("/settings",                 auth, c.updateSettings);

export default router;
