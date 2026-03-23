import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import {
  getNetworkAlertsView,
  getOverview,
  getNetworkDocumentationView,
  getNetworkInventoryView,
  getNetworkSettingsView,
  getNetworkTopologyMapView,
  getNetworkTrafficView,
  updateSettings
} from "./network.controller.js";

const router = express.Router();

router.get("/network", authenticate, requirePermission("network.overview.read"), getOverview);
router.get("/network/inventory", authenticate, requireRole("enterprise_admin", "employee"), requirePermission("network.inventory.read"), getNetworkInventoryView);
router.get("/network/documentation", authenticate, requirePermission("network.documentation.read"), getNetworkDocumentationView);
router.get("/network/alerts", authenticate, requirePermission("network.alerts.read"), getNetworkAlertsView);
router.get("/network/traffic", authenticate, requirePermission("network.traffic.read"), getNetworkTrafficView);
router.get("/network/topology-map", authenticate, requirePermission("network.topology.read"), getNetworkTopologyMapView);
router.get("/network/settings", authenticate, requirePermission("network.settings.read"), getNetworkSettingsView);

router.post(
  "/settings",
  authenticate,
  requireRole("enterprise_admin"),
  requirePermission("network.settings.write"),
  updateSettings
);

export default router;