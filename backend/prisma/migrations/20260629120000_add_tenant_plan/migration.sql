ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'executive';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "planSolutions" TEXT[] DEFAULT ARRAY[]::TEXT[];
-- existing tenants keep full access
UPDATE "Tenant" SET "plan" = 'executive' WHERE "plan" IS NULL;
