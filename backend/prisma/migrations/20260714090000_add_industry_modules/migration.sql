-- Tenant industry selector (default "general" ⇒ core CRM only, unchanged).
ALTER TABLE "Tenant" ADD COLUMN "industry" TEXT NOT NULL DEFAULT 'general';

-- Generic industry-object store (additive "custom object" engine).
CREATE TABLE "IndustryRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "amount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'LRD',
    "ownerId" TEXT,
    "ownerName" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndustryRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IndustryRecord_tenantId_industry_objectType_idx" ON "IndustryRecord"("tenantId", "industry", "objectType");
CREATE INDEX "IndustryRecord_tenantId_objectType_stage_idx" ON "IndustryRecord"("tenantId", "objectType", "stage");

ALTER TABLE "IndustryRecord" ADD CONSTRAINT "IndustryRecord_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
