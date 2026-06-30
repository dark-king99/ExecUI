ALTER TABLE "Tenant" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'executive';
ALTER TABLE "Tenant" ADD COLUMN "planSolutions" TEXT[] DEFAULT ARRAY[]::TEXT[];
-- existing tenants keep full access
UPDATE "Tenant" SET "plan" = 'executive' WHERE "plan" IS NULL;
