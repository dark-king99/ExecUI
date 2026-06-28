-- CreateTable
CREATE TABLE "DeptMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "fromDept" TEXT NOT NULL,
    "toDept" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeptMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeptMessage_tenantId_createdAt_idx" ON "DeptMessage"("tenantId", "createdAt");
