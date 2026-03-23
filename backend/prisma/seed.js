import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const permissions = [
  { key: "profile.read", description: "Read authenticated user profile" },

  { key: "crm.contact.read", description: "Read CRM contacts" },
  { key: "crm.contact.write", description: "Create and update CRM contacts" },
  { key: "crm.pipeline.manage", description: "Manage CRM pipelines" },

  { key: "user.read", description: "Read tenant users" },
  { key: "user.invite", description: "Invite tenant users" },

  { key: "role.read", description: "Read tenant roles" },
  { key: "role.create", description: "Create tenant roles" },
  { key: "role.permission.assign", description: "Assign permissions to a role" },
  { key: "role.permission.read", description: "Read role permissions" },

  { key: "network.overview.read", description: "Read network overview" },
  { key: "network.inventory.read", description: "Read network inventory" },
  { key: "network.documentation.read", description: "Read network documentation" },
  { key: "network.alerts.read", description: "Read network alerts" },
  { key: "network.traffic.read", description: "Read network traffic" },
  { key: "network.topology.read", description: "Read network topology map" },
  { key: "network.settings.read", description: "Read network settings" },
  { key: "network.settings.write", description: "Update network settings" },

  { key: "views.home.read", description: "Read home view data" },
  { key: "views.account.read", description: "Read account view data" },
  { key: "views.analytics.read", description: "Read analytics view data" },
  { key: "views.crm.read", description: "Read CRM view data" },
  { key: "views.marketing.read", description: "Read marketing view data" },
  { key: "views.network.read", description: "Read network view data" },

  { key: "marketing.overview.read", description: "Read marketing overview" },
  { key: "marketing.ai.read", description: "Read marketing AI data" },
  { key: "marketing.campaign.read", description: "Read marketing campaign data" },
  { key: "marketing.campaign.create", description: "Create marketing campaigns" },

  { key: "marketing.emma.read", description: "Read Emma marketing data" },
  { key: "marketing.b2b.read", description: "Read B2B marketing data" },
  { key: "marketing.personalization.read", description: "Read personalization data" },
  { key: "marketing.teams.read", description: "Read marketing teams data" },
  { key: "marketing.analytics.read", description: "Read marketing analytics" },
  { key: "marketing.cdp.read", description: "Read customer data platform data" },
  { key: "marketing.commerce.read", description: "Read commerce command data" },

  { key: "analytics.dashboard.view", description: "View analytics dashboard" },

  { key: "network.connection.read", description: "Read network connections" }
];

async function main() {
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: {
        description: permission.description
      },
      create: permission
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });