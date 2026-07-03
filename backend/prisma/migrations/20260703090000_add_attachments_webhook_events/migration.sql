-- Generic cross-module attachments (metadata only; binaries in object storage)
CREATE TABLE IF NOT EXISTS "Attachment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT,
  "size" INTEGER NOT NULL DEFAULT 0,
  "url" TEXT NOT NULL,
  "uploadedById" TEXT,
  "uploaderName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Attachment_tenantId_entityType_entityId_idx"
  ON "Attachment"("tenantId", "entityType", "entityId");

-- Stripe webhook idempotency ledger
CREATE TABLE IF NOT EXISTS "WebhookEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);
