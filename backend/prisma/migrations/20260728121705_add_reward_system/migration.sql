-- CreateTable
CREATE TABLE "RewardEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardStat" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "navPoints" INTEGER NOT NULL DEFAULT 0,
    "usagePoints" INTEGER NOT NULL DEFAULT 0,
    "perfPoints" INTEGER NOT NULL DEFAULT 0,
    "eventsCount" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDay" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RewardEvent_tenantId_userId_idx" ON "RewardEvent"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "RewardEvent_tenantId_createdAt_idx" ON "RewardEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "RewardEvent_tenantId_userId_type_createdAt_idx" ON "RewardEvent"("tenantId", "userId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RewardStat_userId_key" ON "RewardStat"("userId");

-- CreateIndex
CREATE INDEX "RewardStat_tenantId_points_idx" ON "RewardStat"("tenantId", "points");

-- CreateIndex
CREATE UNIQUE INDEX "RewardStat_tenantId_userId_key" ON "RewardStat"("tenantId", "userId");

-- AddForeignKey
ALTER TABLE "RewardEvent" ADD CONSTRAINT "RewardEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardEvent" ADD CONSTRAINT "RewardEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardStat" ADD CONSTRAINT "RewardStat_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardStat" ADD CONSTRAINT "RewardStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
