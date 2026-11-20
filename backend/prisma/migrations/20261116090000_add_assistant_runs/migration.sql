CREATE TABLE "AssistantRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "request" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "summary" TEXT,
    "response" TEXT,
    "result" JSONB,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "modelRoute" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssistantRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AssistantRun_tenantId_userId_createdAt_idx"
    ON "AssistantRun"("tenantId", "userId", "createdAt");
CREATE INDEX "AssistantRun_tenantId_status_idx"
    ON "AssistantRun"("tenantId", "status");

ALTER TABLE "AssistantRun"
    ADD CONSTRAINT "AssistantRun_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
