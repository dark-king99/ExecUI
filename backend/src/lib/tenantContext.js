/**
 * Per-request tenant context (AsyncLocalStorage).
 *
 * The authenticate middleware enters this context with the caller's tenantId.
 * The Prisma client extension (config/database.js) then injects that tenantId
 * into every query automatically, so cross-tenant reads/writes are impossible
 * by construction — no route can forget to scope, and new code is safe too.
 *
 * When there is NO context (unauthenticated routes: login, signup, payment
 * webhook, SSE bootstrap before auth), nothing is injected — those flows keep
 * working exactly as before.
 */
import { AsyncLocalStorage } from "node:async_hooks";

const storage = new AsyncLocalStorage();

/** Run `fn` with the given tenant context active for the whole async subtree. */
export function runWithTenant(ctx, fn) {
  return storage.run(ctx, fn);
}

/** Current tenantId, or undefined when running outside a request context. */
export function currentTenantId() {
  return storage.getStore()?.tenantId;
}

/** Full current context ({ tenantId, userId, role }) or undefined. */
export function currentContext() {
  return storage.getStore();
}

/**
 * Escape hatch: run a block WITHOUT tenant scoping (e.g. a system_admin doing a
 * legitimately cross-tenant operation, or lookups keyed on a provider customer id).
 * Use sparingly and deliberately.
 */
export function runUnscoped(fn) {
  return storage.run({ tenantId: undefined, unscoped: true }, fn);
}

export const isUnscoped = () => !!storage.getStore()?.unscoped;
