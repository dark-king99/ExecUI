import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { currentTenantId, isUnscoped } from "../lib/tenantContext.js";

import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

import { emitDomainEvent } from "../lib/domainEvents.js";
import { RESOURCES } from "../modules/api/api.resources.js";

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
 * No active context (login, signup, payment webhook) or an explicit runUnscoped
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

/**
 * Domain-event capture (the source of outbound webhooks).
 *
 * Watching writes here — rather than in the API layer — means an event fires
 * however the change was made: through the public API, through the app's own
 * UI, or by a background job. That's what makes "notify me when a deal closes"
 * actually dependable.
 *
 * Only models exposed as public API resources are watched, and emission is
 * fire-and-forget: a webhook failure can never roll back a database write.
 * `updateMany`/`deleteMany` are deliberately not covered — they return counts,
 * not records, so there is no payload to send (documented in docs/API.md).
 */
const delegateOf = (model) => model[0].toLowerCase() + model.slice(1);
const EVENT_MODELS = new Map(
  Object.values(RESOURCES).map((r) => [r.model, r.id]),
);

const eventEmitter = Prisma.defineExtension({
  name: "domain-events",
  query: {
    $allModels: {
      async create({ model, args, query }) {
        const result = await query(args);
        publish(model, "created", result);
        return result;
      },
      async update({ model, args, query }) {
        const result = await query(args);
        publish(model, "updated", result);
        return result;
      },
      async delete({ model, args, query }) {
        const result = await query(args);
        publish(model, "deleted", result);
        return result;
      },
    },
  },
});

function publish(model, action, record) {
  try {
    const resource = EVENT_MODELS.get(delegateOf(model));
    if (!resource || !record) return;
    const tenantId = record.tenantId || currentTenantId();
    if (!tenantId) return;
    emitDomainEvent({ tenantId, resource, action, type: `${resource}.${action}`, record });
  } catch {
    /* never disturb the write */
  }
}

const prisma = basePrisma.$extends(tenantGuard).$extends(eventEmitter);

export default prisma;
