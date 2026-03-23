export const marketingDatabaseSchema = {
    module: "marketing",
    entities: {
      MarketingWorkspace: {
        table: "MarketingWorkspace",
        primaryKey: "id",
        tenantKey: "tenantId",
        fields: {
          id: "string(uuid)",
          tenantId: "string(uuid)",
          name: "string",
          createdAt: "datetime",
          updatedAt: "datetime"
        }
      },
      Campaign: {
        table: "Campaign",
        primaryKey: "id",
        tenantKey: "tenantId",
        fields: {
          id: "string(uuid)",
          tenantId: "string(uuid)",
          name: "string",
          channel: "string(enum:email|mobile|ads)",
          status: "string(enum:draft|active|paused|archived)",
          createdAt: "datetime",
          updatedAt: "datetime"
        }
      }
    },
    endpointToEntityMap: {
      "GET /api/marketing": ["MarketingWorkspace", "Campaign"],
      "GET /api/marketing/marketing-ai": ["MarketingWorkspace"],
      "GET /api/marketing/campaign": ["Campaign"],
      "GET /api/marketing/emma": ["Campaign"],
      "GET /api/marketing/b2b": ["Campaign"],
      "GET /api/marketing/personalization": ["MarketingWorkspace"],
      "GET /api/marketing/teams": ["MarketingWorkspace"],
      "GET /api/marketing/analytics": ["Campaign"],
      "GET /api/marketing/customer-data-platform": ["MarketingWorkspace"],
      "GET /api/marketing/commerce-command": ["MarketingWorkspace"]
    }
  };
  