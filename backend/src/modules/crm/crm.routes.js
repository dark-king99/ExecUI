import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import {
  getOverview,
  getAccount360View,
  getServicesIntegrationView,
  getPipelineTrackingView,
  getRevenueIntelligenceView,
  getDealCommandCenterView,
  getSmartView,
  getReportsView,
  getTeamView,
  getTeamManagerView,
  getPartnersView,
  getBoardVotingView,
  getDatabaseView,
  getAnalyticsView
} from "./crm.controller.js";

const router = express.Router();

router.get("/crm", authenticate, getOverview);
router.get("/crm/account-360", authenticate, getAccount360View);
router.get("/crm/services-integration", authenticate, getServicesIntegrationView);
router.get("/crm/pipeline-tracking", authenticate, getPipelineTrackingView);
router.get("/crm/revenue-intelligence", authenticate, getRevenueIntelligenceView);
router.get("/crm/deal-command-center", authenticate, requireRole("enterprise_admin", "employee"), getDealCommandCenterView);
router.get("/crm/smart-crm", authenticate, getSmartView);
router.get("/crm/reports", authenticate, getReportsView);
router.get("/crm/team", authenticate, getTeamView);
router.get("/crm/team-manager", authenticate, getTeamManagerView);
router.get("/crm/partners", authenticate, getPartnersView);
router.get("/crm/board-voting", authenticate, getBoardVotingView);
router.get("/crm/database", authenticate, getDatabaseView);
router.get("/crm/analytics", authenticate, getAnalyticsView);

router.post(
  "/team/create",
  authenticate,
  requireRole("enterprise_admin"),
  (_req, res) => {
    res.json({ message: "Team member created" });
  }
);

export default router;