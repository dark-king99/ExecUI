-- AlterTable
ALTER TABLE "CrmTicket" ADD COLUMN     "assigneeId" TEXT,
ADD COLUMN     "assigneeName" TEXT,
ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactId" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "firstResponseAt" TIMESTAMP(3),
ADD COLUMN     "portalVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "satisfaction" INTEGER,
ADD COLUMN     "satisfactionComment" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'internal';
-- CreateTable
CREATE TABLE "KbCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KbCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KbArticle" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "helpfulYes" INTEGER NOT NULL DEFAULT 0,
    "helpfulNo" INTEGER NOT NULL DEFAULT 0,
    "authorId" TEXT,
    "authorName" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KbArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KbFeedback" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "helpful" BOOLEAN NOT NULL,
    "comment" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KbFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorType" TEXT NOT NULL DEFAULT 'agent',
    "authorId" TEXT,
    "authorName" TEXT,
    "authorEmail" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "emailed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalMagicLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalMagicLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contactId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KbCategory_tenantId_active_idx" ON "KbCategory"("tenantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "KbCategory_tenantId_slug_key" ON "KbCategory"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "KbArticle_tenantId_status_visibility_idx" ON "KbArticle"("tenantId", "status", "visibility");

-- CreateIndex
CREATE INDEX "KbArticle_tenantId_categoryId_idx" ON "KbArticle"("tenantId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "KbArticle_tenantId_slug_key" ON "KbArticle"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "KbFeedback_tenantId_articleId_idx" ON "KbFeedback"("tenantId", "articleId");

-- CreateIndex
CREATE INDEX "TicketMessage_tenantId_ticketId_createdAt_idx" ON "TicketMessage"("tenantId", "ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "PortalMagicLink_tokenHash_idx" ON "PortalMagicLink"("tokenHash");

-- CreateIndex
CREATE INDEX "PortalMagicLink_tenantId_email_idx" ON "PortalMagicLink"("tenantId", "email");

-- CreateIndex
CREATE INDEX "PortalSession_tokenHash_idx" ON "PortalSession"("tokenHash");

-- CreateIndex
CREATE INDEX "PortalSession_tenantId_email_idx" ON "PortalSession"("tenantId", "email");

-- CreateIndex
CREATE INDEX "CrmTicket_tenantId_contactEmail_idx" ON "CrmTicket"("tenantId", "contactEmail");

-- CreateIndex
CREATE INDEX "CrmTicket_tenantId_status_idx" ON "CrmTicket"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "KbCategory" ADD CONSTRAINT "KbCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KbArticle" ADD CONSTRAINT "KbArticle_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KbArticle" ADD CONSTRAINT "KbArticle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "KbCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KbFeedback" ADD CONSTRAINT "KbFeedback_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KbFeedback" ADD CONSTRAINT "KbFeedback_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "KbArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "CrmTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalMagicLink" ADD CONSTRAINT "PortalMagicLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalSession" ADD CONSTRAINT "PortalSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

