import prisma from "../../config/database.js";

const buildCrmScreenPayload = (tenantId, screen, extras = {}) => ({
  tenantId,
  module: "crm",
  screen,
  comingSoon: Boolean(extras.comingSoon),
  ...extras
});

export const getCrmOverview = async (tenantId) => {
  return buildCrmScreenPayload(tenantId, "CrmView", {
    sections: [
      "Account360",
      "ServicesIntegration",
      "PipelineTracking",
      "RevenueIntelligence",
      "DealCommandCenter",
      "SmartCRM",
      "Reports",
      "Team",
      "TeamManager",
      "Partners",
      "BoardVoting",
      "Database",
      "CRM Analytics"
    ]
  });
};

export const getCrmAccount360 = async (tenantId) => {
  return buildCrmScreenPayload(tenantId, "Account360");
};

export const getCrmServicesIntegration = async (tenantId) => {
  return buildCrmScreenPayload(tenantId, "ServicesIntegration");
};

export const getCrmPipelineTracking = async (tenantId) => {
  return buildCrmScreenPayload(tenantId, "PipelineTracking");
};

export const getCrmRevenueIntelligence = async (tenantId) => {
  return buildCrmScreenPayload(tenantId, "RevenueIntelligence");
};

export const getCrmDealCommandCenter = async (tenantId) => {
  return buildCrmScreenPayload(tenantId, "DealCommandCenter");
};

export const getCrmSmart = async (tenantId) => {
  return buildCrmScreenPayload(tenantId, "SmartCRM");
};

export const getCrmReports = async (tenantId) => {
  return buildCrmScreenPayload(tenantId, "Reports", {
    integration: "Reports Management sync with Customer software"
  });
};

export const getCrmTeam = async (tenantId) => {
  return buildCrmScreenPayload(tenantId, "Team");
};

export const getCrmTeamManager = async (tenantId) => {
  return buildCrmScreenPayload(tenantId, "TeamManager");
};

export const getCrmPartners = async (tenantId) => {
  return buildCrmScreenPayload(tenantId, "Partners");
};

export const getCrmBoardVoting = async (tenantId) => {
  return buildCrmScreenPayload(tenantId, "BoardVoting");
};

export const getCrmDatabase = async (tenantId) => {
  return buildCrmScreenPayload(tenantId, "Database");
};

export const getCrmAnalytics = async (tenantId) => {
  return buildCrmScreenPayload(tenantId, "CRM Analytics", {
    comingSoon: true
  });
};

export const findContactsByTenant = async (tenantId) => {
  return prisma.contact.findMany({
    where: { tenantId }
  });
};

export const createTenantContact = async (tenantId, payload) => {
  const { name, email, key } = payload;

  return prisma.contact.create({
    data: {
      name,
      email,
      key: key || `contact-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      tenantId
    }
  });
};