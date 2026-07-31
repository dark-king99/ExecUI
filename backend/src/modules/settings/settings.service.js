/**
 * Per-tenant settings — read, write, and the branding view every surface uses.
 *
 * Two rules hold this together:
 *
 *   1. **Reads never fail on entitlement.** A tenant that set a logo on
 *      Enterprise and downgraded still has that row; what changes is that the
 *      value stops being *applied*. `brandingFor` resolves the plan first and
 *      returns platform defaults when the plan doesn't include branding, so a
 *      downgrade takes effect everywhere at once without deleting anything the
 *      customer might get back by upgrading.
 *   2. **Writes are the only place entitlement is enforced**, and they enforce
 *      it per setting, because the registry gates individual keys rather than
 *      the whole group.
 */
import prisma from "../../config/database.js";
import { runUnscoped } from "../../lib/tenantContext.js";
import { entitlementsFor } from "../billing/plans.config.js";
import { SETTINGS, GROUPS, getSetting, coerce, DEFAULTS, PUBLIC_KEYS } from "./settings.registry.js";

const err = (message, status = 400) => Object.assign(new Error(message), { status });

/** The platform's own identity — what a tenant without branding gets. */
export const PLATFORM = Object.freeze({
  productName: "ExecUI",
  logoUrl: null,
  primaryColor: null,
  supportEmail: null,
  hidePoweredBy: false,
  emailFromName: null,
});

/** Raw stored values for a tenant, defaults filled in. Not entitlement-aware. */
export async function rawSettings(tenantId) {
  const rows = await runUnscoped(async () =>
    prisma.tenantSetting.findMany({ where: { tenantId }, select: { key: true, value: true } }),
  );
  const out = { ...DEFAULTS };
  for (const r of rows) if (getSetting(r.key)) out[r.key] = r.value;
  return out;
}

/** Does this plan include `flag`? (`branding`, `sso`, …) */
export function planAllows(tenant, flag) {
  if (!flag) return true;
  const ent = entitlementsFor(tenant?.plan, tenant?.planSolutions ?? []);
  return !!ent[flag];
}

/**
 * Branding as every surface should see it: the tenant's values where the plan
 * allows them, the platform's otherwise. `organizationName` is always the
 * tenant's real name — that is not branding, it's who they are.
 */
export async function brandingFor(tenantId) {
  const tenant = await runUnscoped(async () =>
    prisma.tenant.findFirst({ where: { id: tenantId }, select: { id: true, name: true, slug: true, plan: true, planSolutions: true } }),
  );
  if (!tenant) return { ...PLATFORM, organizationName: null, entitled: false };
  return brandingFromTenant(tenant, await rawSettings(tenantId));
}

/** The pure half of `brandingFor`, so callers holding a tenant skip the query. */
export function brandingFromTenant(tenant, values = {}) {
  const entitled = planAllows(tenant, "branding");
  const pick = (key, fallback) => (entitled && values[key] != null && values[key] !== "" ? values[key] : fallback);
  return {
    organizationName: tenant.name ?? null,
    productName: pick("branding.productName", PLATFORM.productName),
    logoUrl: pick("branding.logoUrl", PLATFORM.logoUrl),
    primaryColor: pick("branding.primaryColor", PLATFORM.primaryColor),
    supportEmail: pick("branding.supportEmail", PLATFORM.supportEmail),
    hidePoweredBy: entitled ? values["branding.hidePoweredBy"] === true : false,
    emailFromName: pick("branding.emailFromName", PLATFORM.emailFromName),
    entitled,
  };
}

/**
 * The `from` header for mail sent on a tenant's behalf.
 *
 * Only the DISPLAY NAME is per-tenant. The address stays on the platform's
 * verified sending domain, because mail from a domain we haven't proven we own
 * is mail that lands in spam — giving a tenant their own sending address needs
 * their domain verified with the mail provider first, which is a separate piece
 * of work. Returning undefined lets lib/email.js fall back to RESEND_FROM.
 */
export function senderFor(branding) {
  const name = branding?.emailFromName || (branding?.entitled ? branding?.productName : null);
  if (!name) return undefined;
  const configured = process.env.RESEND_FROM || "ExecUI <onboarding@resend.dev>";
  const address = configured.match(/<([^>]+)>/)?.[1] ?? configured.trim();
  // The display name is tenant-supplied, so strip everything with meaning in a
  // mail header before quoting it: angle brackets and separators could append a
  // second address, and CR/LF could append a whole header.
  const safe = String(name).replace(/["\\<>,;:\r\n]/g, "").trim().slice(0, 60);
  if (!safe) return undefined;
  return `"${safe}" <${address}>`;
}

/**
 * The subset a no-session caller may read (customer portal, signing page).
 * Built from the registry's `public` flag rather than a second hand-kept list,
 * so marking a setting private actually removes it from here.
 */
export async function publicBranding(tenantId) {
  const b = await brandingFor(tenantId);
  const allowed = new Set(PUBLIC_KEYS.map((k) => k.replace(/^branding\./, "")));
  const out = { organizationName: b.organizationName, entitled: b.entitled };
  for (const [k, v] of Object.entries(b)) if (allowed.has(k)) out[k] = v;
  return out;
}

/** Admin view: every setting with its declaration, current value and gating. */
export async function describeSettings(tenantId) {
  const tenant = await runUnscoped(async () =>
    prisma.tenant.findFirst({ where: { id: tenantId }, select: { plan: true, planSolutions: true } }),
  );
  const values = await rawSettings(tenantId);
  return {
    groups: GROUPS,
    settings: SETTINGS.map((d) => ({
      key: d.key, group: d.group, type: d.type, label: d.label,
      describe: d.describe, max: d.max, default: d.default,
      value: values[d.key] ?? d.default,
      entitlement: d.entitlement,
      // The UI shows a locked field rather than hiding it: an admin should be
      // able to see what upgrading would buy them.
      allowed: planAllows(tenant, d.entitlement),
    })),
  };
}

/**
 * Write a batch of settings. Every key is validated before anything is stored,
 * so a request with one bad field changes nothing at all.
 */
export async function updateSettings(tenantId, userId, patch = {}) {
  const tenant = await runUnscoped(async () =>
    prisma.tenant.findFirst({ where: { id: tenantId }, select: { plan: true, planSolutions: true } }),
  );

  const writes = [];
  const errors = [];
  for (const [key, raw] of Object.entries(patch)) {
    const def = getSetting(key);
    if (!def) { errors.push(`Unknown setting "${key}"`); continue; }
    if (!planAllows(tenant, def.entitlement)) {
      errors.push(`${def.label} isn't included in your plan`);
      continue;
    }
    const { value, error } = coerce(key, raw);
    if (error) { errors.push(error); continue; }
    writes.push({ key, value });
  }
  if (errors.length) throw err(errors.join("; "));

  await runUnscoped(async () => {
    await prisma.$transaction(
      writes.map(({ key, value }) =>
        prisma.tenantSetting.upsert({
          where: { tenantId_key: { tenantId, key } },
          create: { tenantId, key, value, updatedById: userId ?? null },
          update: { value, updatedById: userId ?? null },
        }),
      ),
    );
  });

  if (writes.length) {
    await prisma.auditLog.create({
      data: {
        userId, tenantId, action: "update_settings", resource: "tenant", resourceId: tenantId,
        detail: `Updated ${writes.map((w) => w.key).join(", ")}`,
      },
    });
  }
  return describeSettings(tenantId);
}
