-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerEvent" TEXT NOT NULL,
    "match" TEXT NOT NULL DEFAULT 'all',
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "oncePerRecord" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "lastError" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "recordId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "matched" BOOLEAN NOT NULL DEFAULT true,
    "results" JSONB NOT NULL DEFAULT '[]',
    "error" TEXT,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "resource" TEXT,
    "recordId" TEXT,
    "recordLabel" TEXT,
    "summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "steps" JSONB NOT NULL DEFAULT '[]',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "onApprove" JSONB NOT NULL DEFAULT '[]',
    "workflowId" TEXT,
    "requestedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "ApprovalDecision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "decision" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "ApprovalDecision_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "Workflow_tenantId_idx" ON "Workflow"("tenantId");
-- CreateIndex
CREATE INDEX "Workflow_tenantId_triggerEvent_active_idx" ON "Workflow"("tenantId", "triggerEvent", "active");
-- CreateIndex
CREATE INDEX "WorkflowRun_tenantId_createdAt_idx" ON "WorkflowRun"("tenantId", "createdAt");
-- CreateIndex
CREATE INDEX "WorkflowRun_workflowId_recordId_idx" ON "WorkflowRun"("workflowId", "recordId");
-- CreateIndex
CREATE INDEX "ApprovalRequest_tenantId_status_idx" ON "ApprovalRequest"("tenantId", "status");
-- CreateIndex
CREATE INDEX "ApprovalRequest_tenantId_createdAt_idx" ON "ApprovalRequest"("tenantId", "createdAt");
-- CreateIndex
CREATE INDEX "ApprovalDecision_tenantId_idx" ON "ApprovalDecision"("tenantId");
-- CreateIndex
CREATE UNIQUE INDEX "ApprovalDecision_requestId_stepIndex_userId_key" ON "ApprovalDecision"("requestId", "stepIndex", "userId");
-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ApprovalDecision" ADD CONSTRAINT "ApprovalDecision_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ApprovalDecision" ADD CONSTRAINT "ApprovalDecision_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
