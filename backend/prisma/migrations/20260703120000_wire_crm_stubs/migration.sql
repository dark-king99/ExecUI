-- CRM cadences, playbooks, board resolutions, notification prefs, lead source
CREATE TABLE IF NOT EXISTS "CrmSequence" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "description" TEXT, "steps" INTEGER NOT NULL DEFAULT 1,
  "enrolled" INTEGER NOT NULL DEFAULT 0, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmSequence_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CrmSequence_tenantId_idx" ON "CrmSequence"("tenantId");

CREATE TABLE IF NOT EXISTS "CrmPlaybook" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "description" TEXT, "category" TEXT NOT NULL DEFAULT 'general',
  "steps" INTEGER NOT NULL DEFAULT 1, "active" BOOLEAN NOT NULL DEFAULT true,
  "runs" INTEGER NOT NULL DEFAULT 0, "lastRunAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmPlaybook_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CrmPlaybook_tenantId_idx" ON "CrmPlaybook"("tenantId");

CREATE TABLE IF NOT EXISTS "CrmResolution" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "title" TEXT NOT NULL,
  "description" TEXT, "category" TEXT NOT NULL DEFAULT 'Governance',
  "status" TEXT NOT NULL DEFAULT 'under_review', "votes" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmResolution_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CrmResolution_tenantId_idx" ON "CrmResolution"("tenantId");

CREATE TABLE IF NOT EXISTS "CrmResolutionVote" (
  "resolutionId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmResolutionVote_pkey" PRIMARY KEY ("resolutionId", "userId"),
  CONSTRAINT "CrmResolutionVote_resolutionId_fkey" FOREIGN KEY ("resolutionId")
    REFERENCES "CrmResolution"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "NotificationPref" (
  "userId" TEXT NOT NULL, "tenantId" TEXT NOT NULL,
  "email" BOOLEAN NOT NULL DEFAULT true, "sms" BOOLEAN NOT NULL DEFAULT false,
  "inApp" BOOLEAN NOT NULL DEFAULT true, "digest" TEXT NOT NULL DEFAULT 'daily',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationPref_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "CrmOpportunity" ADD COLUMN IF NOT EXISTS "source" TEXT;
