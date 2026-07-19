-- Network scale profile (small office by default).
ALTER TABLE "Tenant" ADD COLUMN "networkProfile" TEXT NOT NULL DEFAULT 'office';

-- Internet / WAN connections (ISP links) for office network monitoring.
CREATE TABLE "NetworkConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "linkType" TEXT NOT NULL DEFAULT 'fiber',
    "role" TEXT NOT NULL DEFAULT 'primary',
    "downMbps" DOUBLE PRECISION,
    "upMbps" DOUBLE PRECISION,
    "ipAddress" TEXT,
    "gateway" TEXT,
    "status" TEXT NOT NULL DEFAULT 'up',
    "monthlyUsageGb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dataCapGb" DOUBLE PRECISION,
    "monthlyCost" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'LRD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetworkConnection_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NetworkConnection_tenantId_idx" ON "NetworkConnection"("tenantId");
ALTER TABLE "NetworkConnection" ADD CONSTRAINT "NetworkConnection_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
