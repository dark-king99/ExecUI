-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'message', "title" TEXT NOT NULL, "body" TEXT,
    "link" TEXT, "actorName" TEXT, "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Notification_tenantId_userId_createdAt_idx" ON "Notification"("tenantId", "userId", "createdAt");

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL, "recipientId" TEXT NOT NULL, "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DirectMessage_tenantId_senderId_recipientId_createdAt_idx" ON "DirectMessage"("tenantId", "senderId", "recipientId", "createdAt");
CREATE INDEX "DirectMessage_tenantId_recipientId_readAt_idx" ON "DirectMessage"("tenantId", "recipientId", "readAt");

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "toEmail" TEXT NOT NULL,
    "fromEmail" TEXT, "subject" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'queued',
    "provider" TEXT NOT NULL DEFAULT 'resend', "providerId" TEXT, "error" TEXT,
    "context" TEXT, "createdById" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EmailLog_tenantId_createdAt_idx" ON "EmailLog"("tenantId", "createdAt");
