-- Per-tenant configuration + staged organization deletion.
--
-- TenantSetting replaces the habit of adding a column to Tenant for every new
-- org-level option. Keys are declared in modules/settings/settings.registry.js;
-- the unique (tenantId, key) is what makes a setting read a single indexed row.
--
-- The Tenant columns stage a deletion rather than performing one: an admin
-- requests it, and the purge runs only after the grace window elapses.

CREATE TABLE "TenantSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "TenantSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantSetting_tenantId_key_key" ON "TenantSetting"("tenantId", "key");
CREATE INDEX "TenantSetting_tenantId_idx" ON "TenantSetting"("tenantId");

ALTER TABLE "TenantSetting" ADD CONSTRAINT "TenantSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Tenant" ADD COLUMN "deletionRequestedAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "deletionRequestedById" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "deletionScheduledFor" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "deletionReason" TEXT;

CREATE INDEX "Tenant_deletionScheduledFor_idx" ON "Tenant"("deletionScheduledFor");
