import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  getAccountView,
  getAnalyticsView,
  getCrmView,
  getHomeView,
  getMarketingView,
  getNetworkView
} from "./views.controller.js";
import { requirePermission } from "../../middleware/permission.middleware.js";

const router = express.Router();

router.get("/home", authenticate, requirePermission("views.home.read"), getHomeView);
router.get("/account", authenticate, requirePermission("views.account.read"), getAccountView);
router.get("/analytics", authenticate, requirePermission("views.analytics.read"), getAnalyticsView);
router.get("/crm", authenticate, requirePermission("views.crm.read"), getCrmView);
router.get("/marketing", authenticate, requirePermission("views.marketing.read"), getMarketingView);
router.get("/network", authenticate, requirePermission("views.network.read"), getNetworkView);

export default router;