-- Device configuration backups (encrypted, versioned) and their settings.
ALTER TABLE "NetworkSettings" ADD COLUMN "backupEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "backupSshUser" TEXT,
ADD COLUMN "backupLastQueuedAt" TIMESTAMP(3);

CREATE TABLE "NetworkConfigBackup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "collectorId" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sha256" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "lines" INTEGER NOT NULL,
    "changed" BOOLEAN NOT NULL,
    "contentCipher" TEXT NOT NULL,
    "contentIv" TEXT NOT NULL,
    "contentTag" TEXT NOT NULL,
    CONSTRAINT "NetworkConfigBackup_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NetworkConfigBackup_tenantId_deviceId_takenAt_idx" ON "NetworkConfigBackup"("tenantId", "deviceId", "takenAt");
ALTER TABLE "NetworkConfigBackup" ADD CONSTRAINT "NetworkConfigBackup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
