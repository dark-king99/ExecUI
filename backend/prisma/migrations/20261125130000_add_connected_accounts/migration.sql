-- Connected Google / Microsoft accounts: personal mailboxes and calendars,
-- and an organization support inbox. Tokens are stored encrypted.

-- AlterTable
ALTER TABLE "CrmFollowUp" ADD COLUMN     "contactId" TEXT,
ADD COLUMN     "externalRef" TEXT;

-- CreateTable
CREATE TABLE "OAuthConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "accountEmail" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accessCipher" TEXT NOT NULL,
    "accessIv" TEXT NOT NULL,
    "accessTag" TEXT NOT NULL,
    "refreshCipher" TEXT,
    "refreshIv" TEXT,
    "refreshTag" TEXT,
    "expiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "logEmails" BOOLEAN NOT NULL DEFAULT true,
    "logMeetings" BOOLEAN NOT NULL DEFAULT true,
    "syncedThrough" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "codeVerifier" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailActivity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactId" TEXT,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "threadId" TEXT,
    "direction" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "toEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subject" TEXT NOT NULL,
    "snippet" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportEmail" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "ticketId" TEXT,
    "outcome" TEXT NOT NULL,
    "reason" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OAuthConnection_status_idx" ON "OAuthConnection"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthConnection_tenantId_userId_provider_purpose_key" ON "OAuthConnection"("tenantId", "userId", "provider", "purpose");

-- CreateIndex
CREATE INDEX "OAuthRequest_expiresAt_idx" ON "OAuthRequest"("expiresAt");

-- CreateIndex
CREATE INDEX "MailActivity_tenantId_contactId_occurredAt_idx" ON "MailActivity"("tenantId", "contactId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "MailActivity_connectionId_externalId_key" ON "MailActivity"("connectionId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportEmail_connectionId_externalId_key" ON "SupportEmail"("connectionId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmFollowUp_tenantId_externalRef_key" ON "CrmFollowUp"("tenantId", "externalRef");

-- AddForeignKey
ALTER TABLE "OAuthConnection" ADD CONSTRAINT "OAuthConnection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthConnection" ADD CONSTRAINT "OAuthConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthRequest" ADD CONSTRAINT "OAuthRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailActivity" ADD CONSTRAINT "MailActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailActivity" ADD CONSTRAINT "MailActivity_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "OAuthConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportEmail" ADD CONSTRAINT "SupportEmail_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportEmail" ADD CONSTRAINT "SupportEmail_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "OAuthConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

