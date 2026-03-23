import {
  getCrmAccount360,
  getCrmAnalytics,
  getCrmBoardVoting,
  getCrmDatabase,
  getCrmDealCommandCenter,
  getCrmOverview,
  getCrmPartners,
  getCrmPipelineTracking,
  getCrmReports,
  getCrmRevenueIntelligence,
  getCrmServicesIntegration,
  getCrmSmart,
  getCrmTeam,
  getCrmTeamManager
} from "./crm.service.js";

const tenantIdFrom = (req) => req.user.tenantId;

export const getOverview = async (req, res) => {
  try {
    res.json(await getCrmOverview(tenantIdFrom(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAccount360View = async (req, res) => {
  try {
    res.json(await getCrmAccount360(tenantIdFrom(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getServicesIntegrationView = async (req, res) => {
  try {
    res.json(await getCrmServicesIntegration(tenantIdFrom(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPipelineTrackingView = async (req, res) => {
  try {
    res.json(await getCrmPipelineTracking(tenantIdFrom(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRevenueIntelligenceView = async (req, res) => {
  try {
    res.json(await getCrmRevenueIntelligence(tenantIdFrom(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDealCommandCenterView = async (req, res) => {
  try {
    res.json(await getCrmDealCommandCenter(tenantIdFrom(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getSmartView = async (req, res) => {
  try {
    res.json(await getCrmSmart(tenantIdFrom(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getReportsView = async (req, res) => {
  try {
    res.json(await getCrmReports(tenantIdFrom(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTeamView = async (req, res) => {
  try {
    res.json(await getCrmTeam(tenantIdFrom(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTeamManagerView = async (req, res) => {
  try {
    res.json(await getCrmTeamManager(tenantIdFrom(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPartnersView = async (req, res) => {
  try {
    res.json(await getCrmPartners(tenantIdFrom(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getBoardVotingView = async (req, res) => {
  try {
    res.json(await getCrmBoardVoting(tenantIdFrom(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDatabaseView = async (req, res) => {
  try {
    res.json(await getCrmDatabase(tenantIdFrom(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAnalyticsView = async (req, res) => {
  try {
    res.json(await getCrmAnalytics(tenantIdFrom(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};