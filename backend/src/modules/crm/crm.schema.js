export const crmDatabaseSchema = {
    module: "crm",
    entities: {
      Contact: {
        table: "Contact",
        primaryKey: "id",
        tenantKey: "tenantId",
        fields: {
          id: "string(uuid)",
          name: "string",
          email: "string(email)",
          tenantId: "string(uuid)",
          createdAt: "datetime"
        }
      }
    },
    endpointToEntityMap: {
      "GET /api/crm": ["Contact"],
      "GET /api/crm/account-360": ["Contact"],
      "GET /api/crm/services-integration": ["Contact"],
      "GET /api/crm/pipeline-tracking": ["Contact"],
      "GET /api/crm/revenue-intelligence": ["Contact"],
      "GET /api/crm/deal-command-center": ["Contact"],
      "GET /api/crm/smart-crm": ["Contact"],
      "GET /api/crm/reports": ["Contact"],
      "GET /api/crm/team": ["Contact"],
      "GET /api/crm/team-manager": ["Contact"],
      "GET /api/crm/partners": ["Contact"],
      "GET /api/crm/board-voting": ["Contact"],
      "GET /api/crm/database": ["Contact"],
      "GET /api/crm/analytics": ["Contact"],
      "GET /api/crm/contacts": ["Contact"],
      "POST /api/crm/contacts": ["Contact"]
    }
  };
  
  export const createContactInputSchema = {
    required: ["name", "email"],
    properties: {
      name: "string(min:1,max:120)",
      email: "string(email)"
    }
  };