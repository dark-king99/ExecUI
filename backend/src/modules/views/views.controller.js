const buildScreenPayload = (module, screen, extras = {}) => ({
    module,
    screen,
    comingSoon: Boolean(extras.comingSoon),
    message: `${screen} endpoint ready`,
    ...extras
  });
  
  export const getHomeView = (_req, res) => {
    res.json(buildScreenPayload("core", "HomeView"));
  };
  
  export const getAccountView = (_req, res) => {
    res.json(buildScreenPayload("core", "AccountView"));
  };
  
  export const getAnalyticsView = (_req, res) => {
    res.json(buildScreenPayload("core", "AnalyticsView"));
  };
  
  export const getCrmView = (_req, res) => {
    res.json(buildScreenPayload("crm", "CrmView"));
  };
  
  export const getMarketingView = (_req, res) => {
    res.json(buildScreenPayload("marketing", "MarketingView"));
  };
  
  export const getNetworkView = (_req, res) => {
    res.json(buildScreenPayload("network", "NetworkView"));
  };