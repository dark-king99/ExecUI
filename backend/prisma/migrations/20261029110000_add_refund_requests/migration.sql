CREATE TABLE "RefundRequest" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "submittedById" TEXT,
  "transactionId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "firstPaidAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "details" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'submitted',
  "adminNote" TEXT,
  "paddleRefundReference" TEXT,
  "reviewedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RefundRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RefundRequest_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RefundRequest_submittedById_fkey"
    FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RefundRequest_tenantId_transactionId_key"
  ON "RefundRequest"("tenantId", "transactionId");
CREATE INDEX "RefundRequest_status_createdAt_idx"
  ON "RefundRequest"("status", "createdAt");
CREATE INDEX "RefundRequest_tenantId_createdAt_idx"
  ON "RefundRequest"("tenantId", "createdAt");
