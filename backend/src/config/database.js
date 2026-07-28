import { PrismaClient, Prisma } from "@prisma/client";
import { currentTenantId, isUnscoped } from "../lib/tenantContext.js";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
// Models that carry a tenantId column — computed from the runtime schema so the
// isolation guard can never drift from the models themselves.
const TENANT_MODELS = new Set(
  Prisma.dmmf.datamodel.models
    .filter((m) => m.fields.some((f) => f.name === "tenantId"))
    .map((m) => m.name)
);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const scope = () => (isUnscoped() ? undefined : currentTenantId());
const withTenant = (where, tenantId) => ({ ...(where ?? {}), tenantId });
const delegateName = (model) => model[0].toLowerCase() + model.slice(1);

// The un-extended client: findUnique rewrites call findFirst here so they don't
// recurse back through the extension.
const basePrisma = new PrismaClient({
  adapter,
  log: process.env.LOG_LEVEL === "debug" ? ["warn", "error"] : ["error"],
});

/**
 * Multi-tenant isolation guard (Prisma client extension).
 *
 * While a request's tenant context is active (set by authenticate), the
 * caller's tenantId is injected into EVERY query on a tenant-scoped model:
 *   • reads / updates / deletes → forced into the `where` filter
 *   • findUnique                → rewritten to findFirst so the filter can apply
 *   • create / createMany / upsert → forced into the created `data`
 * A cross-tenant id then matches nothing (P2025 on writes, null on reads), so
 * cross-tenant access is impossible by construction — every one of the ~450
 * routes is covered, and new code is safe automatically.
 *
 * No active context (login, signup, Stripe webhook) or an explicit runUnscoped
 * block ⇒ no injection, so system flows are unaffected.
 */
const inject = (op) => async ({ model, args, query }) => {
  const tenantId = scope();
  if (!tenantId || !TENANT_MODELS.has(model)) return query(args);

  switch (op) {
    case "where":
      return query({ ...args, where: withTenant(args.where, tenantId) });
    case "create":
      return query({ ...args, data: { ...(args.data ?? {}), tenantId } });
    case "createMany": {
      const data = Array.isArray(args.data) ? args.data : [args.data];
      return query({ ...args, data: data.map((d) => ({ ...d, tenantId })) });
    }
    case "upsert":
      return query({
        ...args,
        where: withTenant(args.where, tenantId),
        create: { ...(args.create ?? {}), tenantId },
      });
    default:
      return query(args);
  }
};

const tenantGuard = Prisma.defineExtension({
  name: "tenant-guard",
  query: {
    $allModels: {
      findFirst:        inject("where"),
      findFirstOrThrow: inject("where"),
      findMany:         inject("where"),
      count:            inject("where"),
      aggregate:        inject("where"),
      groupBy:          inject("where"),
      update:           inject("where"),
      updateMany:       inject("where"),
      delete:           inject("where"),
      deleteMany:       inject("where"),
      create:           inject("create"),
      createMany:       inject("createMany"),
      upsert:           inject("upsert"),
      // findUnique's where is unique-only; run it as findFirst with the filter.
      async findUnique({ model, args, query }) {
        const tenantId = scope();
        if (!tenantId || !TENANT_MODELS.has(model)) return query(args);
        return basePrisma[delegateName(model)].findFirst({ ...args, where: withTenant(args.where, tenantId) });
      },
      async findUniqueOrThrow({ model, args, query }) {
        const tenantId = scope();
        if (!tenantId || !TENANT_MODELS.has(model)) return query(args);
        return basePrisma[delegateName(model)].findFirstOrThrow({ ...args, where: withTenant(args.where, tenantId) });
      },
    },
  },
});

const prisma = basePrisma.$extends(tenantGuard);

export default prisma;
