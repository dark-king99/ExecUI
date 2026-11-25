-- Slack/Teams channel routing, video meeting links on CRM meetings, and
-- optional connect-time features (e.g. file search).
ALTER TABLE "CrmFollowUp" ADD COLUMN "meetingUrl" TEXT,
ADD COLUMN "meetingProvider" TEXT;

ALTER TABLE "OAuthRequest" ADD COLUMN "features" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "ChatRoute" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "slackChannel" TEXT,
    "webhookCipher" TEXT,
    "webhookIv" TEXT,
    "webhookTag" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatRoute_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChatRoute_tenantId_category_idx" ON "ChatRoute"("tenantId", "category");

ALTER TABLE "ChatRoute" ADD CONSTRAINT "ChatRoute_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
