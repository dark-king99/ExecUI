-- CreateTable
CREATE TABLE "RetentionPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "retainDays" INTEGER NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'delete',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "lastPurged" INTEGER NOT NULL DEFAULT 0,
    "totalPurged" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "RetentionPolicy_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "DataRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT,
    "subjectEmail" TEXT NOT NULL,
    "subjectLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" JSONB NOT NULL DEFAULT '{}',
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "error" TEXT,
    "requestedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "DataRequest_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "LegalHold" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reason" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'subject',
    "subjectEmail" TEXT,
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "placedById" TEXT,
    "releasedAt" TIMESTAMP(3),
    "releasedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "LegalHold_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "RetentionPolicy_tenantId_idx" ON "RetentionPolicy"("tenantId");
-- CreateIndex
CREATE UNIQUE INDEX "RetentionPolicy_tenantId_category_key" ON "RetentionPolicy"("tenantId", "category");
-- CreateIndex
CREATE INDEX "DataRequest_tenantId_createdAt_idx" ON "DataRequest"("tenantId", "createdAt");
-- CreateIndex
CREATE INDEX "DataRequest_tenantId_subjectEmail_idx" ON "DataRequest"("tenantId", "subjectEmail");
-- CreateIndex
CREATE INDEX "LegalHold_tenantId_active_idx" ON "LegalHold"("tenantId", "active");
-- AddForeignKey
ALTER TABLE "RetentionPolicy" ADD CONSTRAINT "RetentionPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "DataRequest" ADD CONSTRAINT "DataRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "LegalHold" ADD CONSTRAINT "LegalHold_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
