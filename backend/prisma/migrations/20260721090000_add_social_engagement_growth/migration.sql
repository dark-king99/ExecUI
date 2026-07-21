-- Engagement Inbox: incoming comments / mentions / DMs / reviews.
CREATE TABLE "SocialEngagement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'comment',
    "authorName" TEXT NOT NULL,
    "authorHandle" TEXT,
    "text" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL DEFAULT 'neutral',
    "status" TEXT NOT NULL DEFAULT 'new',
    "replyText" TEXT,
    "repliedAt" TIMESTAMP(3),
    "simulated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialEngagement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SocialEngagement_tenantId_status_idx" ON "SocialEngagement"("tenantId", "status");
CREATE INDEX "SocialEngagement_tenantId_platform_idx" ON "SocialEngagement"("tenantId", "platform");
ALTER TABLE "SocialEngagement" ADD CONSTRAINT "SocialEngagement_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Daily follower snapshots (following-growth time series).
CREATE TABLE "SocialFollowerSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "day" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialFollowerSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SocialFollowerSnapshot_tenantId_platform_day_key" ON "SocialFollowerSnapshot"("tenantId", "platform", "day");
CREATE INDEX "SocialFollowerSnapshot_tenantId_day_idx" ON "SocialFollowerSnapshot"("tenantId", "day");
ALTER TABLE "SocialFollowerSnapshot" ADD CONSTRAINT "SocialFollowerSnapshot_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
