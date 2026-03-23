export const networkDatabaseSchema = {
    module: "network",
    entities: {
      NetworkInventory: {
        table: "NetworkInventory",
        primaryKey: "id",
        tenantKey: "tenantId",
        fields: {
          id: "string(uuid)",
          tenantId: "string(uuid)",
          nodes: "number(int)",
          activeConnections: "number(int)",
          status: "string",
          createdAt: "datetime",
          updatedAt: "datetime"
        }
      },
      NetworkSetting: {
        table: "NetworkSetting",
        primaryKey: "id",
        tenantKey: "tenantId",
        fields: {
          id: "string(uuid)",
          tenantId: "string(uuid)",
          key: "string",
          value: "json",
          createdAt: "datetime",
          updatedAt: "datetime"
        }
      },
      NetworkAlert: {
        table: "NetworkAlert",
        primaryKey: "id",
        tenantKey: "tenantId",
        fields: {
          id: "string(uuid)",
          tenantId: "string(uuid)",
          severity: "string(enum:low|medium|high|critical)",
          message: "string",
          acknowledged: "boolean",
          createdAt: "datetime"
        }
      }
    },
    endpointToEntityMap: {
      "GET /api/network": ["NetworkInventory", "NetworkSetting", "NetworkAlert"],
      "GET /api/network/inventory": ["NetworkInventory"],
      "GET /api/network/documentation": ["NetworkSetting"],
      "GET /api/network/alerts": ["NetworkAlert"],
      "GET /api/network/traffic": ["NetworkInventory"],
      "GET /api/network/topology-map": ["NetworkInventory"],
      "GET /api/network/settings": ["NetworkSetting"],
      "POST /api/network/settings": ["NetworkSetting"]
    }
  };
  
  export const updateNetworkSettingsInputSchema = {
    required: ["settings"],
    properties: {
      settings: "object"
    }
  };