import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import * as c from "./network.controller.js";

const router = express.Router();
const auth = authenticate;

// ── Devices ───────────────────────────────────────────────────────────────
router.get("/devices",       auth, c.listDevices);
router.get("/devices/:id",   auth, c.getDevice);
router.put("/devices/:id",   auth, c.updateDevice);

// ── Alerts ────────────────────────────────────────────────────────────────
router.get("/alerts",                       auth, c.listAlerts);
router.post("/alerts/:id/acknowledge",      auth, c.acknowledgeAlert);
router.post("/alerts/:id/resolve",          auth, c.resolveAlert);

// ── Traffic ───────────────────────────────────────────────────────────────
router.get("/traffic/overview",    auth, c.getTrafficOverview);
router.get("/traffic/top-talkers", auth, c.getTopTalkers);
router.get("/traffic/protocols",   auth, c.getTrafficProtocols);
router.get("/traffic/anomalies",   auth, c.getTrafficAnomalies);

// ── Topology ──────────────────────────────────────────────────────────────
router.get("/topology/regions", auth, c.getTopologyRegions);
router.get("/topology/nodes",   auth, c.getTopologyNodes);
router.get("/topology/links",   auth, c.getTopologyLinks);

// ── Incidents ─────────────────────────────────────────────────────────────
router.get("/incidents",                  auth, c.listIncidents);
router.get("/incidents/:id",              auth, c.getIncident);
router.post("/incidents",                 auth, c.createIncident);
router.put("/incidents/:id",              auth, c.updateIncident);
router.get("/incidents/:id/timeline",     auth, c.getIncidentTimeline);
router.post("/incidents/:id/resolve",     auth, c.resolveIncident);
router.post("/incidents/:id/escalate",    auth, c.escalateIncident);

// ── Service health ────────────────────────────────────────────────────────
router.get("/service-health",      auth, c.listServiceHealth);
router.get("/service-health/:id",  auth, c.getServiceHealth);

// ── Capacity ──────────────────────────────────────────────────────────────
router.get("/capacity/links",   auth, c.getCapacityLinks);
router.get("/capacity/summary", auth, c.getCapacitySummary);

// ── Automation ────────────────────────────────────────────────────────────
router.get("/automation/jobs",           auth, c.listAutomationJobs);
router.get("/automation/templates",      auth, c.listAutomationTemplates);
router.post("/automation/jobs/:id/run",  auth, c.runAutomationJob);
router.post("/automation/jobs",          auth, c.createAutomationJob);

// ── Changes ───────────────────────────────────────────────────────────────
router.get("/changes",                  auth, c.listChanges);
router.get("/changes/:id",              auth, c.getChange);
router.post("/changes",                 auth, c.createChange);
router.post("/changes/:id/approve",     auth, c.approveChange);
router.post("/changes/:id/reject",      auth, c.rejectChange);

// ── Docs ──────────────────────────────────────────────────────────────────
router.get("/docs",      auth, c.listDocs);
router.get("/docs/:id",  auth, c.getDoc);

// ── Policies ──────────────────────────────────────────────────────────────
router.get("/policies",            auth, c.listPolicies);
router.post("/policies/:id/check", auth, c.checkPolicy);

// ── Settings ──────────────────────────────────────────────────────────────
router.get("/settings/profiles",       auth, c.listSettingsProfiles);
router.get("/settings/profiles/:id",   auth, c.getSettingsProfile);
router.put("/settings/profiles/:id",   auth, c.updateSettingsProfile);
router.get("/settings",                auth, c.getNetworkSettings);
router.put("/settings",                auth, c.updateNetworkSettings);

export default router;
