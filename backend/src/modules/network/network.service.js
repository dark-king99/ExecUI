const buildNetworkPayload = (tenantId, screen, extras = {}) => ({
  tenantId,
  module: "network",
  screen,
  ...extras
});

export const getNetworkOverview = async (tenantId) => {
  return buildNetworkPayload(tenantId, "NetworkView", {
    sections: ["Inventory", "Documentation", "Alerts", "Traffic", "TopologyMap", "Settings"]
  });
};

export const getNetworkInventory = async (tenantId) => {
  return buildNetworkPayload(tenantId, "Inventory", {
    nodes: 0,
    activeConnections: 0,
    status: "ok"
  });
};

export const getNetworkDocumentation = async (tenantId) => {
  return buildNetworkPayload(tenantId, "Documentation");
};

export const getNetworkAlerts = async (tenantId) => {
  return buildNetworkPayload(tenantId, "Alerts", {
    openAlerts: 0,
    severity: "none"
  });
};

export const getNetworkTraffic = async (tenantId) => {
  return buildNetworkPayload(tenantId, "Traffic", {
    throughputMbps: 0
  });
};

export const getNetworkTopologyMap = async (tenantId) => {
  return buildNetworkPayload(tenantId, "TopologyMap");
};

export const getNetworkSettings = async (tenantId) => {
  return buildNetworkPayload(tenantId, "Settings", {
    settings: {}
  });
};

export const updateTenantNetworkSettings = async (tenantId, payload) => {
  return buildNetworkPayload(tenantId, "Settings", {
    settings: payload,
    updatedAt: new Date().toISOString()
  });
};