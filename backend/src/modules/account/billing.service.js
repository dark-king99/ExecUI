import prisma from "../../config/database.js";
import { ValidationError, NotFoundError } from "../../lib/errors.js";
import { notifyMany } from "../notifications/notifications.service.js";
import { log } from "../../lib/logger.js";
import {
  PLANS as PLAN_TIERS, CUSTOM, DEFAULT_PLAN,
  CRM_SOLUTIONS, MKT_SOLUTIONS, SERVICES_SOLUTIONS,
  entitlementsFor, priceFor, listPriceFor, quoteFor, planLabel, aiLimitFor,
} from "../billing/plans.config.js";
import { SEGMENTS, BANDS, marketFor, displayPrice, currencyForCountry } from "../billing/pricing.book.js";
import { provider, providerId, providerInfo, billingEnabled as providerEnabled } from "../billing/providers/index.js";
import { INDUSTRIES } from "../crm/industries/registry.js";
import { getUsage as getAiUsage } from "../../lib/aiQuota.js";
import { TRIAL_DURATION_DAYS } from "../billing/trial.config.js";

// PAID mode when the active payment provider is configured; FREE early-access
// mode when it isn't — choosing a plan then activates immediately. Which
// provider is active is a configuration choice (PAYMENT_PROVIDER), because
// payment-provider availability varies by market.
const BILLING_ENABLED = () => providerEnabled();
const APP_URL = process.env.FRONTEND_URL?.replace(/\/$/, "") || "http://localhost:5173";
const PADDLE_PRICE_ENV = {
  starter: { month: "PADDLE_PRICE_STARTER_MONTH", year: "PADDLE_PRICE_STARTER_YEAR" },
  standard: { month: "PADDLE_PRICE_STANDARD_MONTH", year: "PADDLE_PRICE_STANDARD_YEAR" },
  premium: { month: "PADDLE_PRICE_PREMIUM_MONTH", year: "PADDLE_PRICE_PREMIUM_YEAR" },
  enterprise: { month: "PADDLE_PRICE_ENTERPRISE_MONTH", year: "PADDLE_PRICE_ENTERPRISE_YEAR" },
  executive: {
    month: {
      office: "PADDLE_PRICE_EXECUTIVE_SMALL_OFFICE_MONTH",
      datacenter: "PADDLE_PRICE_EXECUTIVE_ENTERPRISE_MONTH",
    },
    year: {
      office: "PADDLE_PRICE_EXECUTIVE_SMALL_OFFICE_YEAR",
      datacenter: "PADDLE_PRICE_EXECUTIVE_ENTERPRISE_YEAR",
    },
  },
};

function paddlePriceIds(planId) {
  const variables = PADDLE_PRICE_ENV[planId];
  if (!variables) return null;
  const value = (key) => process.env[key]?.trim() || null;
  return Object.fromEntries(Object.entries(variables).map(([interval, entry]) => [
    interval,
    typeof entry === "string"
      ? value(entry)
      : Object.fromEntries(Object.entries(entry).map(([profile, envName]) => [profile, value(envName)])),
  ]));
}

function paddlePriceIdFor(plan, interval, networkProfile) {
  const configured = paddlePriceIds(plan);
  const selected = plan === "executive"
    ? configured?.[interval]?.[networkProfile === "datacenter" ? "datacenter" : "office"]
    : configured?.[interval];
  if (selected) return selected;
  const variable = plan === "executive"
    ? PADDLE_PRICE_ENV.executive[interval]?.[networkProfile === "datacenter" ? "datacenter" : "office"]
    : PADDLE_PRICE_ENV[plan]?.[interval];
  throw new ValidationError(`Paddle price is not configured. Set ${variable ?? `the ${interval} price ID for ${plan}`} in the backend environment.`);
}

// ── Plan catalogue + entitlements (new model) ────────────────────────────────
const planSummary = (p) => ({
  id: p.id, name: p.name, price: p.price, tagline: p.tagline, highlighted: !!p.highlighted,
  crm: p.crm, marketing: p.marketing, services: p.services, network: p.network,
  industry: !!p.industry, networkDatacenterPrice: p.networkDatacenterPrice ?? null,
  ai: aiLimitFor(p.id),
  entitlements: entitlementsFor(p.id),
});

// Industries a Custom plan can bolt on (mirrors the industry registry).
const INDUSTRY_OPTIONS = Object.entries(INDUSTRIES).map(([id, def]) => ({ id, name: def.name }));

/**
 * What the Billing page renders: the tiers, the custom config, the selectable
 * solution catalog and industry options — priced for THIS tenant's market.
 *
 * Prices come from here rather than from the frontend's plan mirror because the
 * regional price book is server-side only. A browser-side copy would be a second
 * source of truth for money, and the easier one to tamper with.
 */
export const getPlanCatalog = async (tenantId, countryCode) => {
  const tenant = tenantId
    ? await prisma.tenant.findUnique({ where: { id: tenantId }, select: { country: true, segment: true, networkProfile: true, industry: true } })
    : null;
  const opts = { country: tenant?.country ?? null, segment: tenant?.segment ?? null };

  return {
    plans: PLAN_TIERS.map((p) => ({
      ...planSummary(p),
      ...(providerId() === "paddle" ? { priceIds: paddlePriceIds(p.id) } : {}),
      // `price` stays the published list price so the comparison table reads
      // consistently; `quote` is what this tenant would actually pay.
      quote: quoteFor(p.id, [], { ...opts, networkProfile: p.network ? tenant?.networkProfile : undefined }),
    })),
    custom: CUSTOM,
    market: marketFor(opts),
    segments: SEGMENTS.map(({ id, label, describe }) => ({ id, label, describe })),
    bands: BANDS.map(({ id, label }) => ({ id, label })),
    provider: providerInfo(),
    ...(countryCode ? { countryCode } : {}),
    catalog: {
      crm: CRM_SOLUTIONS, marketing: MKT_SOLUTIONS, services: SERVICES_SOLUTIONS,
      industries: INDUSTRY_OPTIONS,
    },
  };
};

// Current subscription state for a tenant, enriched by the active provider.
export const getBilling = async (tenantId) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new NotFoundError("Tenant not found");
  const planId = tenant.plan || DEFAULT_PLAN;
  const customSolutions = tenant.planSolutions || [];

  const priceOpts = {
    networkProfile: tenant.networkProfile, industry: tenant.industry,
    country: tenant.country, segment: tenant.segment,
  };
  const price = priceFor(planId, customSolutions, priceOpts);
  const base = {
    plan: planId,
    planName: planLabel(planId),
    price,
    // What the list price is, what this market pays, and in what currency the
    // figure is being shown — so no surface has to guess.
    listPrice: listPriceFor(planId, customSolutions, priceOpts),
    display: displayPrice(price, { country: tenant.country }),
    market: marketFor({ country: tenant.country, segment: tenant.segment }),
    provider: providerInfo(),
    interval: "month",
    customSolutions,
    industry: tenant.industry || "general",
    networkProfile: tenant.networkProfile || "office",
    entitlements: entitlementsFor(planId, customSolutions),
    ai: await getAiUsage(tenantId),
    status: !BILLING_ENABLED() || tenant.providerPlanId === planId
      ? "active"
      : tenant.trialEndsAt
        ? new Date(tenant.trialEndsAt) > new Date() ? "trialing" : "expired"
        : "none",
    planConfirmed: !BILLING_ENABLED() || tenant.providerPlanId === planId,
    trialEndsAt: tenant.trialEndsAt,
    trialDurationDays: tenant.trialEndsAt ? TRIAL_DURATION_DAYS : null,
    freeEarlyAccess: !BILLING_ENABLED(),
    billingEnabled: BILLING_ENABLED(),
    ...(providerId() === "paddle" ? { paddleCustomerId: tenant.providerCustomerId ?? null } : {}),
    subscription: null,
    nextRenewal: null,
    pendingInvoice: null,
    paymentInstructions: [],
  };

  const active = provider();
  try {
    let subscription = tenant.providerSubscriptionId && active.getSubscription
      ? await active.getSubscription(tenantId, {
        customerId: tenant.providerCustomerId,
        subscriptionId: tenant.providerSubscriptionId,
      })
      : null;
    if (!subscription && active.findActiveSubscription && tenant.providerCustomerId) {
      subscription = await active.findActiveSubscription(tenantId, { customerId: tenant.providerCustomerId });
      if (subscription) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { providerSubscriptionId: subscription.id },
        });
      }
    }
    const invoices = active.id === "manual" ? await active.listInvoices(tenantId) : [];
    const pendingInvoice = invoices.find((invoice) => invoice.status === "pending") ?? null;
    if (!subscription) {
      return {
        ...base,
        status: base.status === "none" && pendingInvoice ? "pending" : base.status,
        pendingInvoice,
        paymentInstructions: pendingInvoice ? active.getPaymentInstructions?.() ?? [] : [],
      };
    }
    return {
      ...base,
      status: subscription.status,
      subscription,
      interval: subscription.billingInterval ?? "month",
      nextRenewal: subscription.currentPeriodEnd ?? null,
      pendingInvoice,
      paymentInstructions: pendingInvoice ? active.getPaymentInstructions?.() ?? [] : [],
    };
  } catch (err) {
    log.error("billing_subscription_load_failed", { provider: active.id, error: err.message });
    throw err;
  }
};

// Validate a plan request and resolve the (namespaced) custom solution list.
function resolvePlan(plan, customSolutions = []) {
  const valid = [...PLAN_TIERS.map((p) => p.id), "custom"];
  if (!valid.includes(plan)) throw new ValidationError("Unknown plan");
  if (plan !== "custom") return { plan, solutions: [] };

  // Custom is CRM + Marketing only; minimum 8 solutions.
  const crmIds = CRM_SOLUTIONS.map((s) => `crm:${s.id}`);
  const mktIds = MKT_SOLUTIONS.map((s) => `marketing:${s.id}`);
  const solutions = [...new Set(customSolutions)].filter((s) => crmIds.includes(s) || mktIds.includes(s));
  if (solutions.length < CUSTOM.minUnits) {
    throw new ValidationError(`A custom plan needs at least ${CUSTOM.minUnits} solutions.`);
  }
  return { plan, solutions };
}

// Every plan change lands in the audit log. Webhook-driven changes have no
// acting user, so they're attributed to a tenant admin with a provider note.
async function auditPlanChange(tenantId, actorId, detail) {
  try {
    let userId = actorId;
    if (!userId) {
      const admin = await prisma.user.findFirst({
        where: { tenantId, role: { name: "enterprise_admin" } }, select: { id: true },
      });
      userId = admin?.id;
    }
    if (!userId) return;
    await prisma.auditLog.create({
      data: { userId, tenantId, action: "billing_plan_change", resource: "billing", detail },
    });
  } catch { /* the audit trail must never break billing */ }
}

// Notify every tenant admin's bell (billing events concern admins only).
async function notifyAdmins(tenantId, payload) {
  try {
    const admins = await prisma.user.findMany({
      where: { tenantId, role: { name: { in: ["enterprise_admin", "system_admin"] } } },
      select: { id: true },
    });
    await notifyMany(admins.map((a) => a.id), { tenantId, type: "system", link: "/account/billing", ...payload });
  } catch { /* ignore */ }
}

// Apply a plan to a tenant immediately (used in free mode and after payment).
async function activatePlan(tenantId, plan, solutions, extra = {}, actorId = null) {
  const before = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } });
  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: { plan, planSolutions: solutions, providerPlanId: plan, ...extra },
  });
  auditPlanChange(tenantId, actorId, `Plan ${before?.plan ?? "?"} → ${plan}${actorId ? "" : ` (${providerId()})`}`);
  return {
    activated: true,
    plan: tenant.plan,
    planName: planLabel(tenant.plan),
    price: priceFor(tenant.plan, tenant.planSolutions, { networkProfile: tenant.networkProfile, industry: tenant.industry }),
    customSolutions: tenant.planSolutions,
    industry: tenant.industry || "general",
    entitlements: entitlementsFor(tenant.plan, tenant.planSolutions),
  };
}

// Build a recurring line item from the plan config using inline price data.
function buildLineItems(plan, solutions, opts = {}) {
  // The charged amount is the price-book amount, not the published list price —
  // otherwise a Liberian SME would see a local price on the plan card and a very
  // different number at checkout.
  const amount = priceFor(plan, solutions, opts);
  const tier = PLAN_TIERS.find((p) => p.id === plan);
  const name = plan === "custom" ? "ExecUI Custom Plan" : `ExecUI ${tier?.name ?? plan}`;
  const description = plan === "custom"
    ? `${solutions.length} solutions`
    : (tier?.tagline ?? "");
  return [{
    quantity: 1,
    price_data: {
      // USD is what we settle in. Local currency on the plan card is indicative
      // and labelled as such — see pricing.book.js.
      currency: "usd",
      unit_amount: Math.round(amount * 100),
      recurring: { interval: "month" },
      product_data: { name, description: description || undefined },
    },
  }];
}

/**
 * Choose a plan.
 *  - FREE mode activates immediately.
 *  - PAID mode returns checkout or offline-invoice details; the plan is applied
 *    only after the provider confirms payment.
 */
export const selectPlan = async (tenantId, {
  plan, customSolutions = [], industry, networkProfile, billingInterval = "month",
}, actorId = null) => {
  const { solutions } = resolvePlan(plan, customSolutions);
  // A chosen industry (e.g. the Custom plan's add-on) is applied to the tenant.
  const extra = industry != null ? { industry: String(industry) } : {};

  // The network profile is a property of the plan: only Executive has network,
  // and its tier (office vs enterprise/datacenter) is chosen here — not from the
  // Network module. Any non-network plan is normalised back to "office".
  const planDef = PLAN_TIERS.find((p) => p.id === plan);
  if (planDef?.network) extra.networkProfile = networkProfile === "datacenter" ? "datacenter" : "office";
  else extra.networkProfile = "office";

  if (!BILLING_ENABLED()) {
    return { ...(await activatePlan(tenantId, plan, solutions, extra, actorId)), freeEarlyAccess: true };
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new NotFoundError("Tenant not found");
  // Apply the industry + network-tier choices immediately (access layer); billing follows on the webhook.
  const trialIsActive = tenant.trialEndsAt && new Date(tenant.trialEndsAt) > new Date();
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(trialIsActive ? { plan, planSolutions: solutions } : {}),
      ...(industry != null ? { industry: String(industry) } : {}),
      networkProfile: extra.networkProfile,
    },
  });

  const priceOpts = {
    networkProfile: extra.networkProfile, industry,
    country: tenant.country, segment: tenant.segment,
  };
  const amountUsd = priceFor(plan, solutions, priceOpts);
  const currency = currencyForCountry(tenant.country);
  const shown = displayPrice(amountUsd, { country: tenant.country });

  const active = provider();
  const metadata = {
    tenantId, plan, planSolutions: JSON.stringify(solutions), industry: industry ?? "",
    networkProfile: extra.networkProfile, billingInterval,
  };

  const customerUser = actorId
    ? await prisma.user.findUnique({ where: { id: actorId }, select: { email: true, firstName: true, lastName: true } })
    : null;
  const admin = customerUser ?? await prisma.user.findFirst({
    where: { tenantId, role: { name: "enterprise_admin" } },
    select: { email: true, firstName: true, lastName: true },
  });

  let lineItems = buildLineItems(plan, solutions, priceOpts);
  if (active.id === "paddle") {
    if (plan === "custom") throw new ValidationError("Custom plans are not available through Paddle checkout.");
    lineItems = [{ priceId: paddlePriceIdFor(plan, billingInterval, extra.networkProfile), quantity: 1 }];
  }

  let subscriptionId = tenant.providerSubscriptionId;
  if (active.id === "paddle" && !subscriptionId && tenant.providerCustomerId && active.findActiveSubscription) {
    const existing = await active.findActiveSubscription(tenantId, { customerId: tenant.providerCustomerId });
    if (existing) {
      subscriptionId = existing.id;
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { providerSubscriptionId: existing.id },
      });
    }
  }
  if (active.id === "paddle" && subscriptionId && active.updateSubscription) {
    const updated = await active.updateSubscription({
      subscriptionId,
      plan,
      planSolutions: solutions,
      amountUsd,
      lineItems,
      customData: metadata,
    });
    if (updated.status === "active" || updated.status === "trialing") {
      const activated = await activatePlan(tenantId, plan, solutions, {
        providerCustomerId: updated.customerId ?? tenant.providerCustomerId,
        providerSubscriptionId: updated.id,
        ...extra,
      }, actorId);
      return { ...activated, updatedSubscription: true };
    }
    throw new ValidationError(`Paddle did not confirm this subscription change (status: ${updated.status}). No second subscription was created.`);
  }

  const result = await active.createCheckout({
    tenantId, plan, planSolutions: solutions,
    amountUsd,
    localAmount: shown.local,
    currency,
    lineItems,
    customerId: tenant.providerCustomerId,
    customerEmail: admin?.email ?? null,
    customerName: [admin?.firstName, admin?.lastName].filter(Boolean).join(" ") || null,
    billingInterval,
    networkProfile: extra.networkProfile,
    metadata,
    successUrl: `${APP_URL}/welcome`,
    cancelUrl: `${APP_URL}/account/billing?checkout=cancelled`,
    checkoutPageUrl: `${APP_URL}/checkout`,
  });

  // A provider that can't take money right now (nothing configured) activates
  // the plan rather than stranding the customer on a dead checkout.
  if (result.activateNow) {
    return { ...(await activatePlan(tenantId, plan, solutions, extra, actorId)), freeEarlyAccess: true, reason: result.reason };
  }

  return {
    requiresPayment: true,
    provider: active.id,
    checkoutUrl: result.url ?? null,
    successUrl: result.successUrl ?? null,
    cancelUrl: result.cancelUrl ?? null,
    sessionId: result.sessionId ?? null,
    // Offline providers answer with an invoice and instructions instead of a URL.
    invoice: result.invoice ?? null,
    instructions: result.instructions ?? null,
    amountUsd,
    display: shown,
    plan,
    planName: planLabel(plan),
  };
};

// ── Manual (offline) invoices ────────────────────────────────────────────────
/** Invoices this tenant has been issued. Empty unless the manual provider is on. */
export const listPlatformInvoices = async (tenantId) => {
  const active = provider();
  if (active.id !== "manual") return [];
  return active.listInvoices(tenantId);
};

/**
 * Confirm an offline payment and activate the plan it was for.
 *
 * Deliberately keyed on the invoice REFERENCE — that is the string the customer
 * quotes on the transfer, so an operator confirming a payment works from the
 * same identifier the money arrived with.
 *
 * Restricted to system_admin at the route: this is the platform taking money,
 * not a tenant administering itself. A tenant able to call it would grant itself
 * any plan for free.
 */
export const confirmPlatformInvoice = async (reference, { method, note } = {}, actorId = null) => {
  const invoice = await prisma.platformInvoice.findFirst({ where: { reference: String(reference).trim().toUpperCase() } });
  if (!invoice) throw new NotFoundError("No invoice with that reference");
  if (invoice.status === "paid") throw new ValidationError("That invoice is already settled");
  if (invoice.status === "void") throw new ValidationError("That invoice was voided");

  const updated = await prisma.platformInvoice.update({
    where: { id: invoice.id },
    data: { status: "paid", paidAt: new Date(), method: method ?? null, note: note ?? null, confirmedById: actorId },
  });
  await activatePlan(invoice.tenantId, invoice.plan, invoice.planSolutions ?? [], {}, actorId);
  return { reference: updated.reference, plan: updated.plan, tenantId: updated.tenantId, paidAt: updated.paidAt };
};

// ── Public service functions ──────────────────────────────────────────────────

export const getInvoices = async (tenantId) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new NotFoundError("Tenant not found");
  const active = provider();
  return active.listInvoices(tenantId, { customerId: tenant.providerCustomerId });
};

export const createPortalSession = async (tenantId) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new NotFoundError("Tenant not found");
  const active = provider();
  if (!active.capabilities?.customerPortal) return { supported: false, url: null };
  return active.createPortalSession(tenantId, {
    customerId: tenant.providerCustomerId,
    subscriptionIds: tenant.providerSubscriptionId ? [tenant.providerSubscriptionId] : [],
  });
};

export const getInvoicePdf = async (tenantId, invoiceId) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new NotFoundError("Tenant not found");
  const active = provider();
  if (!active.getInvoicePdf) throw new NotFoundError("Invoice downloads are not supported by this provider");
  const url = await active.getInvoicePdf(tenantId, invoiceId, { customerId: tenant.providerCustomerId });
  if (!url) throw new NotFoundError("Invoice PDF is not available");
  return { url };
};

export const handleWebhook = async (payload, headers) => {
  const active = provider();
  if (!active.capabilities?.webhooks || !active.verifyWebhook) {
    throw Object.assign(new Error("Webhooks are not supported by the active payment provider"), { status: 400 });
  }
  const event = await active.verifyWebhook(payload, headers);
  const eventId = event.eventId ?? event.id;
  if (!eventId || !event.eventType) {
    throw Object.assign(new Error("Payment webhook did not include an event id and type"), { status: 400 });
  }

  try {
    await prisma.webhookEvent.create({ data: { id: eventId, type: event.eventType } });
  } catch (err) {
    if (err.code === "P2002") return { received: true, duplicate: true };
    throw err;
  }

  const data = event.data ?? {};
  const customData = data.customData ?? {};
  const tenantId = customData.tenantId;
  const customerId = data.customerId ?? null;
  const subscriptionId = data.subscriptionId ?? null;

  if (event.eventType === "transaction.completed") {
    if (tenantId && customData.plan) {
      let solutions = [];
      try {
        const values = customData.planSolutions;
        solutions = Array.isArray(values) ? values : JSON.parse(values ?? "[]");
      } catch (err) {
        throw Object.assign(new Error(`Invalid planSolutions in payment metadata: ${err.message}`), { status: 400 });
      }
      await activatePlan(tenantId, customData.plan, solutions, {
        providerCustomerId: customerId,
        providerSubscriptionId: subscriptionId,
      });
    }
  } else if (event.eventType === "subscription.created" || event.eventType === "subscription.updated") {
    const tenant = tenantId
      ? await prisma.tenant.findUnique({ where: { id: tenantId } })
      : customerId
        ? await prisma.tenant.findFirst({ where: { providerCustomerId: customerId } })
        : null;
    if (tenant) {
      const providerFields = {
        providerCustomerId: customerId ?? tenant.providerCustomerId,
        providerSubscriptionId: subscriptionId ?? data.id ?? tenant.providerSubscriptionId,
      };
      if (data.status === "canceled") {
        await activatePlan(tenant.id, "standard", [], {
          ...providerFields,
          providerSubscriptionId: null,
          providerPlanId: null,
        });
        notifyAdmins(tenant.id, {
          title: "Subscription cancelled — plan set to Standard",
          body: "Your paid period ended. Choose a plan in Billing to restore full access.",
        });
      } else {
        if (customData.plan && ["active", "trialing"].includes(data.status)) {
          let solutions = [];
          try {
            const values = customData.planSolutions;
            solutions = Array.isArray(values) ? values : JSON.parse(values ?? "[]");
          } catch (err) {
            throw Object.assign(new Error(`Invalid planSolutions in subscription metadata: ${err.message}`), { status: 400 });
          }
          await activatePlan(tenant.id, customData.plan, solutions, providerFields);
        } else {
          await prisma.tenant.update({ where: { id: tenant.id }, data: providerFields });
        }
        if (["past_due", "paused"].includes(data.status)) {
          notifyAdmins(tenant.id, {
            title: "Payment problem on your subscription",
            body: "Your subscription needs attention. Open Billing to review payment options.",
          });
        }
      }
    }
  }

  return { received: true };
};
