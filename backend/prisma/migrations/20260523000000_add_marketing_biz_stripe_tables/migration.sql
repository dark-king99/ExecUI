-- Add Stripe columns to Tenant
ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripePlanId"     TEXT,
  ADD COLUMN IF NOT EXISTS "stripeSubId"      TEXT;

-- CreateTable: MarketingCampaign
CREATE TABLE IF NOT EXISTS "MarketingCampaign" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "objective"   TEXT NOT NULL DEFAULT 'lead_generation',
    "channel"     TEXT NOT NULL DEFAULT 'email',
    "status"      TEXT NOT NULL DEFAULT 'draft',
    "budget"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spent"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leads"       INTEGER NOT NULL DEFAULT 0,
    "clicks"      INTEGER NOT NULL DEFAULT 0,
    "opens"       INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctr"         DOUBLE PRECISION,
    "openRate"    DOUBLE PRECISION,
    "roi"         DOUBLE PRECISION,
    "startDate"   TIMESTAMP(3),
    "endDate"     TIMESTAMP(3),
    "tenantId"    TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MarketingAudience
CREATE TABLE IF NOT EXISTS "MarketingAudience" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "type"        TEXT NOT NULL DEFAULT 'behavioral',
    "size"        INTEGER NOT NULL DEFAULT 0,
    "status"      TEXT NOT NULL DEFAULT 'draft',
    "description" TEXT,
    "tenantId"    TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingAudience_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MarketingExperiment
CREATE TABLE IF NOT EXISTS "MarketingExperiment" (
    "id"         TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "type"       TEXT NOT NULL DEFAULT 'a/b',
    "status"     TEXT NOT NULL DEFAULT 'draft',
    "metric"     TEXT NOT NULL DEFAULT 'conversion_rate',
    "hypothesis" TEXT,
    "variants"   JSONB,
    "result"     TEXT,
    "confidence" DOUBLE PRECISION,
    "lift"       DOUBLE PRECISION,
    "tenantId"   TEXT NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingExperiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BizTransaction
CREATE TABLE IF NOT EXISTS "BizTransaction" (
    "id"          TEXT NOT NULL,
    "type"        TEXT NOT NULL DEFAULT 'income',
    "category"    TEXT NOT NULL,
    "amount"      DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "date"        TEXT NOT NULL,
    "status"      TEXT NOT NULL DEFAULT 'completed',
    "tenantId"    TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BizTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BizTaxPlan
CREATE TABLE IF NOT EXISTS "BizTaxPlan" (
    "id"                TEXT NOT NULL,
    "title"             TEXT NOT NULL,
    "year"              INTEGER NOT NULL,
    "status"            TEXT NOT NULL DEFAULT 'active',
    "estimated_savings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "strategy"          TEXT,
    "notes"             TEXT,
    "tenantId"          TEXT NOT NULL,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BizTaxPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BizInvestment
CREATE TABLE IF NOT EXISTS "BizInvestment" (
    "id"            TEXT NOT NULL,
    "name"          TEXT NOT NULL,
    "type"          TEXT NOT NULL DEFAULT 'stocks',
    "initial_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "current_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status"        TEXT NOT NULL DEFAULT 'active',
    "notes"         TEXT,
    "tenantId"      TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BizInvestment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BizSOP
CREATE TABLE IF NOT EXISTS "BizSOP" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "department"  TEXT NOT NULL,
    "description" TEXT,
    "steps"       JSONB NOT NULL DEFAULT '[]',
    "status"      TEXT NOT NULL DEFAULT 'active',
    "version"     TEXT NOT NULL DEFAULT '1.0',
    "tenantId"    TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BizSOP_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BizWorkflow
CREATE TABLE IF NOT EXISTS "BizWorkflow" (
    "id"           TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "description"  TEXT,
    "department"   TEXT,
    "trigger"      TEXT,
    "steps"        JSONB NOT NULL DEFAULT '[]',
    "status"       TEXT NOT NULL DEFAULT 'active',
    "is_automated" BOOLEAN NOT NULL DEFAULT false,
    "tenantId"     TEXT NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BizWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BizGoal
CREATE TABLE IF NOT EXISTS "BizGoal" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "category"    TEXT NOT NULL DEFAULT 'growth',
    "description" TEXT,
    "target_date" TEXT,
    "progress"    INTEGER NOT NULL DEFAULT 0,
    "milestones"  JSONB NOT NULL DEFAULT '[]',
    "status"      TEXT NOT NULL DEFAULT 'in_progress',
    "priority"    TEXT NOT NULL DEFAULT 'medium',
    "tenantId"    TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BizGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BizMarketAnalysis
CREATE TABLE IF NOT EXISTS "BizMarketAnalysis" (
    "id"            TEXT NOT NULL,
    "title"         TEXT NOT NULL,
    "market"        TEXT NOT NULL,
    "analysis_type" TEXT NOT NULL DEFAULT 'competitive',
    "summary"       TEXT,
    "opportunities" JSONB NOT NULL DEFAULT '[]',
    "threats"       JSONB NOT NULL DEFAULT '[]',
    "status"        TEXT NOT NULL DEFAULT 'active',
    "tenantId"      TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BizMarketAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BizCampaign
CREATE TABLE IF NOT EXISTS "BizCampaign" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "platform"    TEXT NOT NULL DEFAULT 'email',
    "status"      TEXT NOT NULL DEFAULT 'draft',
    "budget"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spent"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leads"       INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "start_date"  TEXT,
    "end_date"    TEXT,
    "tenantId"    TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BizCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BizClient
CREATE TABLE IF NOT EXISTS "BizClient" (
    "id"           TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "company"      TEXT,
    "email"        TEXT,
    "phone"        TEXT,
    "annual_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status"       TEXT NOT NULL DEFAULT 'active',
    "contract_end" TEXT,
    "industry"     TEXT,
    "tenantId"     TEXT NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BizClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BizMember
CREATE TABLE IF NOT EXISTS "BizMember" (
    "id"         TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "role"       TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "email"      TEXT,
    "status"     TEXT NOT NULL DEFAULT 'active',
    "skills"     JSONB NOT NULL DEFAULT '[]',
    "avatar_url" TEXT,
    "tenantId"   TEXT NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BizMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BizProject
CREATE TABLE IF NOT EXISTS "BizProject" (
    "id"           TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "description"  TEXT,
    "status"       TEXT NOT NULL DEFAULT 'planning',
    "priority"     TEXT NOT NULL DEFAULT 'medium',
    "progress"     INTEGER NOT NULL DEFAULT 0,
    "budget"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "team_members" JSONB NOT NULL DEFAULT '[]',
    "start_date"   TEXT,
    "end_date"     TEXT,
    "tenantId"     TEXT NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BizProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BizTask
CREATE TABLE IF NOT EXISTS "BizTask" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT,
    "project_id"  TEXT,
    "status"      TEXT NOT NULL DEFAULT 'todo',
    "priority"    TEXT NOT NULL DEFAULT 'medium',
    "assignee"    TEXT,
    "due_date"    TEXT,
    "tenantId"    TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BizTask_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MarketingCampaign"  ADD CONSTRAINT "MarketingCampaign_tenantId_fkey"  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketingAudience"  ADD CONSTRAINT "MarketingAudience_tenantId_fkey"  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketingExperiment" ADD CONSTRAINT "MarketingExperiment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BizTransaction"     ADD CONSTRAINT "BizTransaction_tenantId_fkey"     FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BizTaxPlan"         ADD CONSTRAINT "BizTaxPlan_tenantId_fkey"         FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BizInvestment"      ADD CONSTRAINT "BizInvestment_tenantId_fkey"      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BizSOP"             ADD CONSTRAINT "BizSOP_tenantId_fkey"             FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BizWorkflow"        ADD CONSTRAINT "BizWorkflow_tenantId_fkey"        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BizGoal"            ADD CONSTRAINT "BizGoal_tenantId_fkey"            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BizMarketAnalysis"  ADD CONSTRAINT "BizMarketAnalysis_tenantId_fkey"  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BizCampaign"        ADD CONSTRAINT "BizCampaign_tenantId_fkey"        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BizClient"          ADD CONSTRAINT "BizClient_tenantId_fkey"          FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BizMember"          ADD CONSTRAINT "BizMember_tenantId_fkey"          FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BizProject"         ADD CONSTRAINT "BizProject_tenantId_fkey"         FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BizTask"            ADD CONSTRAINT "BizTask_tenantId_fkey"            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
