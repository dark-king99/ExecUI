import {
    getB2B,
    getCampaign,
    getCommerceCommand,
    getCustomerDataPlatform,
    getEmma,
    getMarketingAi,
    getMarketingAnalytics,
    getMarketingOverview,
    getPersonalization,
    getTeams
  } from "./marketing.service.js";
  
  const tenantIdFrom = (req) => req.user.tenantId;
  
  export const getOverview = async (req, res) => {
    try {
      res.json(await getMarketingOverview(tenantIdFrom(req)));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  export const getMarketingAiView = async (req, res) => {
    try {
      res.json(await getMarketingAi(tenantIdFrom(req)));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  export const getCampaignView = async (req, res) => {
    try {
      res.json(await getCampaign(tenantIdFrom(req)));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  export const getEmmaView = async (req, res) => {
    try {
      res.json(await getEmma(tenantIdFrom(req)));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  export const getB2BView = async (req, res) => {
    try {
      res.json(await getB2B(tenantIdFrom(req)));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  export const getPersonalizationView = async (req, res) => {
    try {
      res.json(await getPersonalization(tenantIdFrom(req)));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  export const getTeamsView = async (req, res) => {
    try {
      res.json(await getTeams(tenantIdFrom(req)));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  export const getAnalyticsView = async (req, res) => {
    try {
      res.json(await getMarketingAnalytics(tenantIdFrom(req)));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  export const getCustomerDataPlatformView = async (req, res) => {
    try {
      res.json(await getCustomerDataPlatform(tenantIdFrom(req)));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  export const getCommerceCommandView = async (req, res) => {
    try {
      res.json(await getCommerceCommand(tenantIdFrom(req)));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };