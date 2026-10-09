ALTER TABLE "Tenant"
  ADD COLUMN "providerCustomerId" TEXT,
  ADD COLUMN "providerPlanId" TEXT,
  ADD COLUMN "providerSubscriptionId" TEXT;

UPDATE "Tenant"
SET "providerPlanId" = "stripePlanId"
WHERE "stripePlanId" IS NOT NULL;

ALTER TABLE "Tenant"
  DROP COLUMN "stripeCustomerId",
  DROP COLUMN "stripePlanId",
  DROP COLUMN "stripeSubId";
