export const viewsDatabaseSchema = {
    module: "views",
    purpose: "API-to-screen contract metadata",
    entities: {
      ScreenState: {
        table: "ScreenState",
        primaryKey: "id",
        tenantKey: "tenantId",
        fields: {
          id: "string(uuid)",
          tenantId: "string(uuid)",
          module: "string",
          screen: "string",
          payload: "json",
          updatedAt: "datetime"
        }
      }
    },
    endpointToEntityMap: {
      "GET /api/views/home": ["ScreenState"],
      "GET /api/views/account": ["ScreenState"],
      "GET /api/views/analytics": ["ScreenState"],
      "GET /api/views/crm": ["ScreenState"],
      "GET /api/views/marketing": ["ScreenState"],
      "GET /api/views/network": ["ScreenState"]
    }
  };