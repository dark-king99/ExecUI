-- NetFlow/IPFIX summaries from collectors.
ALTER TABLE "NetworkSettings" ADD COLUMN "flowEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "flowPort" INTEGER NOT NULL DEFAULT 2055;

CREATE TABLE "NetworkFlowStat" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "collectorId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "protocol" INTEGER NOT NULL,
    "port" INTEGER NOT NULL,
    "bytes" DOUBLE PRECISION NOT NULL,
    "packets" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "NetworkFlowStat_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NetworkFlowStat_tenantId_periodEnd_idx" ON "NetworkFlowStat"("tenantId", "periodEnd");
ALTER TABLE "NetworkFlowStat" ADD CONSTRAINT "NetworkFlowStat_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "NetworkFlowConversation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "collectorId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "srcIp" TEXT NOT NULL,
    "dstIp" TEXT NOT NULL,
    "protocol" INTEGER NOT NULL,
    "port" INTEGER NOT NULL,
    "bytes" DOUBLE PRECISION NOT NULL,
    "packets" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "NetworkFlowConversation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NetworkFlowConversation_tenantId_periodEnd_idx" ON "NetworkFlowConversation"("tenantId", "periodEnd");
ALTER TABLE "NetworkFlowConversation" ADD CONSTRAINT "NetworkFlowConversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
