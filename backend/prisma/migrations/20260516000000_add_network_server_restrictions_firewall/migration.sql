-- CreateTable: NetworkServer
CREATE TABLE "NetworkServer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "os" TEXT NOT NULL DEFAULT 'linux',
    "cores" INTEGER NOT NULL DEFAULT 1,
    "ram_gb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "disk_gb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpu_util" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mem_util" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "disk_util" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'online',
    "environment" TEXT NOT NULL DEFAULT 'prod',
    "region" TEXT,
    "tags" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NetworkServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable: NetworkUserRestriction
CREATE TABLE "NetworkUserRestriction" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "target_type" TEXT NOT NULL DEFAULT 'user',
    "target" TEXT NOT NULL,
    "rule_type" TEXT NOT NULL DEFAULT 'block',
    "protocol" TEXT NOT NULL DEFAULT 'any',
    "port" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'both',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "bandwidth_kbps" INTEGER,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NetworkUserRestriction_pkey" PRIMARY KEY ("id")
);

-- CreateTable: FirewallRule
CREATE TABLE "FirewallRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "chain" TEXT NOT NULL DEFAULT 'INPUT',
    "action" TEXT NOT NULL DEFAULT 'ACCEPT',
    "protocol" TEXT NOT NULL DEFAULT 'any',
    "src_ip" TEXT,
    "dst_ip" TEXT,
    "src_port" TEXT,
    "dst_port" TEXT,
    "zone_src" TEXT,
    "zone_dst" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "log_traffic" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FirewallRule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NetworkServer" ADD CONSTRAINT "NetworkServer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkUserRestriction" ADD CONSTRAINT "NetworkUserRestriction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirewallRule" ADD CONSTRAINT "FirewallRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
