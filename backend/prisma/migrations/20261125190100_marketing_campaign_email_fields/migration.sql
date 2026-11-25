-- Email content, audience and scheduling on campaigns; rules on audiences.
ALTER TABLE "MarketingAudience" ADD COLUMN "definition" JSONB,
ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'dynamic',
ADD COLUMN "lastCountAt" TIMESTAMP(3);

ALTER TABLE "MarketingCampaign" ADD COLUMN "audienceId" TEXT,
ADD COLUMN "createdById" TEXT,
ADD COLUMN "fromLocalPart" TEXT,
ADD COLUMN "fromName" TEXT,
ADD COLUMN "htmlBody" TEXT,
ADD COLUMN "lastError" TEXT,
ADD COLUMN "previewText" TEXT,
ADD COLUMN "replyTo" TEXT,
ADD COLUMN "scheduledAt" TIMESTAMP(3),
ADD COLUMN "sendCompletedAt" TIMESTAMP(3),
ADD COLUMN "sendStartedAt" TIMESTAMP(3),
ADD COLUMN "sendingDomainId" TEXT,
ADD COLUMN "subject" TEXT,
ADD COLUMN "textBody" TEXT;
