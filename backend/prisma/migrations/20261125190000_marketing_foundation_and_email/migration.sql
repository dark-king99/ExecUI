-- Marketing foundation: consent, suppression, the event stream, sending
-- domains, per-recipient email deliveries, and audience membership.

-- CreateTable
CREATE TABLE "MarketingConsent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "evidence" TEXT,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingSuppression" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT,
    "contactId" TEXT,
    "email" TEXT,
    "campaignId" TEXT,
    "deliveryId" TEXT,
    "source" TEXT NOT NULL,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "idempotencyKey" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingSendingDomain" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerDomainId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "records" JSONB NOT NULL DEFAULT '[]',
    "dmarcFound" BOOLEAN NOT NULL DEFAULT false,
    "lastCheckedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingSendingDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingEmailSettings" (
    "tenantId" TEXT NOT NULL,
    "postalAddress" TEXT,
    "defaultFromName" TEXT,
    "replyTo" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingEmailSettings_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "MarketingEmailDelivery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "providerMessageId" TEXT,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "complainedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingEmailDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingAudienceMember" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "audienceId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingAudienceMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketingConsent_tenantId_channel_status_idx" ON "MarketingConsent"("tenantId", "channel", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingConsent_tenantId_contactId_channel_key" ON "MarketingConsent"("tenantId", "contactId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingSuppression_tenantId_email_key" ON "MarketingSuppression"("tenantId", "email");

-- CreateIndex
CREATE INDEX "MarketingEvent_tenantId_type_occurredAt_idx" ON "MarketingEvent"("tenantId", "type", "occurredAt");

-- CreateIndex
CREATE INDEX "MarketingEvent_tenantId_contactId_occurredAt_idx" ON "MarketingEvent"("tenantId", "contactId", "occurredAt");

-- CreateIndex
CREATE INDEX "MarketingEvent_campaignId_type_idx" ON "MarketingEvent"("campaignId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingEvent_tenantId_idempotencyKey_key" ON "MarketingEvent"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingSendingDomain_tenantId_domain_key" ON "MarketingSendingDomain"("tenantId", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingEmailDelivery_providerMessageId_key" ON "MarketingEmailDelivery"("providerMessageId");

-- CreateIndex
CREATE INDEX "MarketingEmailDelivery_status_nextAttemptAt_idx" ON "MarketingEmailDelivery"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "MarketingEmailDelivery_tenantId_campaignId_status_idx" ON "MarketingEmailDelivery"("tenantId", "campaignId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingEmailDelivery_campaignId_contactId_key" ON "MarketingEmailDelivery"("campaignId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingAudienceMember_audienceId_contactId_key" ON "MarketingAudienceMember"("audienceId", "contactId");

-- AddForeignKey
ALTER TABLE "MarketingConsent" ADD CONSTRAINT "MarketingConsent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingConsent" ADD CONSTRAINT "MarketingConsent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingSuppression" ADD CONSTRAINT "MarketingSuppression_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingEvent" ADD CONSTRAINT "MarketingEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingEvent" ADD CONSTRAINT "MarketingEvent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingSendingDomain" ADD CONSTRAINT "MarketingSendingDomain_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingEmailSettings" ADD CONSTRAINT "MarketingEmailSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingEmailDelivery" ADD CONSTRAINT "MarketingEmailDelivery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingEmailDelivery" ADD CONSTRAINT "MarketingEmailDelivery_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingEmailDelivery" ADD CONSTRAINT "MarketingEmailDelivery_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingAudienceMember" ADD CONSTRAINT "MarketingAudienceMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingAudienceMember" ADD CONSTRAINT "MarketingAudienceMember_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "MarketingAudience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingAudienceMember" ADD CONSTRAINT "MarketingAudienceMember_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
