-- Connected business social accounts (tokens encrypted at rest).
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'connected',
    "followers" INTEGER NOT NULL DEFAULT 0,
    "tokenCipher" TEXT,
    "tokenIv" TEXT,
    "tokenTag" TEXT,
    "connectedById" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SocialAccount_tenantId_platform_handle_key" ON "SocialAccount"("tenantId", "platform", "handle");
CREATE INDEX "SocialAccount_tenantId_platform_idx" ON "SocialAccount"("tenantId", "platform");
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Social posts / campaign items.
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "authorId" TEXT,
    "authorName" TEXT,
    "results" JSONB NOT NULL DEFAULT '{}',
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SocialPost_tenantId_status_idx" ON "SocialPost"("tenantId", "status");
CREATE INDEX "SocialPost_tenantId_scheduledAt_idx" ON "SocialPost"("tenantId", "scheduledAt");
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
