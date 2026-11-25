-- Drop the tables behind features that were removed:
--   ApiToken, WebhookEndpoint, WebhookDelivery  the public API and outbound webhooks
--   PlatformInvoice                              manual bank-transfer invoices
--   BizClient, BizCampaign                       Business Services' copies of CRM and Marketing
--   BizWorkflow                                  Business Services' copy of workflow automation
--   BizMember                                    Business Services' separate team roster
-- All of them were empty when this was written. Dropping a table deletes its
-- rows, so this cannot be undone by rolling back code.

-- The "Webhook deliveries" retention category went with its table. A saved
-- policy for it would only show up as an orphan in Compliance.
DELETE FROM "RetentionPolicy" WHERE "category" = 'webhook_deliveries';

-- DropForeignKey
ALTER TABLE "WebhookDelivery" DROP CONSTRAINT "WebhookDelivery_endpointId_fkey";
ALTER TABLE "WebhookDelivery" DROP CONSTRAINT "WebhookDelivery_tenantId_fkey";
ALTER TABLE "WebhookEndpoint" DROP CONSTRAINT "WebhookEndpoint_tenantId_fkey";
ALTER TABLE "ApiToken" DROP CONSTRAINT "ApiToken_tenantId_fkey";
ALTER TABLE "PlatformInvoice" DROP CONSTRAINT "PlatformInvoice_tenantId_fkey";
ALTER TABLE "BizClient" DROP CONSTRAINT "BizClient_tenantId_fkey";
ALTER TABLE "BizCampaign" DROP CONSTRAINT "BizCampaign_tenantId_fkey";
ALTER TABLE "BizWorkflow" DROP CONSTRAINT "BizWorkflow_tenantId_fkey";
ALTER TABLE "BizMember" DROP CONSTRAINT "BizMember_tenantId_fkey";

-- DropTable
DROP TABLE "WebhookDelivery";
DROP TABLE "WebhookEndpoint";
DROP TABLE "ApiToken";
DROP TABLE "PlatformInvoice";
DROP TABLE "BizClient";
DROP TABLE "BizCampaign";
DROP TABLE "BizWorkflow";
DROP TABLE "BizMember";
