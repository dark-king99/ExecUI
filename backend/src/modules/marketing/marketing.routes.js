import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import {
  getAnalyticsView,
  getB2BView,
  getCampaignView,
  getCommerceCommandView,
  getCustomerDataPlatformView,
  getEmmaView,
  getMarketingAiView,
  getOverview,
  getPersonalizationView,
  getTeamsView
} from "./marketing.controller.js";

const router = express.Router();

router.get("/", authenticate, requirePermission("marketing.overview.read"), getOverview);
router.get("/marketing-ai", authenticate, requirePermission("marketing.ai.read"), getMarketingAiView);
router.get("/campaign", authenticate, requirePermission("marketing.campaign.read"), getCampaignView);
router.get("/emma", authenticate, requirePermission("marketing.emma.read"), getEmmaView);
router.get("/b2b", authenticate, requirePermission("marketing.b2b.read"), getB2BView);
router.get("/personalization", authenticate, requirePermission("marketing.personalization.read"), getPersonalizationView);
router.get("/teams", authenticate, requirePermission("marketing.teams.read"), getTeamsView);
router.get("/analytics", authenticate, requirePermission("marketing.analytics.read"), getAnalyticsView);
router.get("/customer-data-platform", authenticate, requirePermission("marketing.cdp.read"), getCustomerDataPlatformView);
router.get("/commerce-command", authenticate, requirePermission("marketing.commerce.read"), getCommerceCommandView);

export default router;
