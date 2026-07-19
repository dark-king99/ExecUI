-- CreateTable
CREATE TABLE "NetworkAutomationJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "targets" TEXT,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "lastRun" TIMESTAMP(3),
    "duration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetworkAutomationJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NetworkAutomationJob_tenantId_idx" ON "NetworkAutomationJob"("tenantId");
