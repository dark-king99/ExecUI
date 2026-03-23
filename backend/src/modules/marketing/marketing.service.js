const buildMarketingPayload = (tenantId, screen, extras = {}) => ({
    tenantId,
    module: "marketing",
    screen,
    comingSoon: Boolean(extras.comingSoon),
    ...extras
  });
  
  export const getMarketingOverview = async (tenantId) => {
    return buildMarketingPayload(tenantId, "MarketingView", {
      sections: [
        "MarketingAI",
        "Campaign",
        "EMMA",
        "B2B",
        "Personalization",
        "Teams",
        "Marketing Analytics",
        "CustomerDataPlatform",
        "CommerceCommand"
      ]
    });
  };
  
  export const getMarketingAi = async (tenantId) => {
    return buildMarketingPayload(tenantId, "MarketingAI", {
      tool: "Marketing AI Tool"
    });
  };
  
  export const getCampaign = async (tenantId) => {
    return buildMarketingPayload(tenantId, "Campaign");
  };
  
  export const getEmma = async (tenantId) => {
    return buildMarketingPayload(tenantId, "EMMA", {
      channels: ["Email", "Mobile", "Advertisement"]
    });
  };
  
  export const getB2B = async (tenantId) => {
    return buildMarketingPayload(tenantId, "B2B", {
      capability: "B2B Marketing Automation"
    });
  };
  
  export const getPersonalization = async (tenantId) => {
    return buildMarketingPayload(tenantId, "Personalization");
  };
  
  export const getTeams = async (tenantId) => {
    return buildMarketingPayload(tenantId, "Teams");
  };
  
  export const getMarketingAnalytics = async (tenantId) => {
    return buildMarketingPayload(tenantId, "Marketing Analytics", {
      comingSoon: true
    });
  };
  
  export const getCustomerDataPlatform = async (tenantId) => {
    return buildMarketingPayload(tenantId, "CustomerDataPlatform");
  };
  
  export const getCommerceCommand = async (tenantId) => {
    return buildMarketingPayload(tenantId, "CommerceCommand");
  };