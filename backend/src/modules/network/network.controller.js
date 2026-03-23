import {
  getNetworkOverview,
  getNetworkAlerts,
  getNetworkDocumentation,
  getNetworkInventory,
  getNetworkSettings,
  getNetworkTopologyMap,
  getNetworkTraffic,
  updateTenantNetworkSettings
} from "./network.service.js";

const tenantIdFrom = (req) => req.user.tenantId;

export const getOverview = async (req, res) => {
  try {
    res.json(await getNetworkOverview(tenantIdFrom(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getNetworkInventoryView = async (req, res) => {
  try {
    res.json(await getNetworkInventory(tenantIdFrom(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getNetworkDocumentationView = async (req, res) => {
  try {
    res.json(await getNetworkDocumentation(tenantIdFrom(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getNetworkAlertsView = async (req, res) => {
  try {
    res.json(await getNetworkAlerts(tenantIdFrom(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getNetworkTrafficView = async (req, res) => {
  try {
    res.json(await getNetworkTraffic(tenantIdFrom(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getNetworkTopologyMapView = async (req, res) => {
  try {
    res.json(await getNetworkTopologyMap(tenantIdFrom(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getNetworkSettingsView = async (req, res) => {
  try {
    res.json(await getNetworkSettings(tenantIdFrom(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    res.json(await updateTenantNetworkSettings(tenantIdFrom(req), req.body));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};