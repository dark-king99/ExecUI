import * as svc from "./network.service.js";

const tid = (req) => req.user.tenantId;

const handle = (fn) => async (req, res) => {
  try {
    res.json(await fn(req, res));
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
};

// Dashboard
export const getDashboardOverview = handle((req) => svc.getDashboardOverview(tid(req)));
export const getDeviceUsage       = handle((req) => svc.getDeviceUsage(tid(req)));
export const getStorageStats      = handle((req) => svc.getStorageStats(tid(req)));

// Devices
export const listDevices   = handle((req) => svc.listDevices(tid(req), req.query));
export const getDevice     = handle((req) => svc.getDevice(tid(req), req.params.id));
export const createDevice  = handle((req) => svc.createDevice(tid(req), req.body));
export const updateDevice  = handle((req) => svc.updateDevice(tid(req), req.params.id, req.body));
export const deleteDevice  = handle((req) => svc.deleteDevice(tid(req), req.params.id));

// Alerts
export const listAlerts       = handle((req) => svc.listAlerts(tid(req), req.query));
export const createAlert      = handle((req) => svc.createAlert(tid(req), req.body));
export const acknowledgeAlert = handle((req) => svc.acknowledgeAlert(tid(req), req.params.id));
export const resolveAlert     = handle((req) => svc.resolveAlert(tid(req), req.params.id));

// Traffic
export const getTrafficOverview  = handle((req) => svc.getTrafficOverview(tid(req)));
export const getTopTalkers       = handle((req) => svc.getTopTalkers(tid(req)));
export const getTrafficProtocols = handle((req) => svc.getTrafficProtocols(tid(req)));
export const getTrafficAnomalies = handle((req) => svc.getTrafficAnomalies(tid(req)));

// Topology
export const getTopologyRegions = handle((req) => svc.getTopologyRegions(tid(req)));
export const getTopologyNodes   = handle((req) => svc.getTopologyNodes(tid(req)));
export const getTopologyLinks   = handle((req) => svc.getTopologyLinks(tid(req)));

// Incidents
export const listIncidents       = handle((req) => svc.listIncidents(tid(req), req.query));
export const getIncident         = handle((req) => svc.getIncident(tid(req), req.params.id));
export const createIncident      = handle((req) => svc.createIncident(tid(req), req.body));
export const updateIncident      = handle((req) => svc.updateIncident(tid(req), req.params.id, req.body));
export const getIncidentTimeline = handle((req) => svc.getIncidentTimeline(tid(req), req.params.id));
export const resolveIncident     = handle((req) => svc.resolveIncident(tid(req), req.params.id));
export const escalateIncident    = handle((req) => svc.escalateIncident(tid(req), req.params.id));

// Service health
export const listServiceHealth = handle((req) => svc.listServiceHealth(tid(req)));
export const getServiceHealth  = handle((req) => svc.getServiceHealth(tid(req), req.params.id));

// Capacity
export const getCapacityLinks   = handle((req) => svc.getCapacityLinks(tid(req)));
export const getCapacitySummary = handle((req) => svc.getCapacitySummary(tid(req)));

// Automation
export const listAutomationJobs      = handle((req) => svc.listAutomationJobs(tid(req), req.query));
export const listAutomationTemplates = handle((req) => svc.listAutomationTemplates(tid(req)));
export const runAutomationJob        = handle((req) => svc.runAutomationJob(tid(req), req.params.id));
export const createAutomationJob     = handle((req) => svc.createAutomationJob(tid(req), req.body));
export const deleteAutomationJob     = handle((req) => svc.deleteAutomationJob(tid(req), req.params.id));

// Changes
export const listChanges   = handle((req) => svc.listChanges(tid(req), req.query));
export const getChange     = handle((req) => svc.getChange(tid(req), req.params.id));
export const createChange  = handle((req) => svc.createChange(tid(req), req.body));
export const approveChange = handle((req) => svc.approveChange(tid(req), req.params.id));
export const rejectChange  = handle((req) => svc.rejectChange(tid(req), req.params.id));

// Backups
export const listBackups  = handle((req) => svc.listBackups(tid(req), req.query));
export const createBackup = handle((req) => svc.createBackup(tid(req), req.body));

// Docs
export const listDocs = handle((req) => svc.listDocs(tid(req)));
export const getDoc   = handle((req) => svc.getDoc(tid(req), req.params.id));

// Policies
export const listPolicies = handle((req) => svc.listPolicies(tid(req)));
export const checkPolicy  = handle((req) => svc.checkPolicy(tid(req), req.params.id));

// Settings
export const getNetworkSettings    = handle((req) => svc.getNetworkSettings(tid(req)));
export const updateNetworkSettings = handle((req) => svc.updateNetworkSettings(tid(req), req.body));
export const listSettingsProfiles  = handle((req) => svc.listSettingsProfiles(tid(req)));
export const getSettingsProfile    = handle((req) => svc.getSettingsProfile(tid(req), req.params.id));
export const updateSettingsProfile = handle((req) => svc.updateSettingsProfile(tid(req), req.params.id, req.body));

// Servers
export const listServers       = handle((req) => svc.listServers(tid(req), req.query));
export const getServer         = handle((req) => svc.getServer(tid(req), req.params.id));
export const createServer      = handle((req) => svc.createServer(tid(req), req.body));
export const updateServer      = handle((req) => svc.updateServer(tid(req), req.params.id, req.body));
export const deleteServer      = handle((req) => svc.deleteServer(tid(req), req.params.id));
export const restartServer     = handle((req) => svc.restartServer(tid(req), req.params.id));
export const syncServerMetrics = handle((req) => svc.syncServerMetrics(tid(req), req.params.id));
export const getServerMetrics  = handle((req) => svc.getServerMetrics(tid(req)));

// Monitor
export const getMonitorOverview = handle((req) => svc.getMonitorOverview(tid(req)));
export const getMonitorMetrics  = handle((req) => svc.getMonitorMetrics(tid(req)));
export const getMonitorEvents   = handle((req) => svc.getMonitorEvents(tid(req)));

// User Restrictions
export const listRestrictions  = handle((req) => svc.listRestrictions(tid(req), req.query));
export const getRestriction    = handle((req) => svc.getRestriction(tid(req), req.params.id));
export const createRestriction = handle((req) => svc.createRestriction(tid(req), req.body));
export const updateRestriction = handle((req) => svc.updateRestriction(tid(req), req.params.id, req.body));
export const deleteRestriction = handle((req) => svc.deleteRestriction(tid(req), req.params.id));
export const toggleRestriction = handle((req) => svc.toggleRestriction(tid(req), req.params.id));

// Firewall
export const listFirewallRules  = handle((req) => svc.listFirewallRules(tid(req), req.query));
export const getFirewallRule    = handle((req) => svc.getFirewallRule(tid(req), req.params.id));
export const createFirewallRule = handle((req) => svc.createFirewallRule(tid(req), req.body));
export const updateFirewallRule = handle((req) => svc.updateFirewallRule(tid(req), req.params.id, req.body));
export const deleteFirewallRule = handle((req) => svc.deleteFirewallRule(tid(req), req.params.id));
export const toggleFirewallRule = handle((req) => svc.toggleFirewallRule(tid(req), req.params.id));
export const getFirewallZones   = handle((req) => svc.getFirewallZones(tid(req)));
export const getFirewallLogs    = handle((req) => svc.getFirewallLogs(tid(req)));

// Global sync
export const syncAllNetwork = handle((req) => svc.syncAllNetwork(tid(req)));
