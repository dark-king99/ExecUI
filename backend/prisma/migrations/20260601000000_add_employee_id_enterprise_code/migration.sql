-- Enterprise spec: employee ID codes + per-enterprise join codes
-- Each enterprise gets a unique join code; each user gets an employee ID code
-- (unique within their enterprise). passwordHash becomes nullable so an admin
-- can provision an employee (status = 'invited') before they set a password.

-- ── Tenant: enterprise join code ──────────────────────────────────────────────
ALTER TABLE "Tenant" ADD COLUMN "code" TEXT;

-- Backfill a deterministic, unique code for existing tenants
UPDATE "Tenant"
SET "code" = upper(substr(regexp_replace("slug", '[^a-zA-Z0-9]', '', 'g'), 1, 6))
             || '-' || upper(substr(md5("id"), 1, 4))
WHERE "code" IS NULL;

CREATE UNIQUE INDEX "Tenant_code_key" ON "Tenant"("code");

-- ── User: employee ID + status, nullable password ────────────────────────────
ALTER TABLE "User" ADD COLUMN "employeeId" TEXT;
ALTER TABLE "User" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Backfill per-tenant sequential employee IDs for existing users
WITH numbered AS (
  SELECT "id",
         row_number() OVER (PARTITION BY "tenantId" ORDER BY "createdAt") AS rn
  FROM "User"
)
UPDATE "User" u
SET "employeeId" = 'EMP-' || lpad(n.rn::text, 4, '0')
FROM numbered n
WHERE u."id" = n."id" AND u."employeeId" IS NULL;

-- Employee IDs are unique within an enterprise (NULLs remain allowed/distinct)
CREATE UNIQUE INDEX "User_tenantId_employeeId_key" ON "User"("tenantId", "employeeId");
