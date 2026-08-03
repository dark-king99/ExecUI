-- Regional price book: where and what a customer is.
--
-- `country` selects a World Bank income band; `segment` says whether this is a
-- corner shop or a bank. Together they set the multiplier applied to a plan's
-- published list price (see modules/billing/pricing.book.js).
--
-- These are columns rather than TenantSetting rows on purpose: settings are
-- tenant-editable, and a tenant able to write its own `segment` could set itself
-- to "sme" and pay a sixth of the price.
--
-- Existing tenants get country = NULL and segment = 'sme', which resolves to a
-- multiplier of exactly 1.0 — so nobody's price changes as a result of this
-- migration.

ALTER TABLE "Tenant" ADD COLUMN "country" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "segment" TEXT NOT NULL DEFAULT 'sme';

-- Manual (offline) billing. Where no processor will onboard the merchant, an
-- invoice with a reference the customer quotes on a bank transfer or mobile
-- money payment IS the billing system, and an operator confirms receipt.
-- Stripe and Flutterwave are their own system of record and never write here.

CREATE TABLE "PlatformInvoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "planSolutions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "amountUsd" INTEGER NOT NULL,
    "localAmount" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "method" TEXT,
    "note" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "confirmedById" TEXT,
    "voidedAt" TIMESTAMP(3),

    CONSTRAINT "PlatformInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformInvoice_reference_key" ON "PlatformInvoice"("reference");
CREATE INDEX "PlatformInvoice_tenantId_status_idx" ON "PlatformInvoice"("tenantId", "status");
CREATE INDEX "PlatformInvoice_status_idx" ON "PlatformInvoice"("status");

ALTER TABLE "PlatformInvoice" ADD CONSTRAINT "PlatformInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
