-- Make the contract renewal chain a real relation.
--
-- `renewedFromId` was a bare string: it recorded which contract a renewal
-- replaced, but nothing stopped it pointing at a contract that had since been
-- deleted, and answering "what replaced this one?" meant scanning the table.
--
-- Existing rows are cleaned first. Adding the foreign key would fail outright on
-- a dangling reference, and a dangling reference is exactly what the old column
-- allowed — so null those out rather than let the migration abort on data the
-- previous schema permitted.
UPDATE "Contract" c
   SET "renewedFromId" = NULL
 WHERE c."renewedFromId" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM "Contract" p WHERE p."id" = c."renewedFromId");

-- A contract can never renew itself; that would be a cycle of length one and
-- would make the chain lookup recurse forever.
UPDATE "Contract" SET "renewedFromId" = NULL WHERE "renewedFromId" = "id";

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_renewedFromId_fkey" FOREIGN KEY ("renewedFromId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Renewals are looked up by their source, so index the column that lookup uses.
CREATE INDEX IF NOT EXISTS "Contract_renewedFromId_idx" ON "Contract"("renewedFromId");
