-- Network collection: on-site collectors, discovered links, metric history,
-- and saved network settings. Devices record where their data came from.

-- AlterTable
ALTER TABLE "NetworkAlert" ADD COLUMN     "kind" TEXT;

-- AlterTable
ALTER TABLE "NetworkDevice" ADD COLUMN     "collectorId" TEXT,
ADD COLUMN     "externalRef" TEXT,
ADD COLUMN     "in_bps" DOUBLE PRECISION,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "latency_ms" DOUBLE PRECISION,
ADD COLUMN     "mac" TEXT,
ADD COLUMN     "metricsAt" TIMESTAMP(3),
ADD COLUMN     "out_bps" DOUBLE PRECISION,
ADD COLUMN     "snmp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "sys_descr" TEXT,
ADD COLUMN     "uptime_sec" INTEGER,
ADD COLUMN     "vendor" TEXT;

-- CreateTable
CREATE TABLE "NetworkCollector" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "createdById" TEXT,
    "hostname" TEXT,
    "platform" TEXT,
    "version" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "lastReportAt" TIMESTAMP(3),
    "lastError" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NetworkCollector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetworkLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "aDeviceId" TEXT NOT NULL,
    "aPort" TEXT NOT NULL DEFAULT '',
    "bDeviceId" TEXT NOT NULL,
    "bPort" TEXT NOT NULL DEFAULT '',
    "protocol" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NetworkLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetworkMetricSample" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "up" BOOLEAN NOT NULL,
    "cpu" DOUBLE PRECISION,
    "mem" DOUBLE PRECISION,
    "in_bps" DOUBLE PRECISION,
    "out_bps" DOUBLE PRECISION,
    "latency_ms" DOUBLE PRECISION,

    CONSTRAINT "NetworkMetricSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetworkSettings" (
    "tenantId" TEXT NOT NULL,
    "subnets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pollingIntervalSec" INTEGER NOT NULL DEFAULT 60,
    "discoveryIntervalMin" INTEGER NOT NULL DEFAULT 60,
    "snmpVersion" TEXT NOT NULL DEFAULT 'v2c',
    "snmpCommunityCipher" TEXT,
    "snmpCommunityIv" TEXT,
    "snmpCommunityTag" TEXT,
    "cpuThreshold" INTEGER NOT NULL DEFAULT 85,
    "memThreshold" INTEGER NOT NULL DEFAULT 90,
    "autoResolveAlerts" BOOLEAN NOT NULL DEFAULT true,
    "alertEmail" TEXT,
    "metricRetentionDays" INTEGER NOT NULL DEFAULT 30,
    "monitoringTool" TEXT,
    "monitoringUrl" TEXT,
    "monitoringTokenCipher" TEXT,
    "monitoringTokenIv" TEXT,
    "monitoringTokenTag" TEXT,
    "monitoringLastSyncAt" TIMESTAMP(3),
    "monitoringLastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetworkSettings_pkey" PRIMARY KEY ("tenantId")
);

-- CreateIndex
CREATE UNIQUE INDEX "NetworkCollector_tokenHash_key" ON "NetworkCollector"("tokenHash");

-- CreateIndex
CREATE INDEX "NetworkCollector_tenantId_idx" ON "NetworkCollector"("tenantId");

-- CreateIndex
CREATE INDEX "NetworkLink_tenantId_lastSeenAt_idx" ON "NetworkLink"("tenantId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "NetworkLink_tenantId_aDeviceId_aPort_bDeviceId_bPort_key" ON "NetworkLink"("tenantId", "aDeviceId", "aPort", "bDeviceId", "bPort");

-- CreateIndex
CREATE INDEX "NetworkMetricSample_tenantId_deviceId_at_idx" ON "NetworkMetricSample"("tenantId", "deviceId", "at");

-- CreateIndex
CREATE INDEX "NetworkMetricSample_at_idx" ON "NetworkMetricSample"("at");

-- CreateIndex
CREATE INDEX "NetworkDevice_tenantId_ip_address_idx" ON "NetworkDevice"("tenantId", "ip_address");

-- CreateIndex
CREATE UNIQUE INDEX "NetworkDevice_tenantId_externalRef_key" ON "NetworkDevice"("tenantId", "externalRef");

-- AddForeignKey
ALTER TABLE "NetworkCollector" ADD CONSTRAINT "NetworkCollector_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkLink" ADD CONSTRAINT "NetworkLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkMetricSample" ADD CONSTRAINT "NetworkMetricSample_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkSettings" ADD CONSTRAINT "NetworkSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
