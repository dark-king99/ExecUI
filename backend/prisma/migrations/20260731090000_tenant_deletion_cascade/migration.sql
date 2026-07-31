-- Tenant deletion cascade.
--
-- 50 of the tenant foreign keys already declared ON DELETE CASCADE; these 36
-- predate that convention and were left at Prisma's default (RESTRICT), which
-- is why `DELETE FROM "Tenant"` failed on the first of them. Nothing about
-- reads or writes changes — only what happens when a Tenant row is removed.
--
-- Deleting an organization is guarded in the application layer (typed-name
-- confirmation, legal-hold refusal, and a grace window before the purge runs);
-- this migration is what makes that purge a single statement instead of a
-- hand-maintained walk over 86 tables.

ALTER TABLE "User" DROP CONSTRAINT "User_tenantId_fkey";
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserSession" DROP CONSTRAINT "UserSession_tenantId_fkey";
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_tenantId_fkey";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Role" DROP CONSTRAINT "Role_tenantId_fkey";
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Contact" DROP CONSTRAINT "Contact_tenantId_fkey";
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CrmTask" DROP CONSTRAINT "CrmTask_tenantId_fkey";
ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CrmTicket" DROP CONSTRAINT "CrmTicket_tenantId_fkey";
ALTER TABLE "CrmTicket" ADD CONSTRAINT "CrmTicket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CrmFollowUp" DROP CONSTRAINT "CrmFollowUp_tenantId_fkey";
ALTER TABLE "CrmFollowUp" ADD CONSTRAINT "CrmFollowUp_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CrmOpportunity" DROP CONSTRAINT "CrmOpportunity_tenantId_fkey";
ALTER TABLE "CrmOpportunity" ADD CONSTRAINT "CrmOpportunity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CrmServiceUsage" DROP CONSTRAINT "CrmServiceUsage_tenantId_fkey";
ALTER TABLE "CrmServiceUsage" ADD CONSTRAINT "CrmServiceUsage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketingTodo" DROP CONSTRAINT "MarketingTodo_tenantId_fkey";
ALTER TABLE "MarketingTodo" ADD CONSTRAINT "MarketingTodo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketingScheduleEvent" DROP CONSTRAINT "MarketingScheduleEvent_tenantId_fkey";
ALTER TABLE "MarketingScheduleEvent" ADD CONSTRAINT "MarketingScheduleEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketingActivity" DROP CONSTRAINT "MarketingActivity_tenantId_fkey";
ALTER TABLE "MarketingActivity" ADD CONSTRAINT "MarketingActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NetworkDevice" DROP CONSTRAINT "NetworkDevice_tenantId_fkey";
ALTER TABLE "NetworkDevice" ADD CONSTRAINT "NetworkDevice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NetworkAlert" DROP CONSTRAINT "NetworkAlert_tenantId_fkey";
ALTER TABLE "NetworkAlert" ADD CONSTRAINT "NetworkAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NetworkIncident" DROP CONSTRAINT "NetworkIncident_tenantId_fkey";
ALTER TABLE "NetworkIncident" ADD CONSTRAINT "NetworkIncident_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NetworkChange" DROP CONSTRAINT "NetworkChange_tenantId_fkey";
ALTER TABLE "NetworkChange" ADD CONSTRAINT "NetworkChange_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NetworkBackup" DROP CONSTRAINT "NetworkBackup_tenantId_fkey";
ALTER TABLE "NetworkBackup" ADD CONSTRAINT "NetworkBackup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NetworkServer" DROP CONSTRAINT "NetworkServer_tenantId_fkey";
ALTER TABLE "NetworkServer" ADD CONSTRAINT "NetworkServer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NetworkUserRestriction" DROP CONSTRAINT "NetworkUserRestriction_tenantId_fkey";
ALTER TABLE "NetworkUserRestriction" ADD CONSTRAINT "NetworkUserRestriction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FirewallRule" DROP CONSTRAINT "FirewallRule_tenantId_fkey";
ALTER TABLE "FirewallRule" ADD CONSTRAINT "FirewallRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketingCampaign" DROP CONSTRAINT "MarketingCampaign_tenantId_fkey";
ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketingAudience" DROP CONSTRAINT "MarketingAudience_tenantId_fkey";
ALTER TABLE "MarketingAudience" ADD CONSTRAINT "MarketingAudience_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketingExperiment" DROP CONSTRAINT "MarketingExperiment_tenantId_fkey";
ALTER TABLE "MarketingExperiment" ADD CONSTRAINT "MarketingExperiment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BizTransaction" DROP CONSTRAINT "BizTransaction_tenantId_fkey";
ALTER TABLE "BizTransaction" ADD CONSTRAINT "BizTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BizTaxPlan" DROP CONSTRAINT "BizTaxPlan_tenantId_fkey";
ALTER TABLE "BizTaxPlan" ADD CONSTRAINT "BizTaxPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BizInvestment" DROP CONSTRAINT "BizInvestment_tenantId_fkey";
ALTER TABLE "BizInvestment" ADD CONSTRAINT "BizInvestment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BizSOP" DROP CONSTRAINT "BizSOP_tenantId_fkey";
ALTER TABLE "BizSOP" ADD CONSTRAINT "BizSOP_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BizWorkflow" DROP CONSTRAINT "BizWorkflow_tenantId_fkey";
ALTER TABLE "BizWorkflow" ADD CONSTRAINT "BizWorkflow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BizGoal" DROP CONSTRAINT "BizGoal_tenantId_fkey";
ALTER TABLE "BizGoal" ADD CONSTRAINT "BizGoal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BizMarketAnalysis" DROP CONSTRAINT "BizMarketAnalysis_tenantId_fkey";
ALTER TABLE "BizMarketAnalysis" ADD CONSTRAINT "BizMarketAnalysis_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BizCampaign" DROP CONSTRAINT "BizCampaign_tenantId_fkey";
ALTER TABLE "BizCampaign" ADD CONSTRAINT "BizCampaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BizClient" DROP CONSTRAINT "BizClient_tenantId_fkey";
ALTER TABLE "BizClient" ADD CONSTRAINT "BizClient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BizMember" DROP CONSTRAINT "BizMember_tenantId_fkey";
ALTER TABLE "BizMember" ADD CONSTRAINT "BizMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BizProject" DROP CONSTRAINT "BizProject_tenantId_fkey";
ALTER TABLE "BizProject" ADD CONSTRAINT "BizProject_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BizTask" DROP CONSTRAINT "BizTask_tenantId_fkey";
ALTER TABLE "BizTask" ADD CONSTRAINT "BizTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
