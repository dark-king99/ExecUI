-- Per-tenant monthly AI-assist usage counter (enforces plan AI allowances).
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiUsage_tenantId_idx" ON "AiUsage"("tenantId");

CREATE UNIQUE INDEX "AiUsage_tenantId_period_key" ON "AiUsage"("tenantId", "period");

ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
