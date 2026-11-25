-- Triggered (journey) email: campaign mode, and a per-campaign send key so a
-- journey can mail the same contact again on a later trip.
ALTER TABLE "MarketingCampaign" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'batch';
ALTER TABLE "MarketingEmailDelivery" ADD COLUMN "sendKey" TEXT;
UPDATE "MarketingEmailDelivery" SET "sendKey" = "contactId" WHERE "sendKey" IS NULL;
ALTER TABLE "MarketingEmailDelivery" ALTER COLUMN "sendKey" SET NOT NULL;

-- DropIndex
DROP INDEX "MarketingEmailDelivery_campaignId_contactId_key";

-- CreateTable
CREATE TABLE "MarketingJourney" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'journey',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "draft" JSONB NOT NULL,
    "currentVersionId" TEXT,
    "triggerType" TEXT,
    "triggerKey" TEXT,
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingJourney_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingJourneyVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "definition" JSONB NOT NULL,
    "note" TEXT,
    "publishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingJourneyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingJourneyEnrollment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "nodeId" TEXT,
    "waitUntil" TIMESTAMP(3),
    "waitEvent" TEXT,
    "stepStartedAt" TIMESTAMP(3),
    "steps" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "activeKey" TEXT,
    "onceKey" TEXT,
    "trigger" JSONB NOT NULL DEFAULT '{}',
    "exitReason" TEXT,
    "lastError" TEXT,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingJourneyEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingJourneyStep" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "nodeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingJourneyStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketingJourney_tenantId_kind_status_idx" ON "MarketingJourney"("tenantId", "kind", "status");

-- CreateIndex
CREATE INDEX "MarketingJourney_status_triggerType_triggerKey_idx" ON "MarketingJourney"("status", "triggerType", "triggerKey");

-- CreateIndex
CREATE INDEX "MarketingJourney_status_nextRunAt_idx" ON "MarketingJourney"("status", "nextRunAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingJourneyVersion_journeyId_version_key" ON "MarketingJourneyVersion"("journeyId", "version");

-- CreateIndex
CREATE INDEX "MarketingJourneyEnrollment_status_waitUntil_idx" ON "MarketingJourneyEnrollment"("status", "waitUntil");

-- CreateIndex
CREATE INDEX "MarketingJourneyEnrollment_tenantId_journeyId_status_idx" ON "MarketingJourneyEnrollment"("tenantId", "journeyId", "status");

-- CreateIndex
CREATE INDEX "MarketingJourneyEnrollment_contactId_status_waitEvent_idx" ON "MarketingJourneyEnrollment"("contactId", "status", "waitEvent");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingJourneyEnrollment_journeyId_activeKey_key" ON "MarketingJourneyEnrollment"("journeyId", "activeKey");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingJourneyEnrollment_journeyId_onceKey_key" ON "MarketingJourneyEnrollment"("journeyId", "onceKey");

-- CreateIndex
CREATE INDEX "MarketingJourneyStep_journeyId_nodeId_outcome_idx" ON "MarketingJourneyStep"("journeyId", "nodeId", "outcome");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingJourneyStep_enrollmentId_seq_key" ON "MarketingJourneyStep"("enrollmentId", "seq");

-- CreateIndex
CREATE INDEX "MarketingEmailDelivery_campaignId_contactId_idx" ON "MarketingEmailDelivery"("campaignId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingEmailDelivery_campaignId_sendKey_key" ON "MarketingEmailDelivery"("campaignId", "sendKey");

-- AddForeignKey
ALTER TABLE "MarketingJourney" ADD CONSTRAINT "MarketingJourney_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingJourneyVersion" ADD CONSTRAINT "MarketingJourneyVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingJourneyVersion" ADD CONSTRAINT "MarketingJourneyVersion_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "MarketingJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingJourneyEnrollment" ADD CONSTRAINT "MarketingJourneyEnrollment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingJourneyEnrollment" ADD CONSTRAINT "MarketingJourneyEnrollment_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "MarketingJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingJourneyEnrollment" ADD CONSTRAINT "MarketingJourneyEnrollment_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "MarketingJourneyVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingJourneyEnrollment" ADD CONSTRAINT "MarketingJourneyEnrollment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingJourneyStep" ADD CONSTRAINT "MarketingJourneyStep_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingJourneyStep" ADD CONSTRAINT "MarketingJourneyStep_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "MarketingJourneyEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

