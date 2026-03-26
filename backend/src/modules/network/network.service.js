// All network services return tenant-scoped data.
// Resources not yet in the database return safe empty/zero shapes.

const stub    = () => Promise.resolve([]);
const stubObj = (shape = {}) => () => Promise.resolve(shape);

// ── Devices ───────────────────────────────────────────────────────────────
export const listDevices   = stub;
export const getDevice     = stubObj({});
export const updateDevice  = stubObj({});

// ── Alerts ────────────────────────────────────────────────────────────────
export const listAlerts         = stub;
export const acknowledgeAlert   = stubObj({ acknowledged: true });
export const resolveAlert       = stubObj({ resolved: true });

// ── Traffic ───────────────────────────────────────────────────────────────
export const getTrafficOverview  = stubObj({ inboundMbps: 0, outboundMbps: 0, totalMbps: 0 });
export const getTopTalkers       = stub;
export const getTrafficProtocols = stub;
export const getTrafficAnomalies = stub;

// ── Topology ──────────────────────────────────────────────────────────────
export const getTopologyRegions = stub;
export const getTopologyNodes   = stub;
export const getTopologyLinks   = stub;

// ── Incidents ─────────────────────────────────────────────────────────────
export const listIncidents     = stub;
export const getIncident       = stubObj({});
export const createIncident    = stubObj({});
export const updateIncident    = stubObj({});
export const getIncidentTimeline = stub;
export const resolveIncident   = stubObj({ resolved: true });
export const escalateIncident  = stubObj({ escalated: true });

// ── Service health ────────────────────────────────────────────────────────
export const listServiceHealth = stub;
export const getServiceHealth  = stubObj({});

// ── Capacity ──────────────────────────────────────────────────────────────
export const getCapacityLinks   = stub;
export const getCapacitySummary = stubObj({ avgUtil: 0, critical: 0, warning: 0, total: 0 });

// ── Automation ────────────────────────────────────────────────────────────
export const listAutomationJobs      = stub;
export const listAutomationTemplates = stub;
export const runAutomationJob        = stubObj({ started: true });
export const createAutomationJob     = stubObj({});

// ── Changes ───────────────────────────────────────────────────────────────
export const listChanges   = stub;
export const getChange     = stubObj({});
export const createChange  = stubObj({});
export const approveChange = stubObj({ approved: true });
export const rejectChange  = stubObj({ rejected: true });

// ── Docs ──────────────────────────────────────────────────────────────────
export const listDocs = stub;
export const getDoc   = stubObj({});

// ── Policies ──────────────────────────────────────────────────────────────
export const listPolicies  = stub;
export const checkPolicy   = stubObj({ compliant: true });

// ── Settings ──────────────────────────────────────────────────────────────
export const getNetworkSettings    = stubObj({});
export const updateNetworkSettings = stubObj({ updated: true });
export const listSettingsProfiles  = stub;
export const getSettingsProfile    = stubObj({});
export const updateSettingsProfile = stubObj({ updated: true });
