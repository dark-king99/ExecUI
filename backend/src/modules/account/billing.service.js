import Stripe from "stripe";
import prisma from "../../config/database.js";
import { ValidationError, NotFoundError } from "../../lib/errors.js";
import {
  PLANS as PLAN_TIERS, CUSTOM, DEFAULT_PLAN,
  CRM_SOLUTIONS, MKT_SOLUTIONS, SERVICES_SOLUTIONS,
  entitlementsFor, priceFor, planLabel,
} from "../billing/plans.config.js";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY?.trim() || null;
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY, { apiVersion: "2024-04-10" }) : null;

// When Stripe is configured we run in PAID mode: choosing a plan sends the admin
// through Stripe Checkout and the plan activates on the paid webhook. Without a
// key we run in FREE early-access mode: choosing a plan activates immediately.
const BILLING_ENABLED = !!stripe;
const APP_URL = process.env.FRONTEND_URL?.replace(/\/$/, "") || "http://localhost:5173";

// ── Plan catalogue + entitlements (new model) ────────────────────────────────
const planSummary = (p) => ({
  id: p.id, name: p.name, price: p.price, tagline: p.tagline, highlighted: !!p.highlighted,
  crm: p.crm, marketing: p.marketing, services: p.services, network: p.network,
  entitlements: entitlementsFor(p.id),
});

// What the Billing page renders: the 4 tiers, the custom config, and the
// selectable solution catalog (CRM + Marketing only for custom).
export const getPlanCatalog = () => Promise.resolve({
  plans: PLAN_TIERS.map(planSummary),
  custom: CUSTOM,
  catalog: {
    crm: CRM_SOLUTIONS, marketing: MKT_SOLUTIONS, services: SERVICES_SOLUTIONS,
  },
});

// Current subscription state for a tenant. When Stripe is live, we enrich the
// tenant's plan (the source of truth for access) with the real subscription
// status, renewal date, and default card.
export const getBilling = async (tenantId) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new NotFoundError("Tenant not found");
  const planId = tenant.plan || DEFAULT_PLAN;
  const customSolutions = tenant.planSolutions || [];

  const base = {
    plan: planId,
    planName: planLabel(planId),
    price: priceFor(planId, customSolutions),
    interval: "month",
    customSolutions,
    entitlements: entitlementsFor(planId, customSolutions),
    status: "active",
    // Free early-access only when Stripe isn't configured yet.
    freeEarlyAccess: !BILLING_ENABLED,
    billingEnabled: BILLING_ENABLED,
    subscription: null,
    paymentMethod: null,
    nextRenewal: null,
  };

  if (!stripe || !tenant.stripeCustomerId) return base;

  try {
    const subs = await stripe.subscriptions.list({
      customer: tenant.stripeCustomerId, limit: 1, status: "all",
      expand: ["data.default_payment_method"],
    });
    const sub = subs.data[0] ?? null;
    if (!sub) return base;
    const pm = sub.default_payment_method ?? null;
    return {
      ...base,
      status: sub.status, // active | trialing | past_due | canceled | unpaid | incomplete
      subscription: {
        id: sub.id,
        status: sub.status,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        currentPeriodEnd: sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString().slice(0, 10) : null,
      },
      nextRenewal: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString().slice(0, 10) : null,
      paymentMethod: pm ? fmtPaymentMethod(pm) : null,
    };
  } catch (err) {
    console.error("Stripe getBilling error:", err.message);
    return base;
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

// Apply a plan to a tenant immediately (used in free mode and after payment).
async function activatePlan(tenantId, plan, solutions, extra = {}) {
  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: { plan, planSolutions: solutions, stripePlanId: plan, ...extra },
  });
  return {
    activated: true,
    plan: tenant.plan,
    planName: planLabel(tenant.plan),
    price: priceFor(tenant.plan, tenant.planSolutions),
    customSolutions: tenant.planSolutions,
    entitlements: entitlementsFor(tenant.plan, tenant.planSolutions),
  };
}

// Build a Stripe Checkout line item from the plan config using inline
// price_data — no pre-created Stripe Prices/Products required.
function buildLineItems(plan, solutions) {
  if (plan === "custom") {
    return [{
      quantity: solutions.length,
      price_data: {
        currency: "usd",
        unit_amount: CUSTOM.unitPrice * 100,
        recurring: { interval: "month" },
        product_data: { name: "ExecUI Custom Plan", description: `${solutions.length} solutions × $${CUSTOM.unitPrice}/mo` },
      },
    }];
  }
  const tier = PLAN_TIERS.find((p) => p.id === plan);
  return [{
    quantity: 1,
    price_data: {
      currency: "usd",
      unit_amount: tier.price * 100,
      recurring: { interval: "month" },
      product_data: { name: `ExecUI ${tier.name}`, description: tier.tagline },
    },
  }];
}

/**
 * Choose a plan.
 *  - FREE mode (no Stripe key): activates immediately.
 *  - PAID mode (Stripe configured): returns a Checkout URL; the plan is applied
 *    once payment succeeds (checkout.session.completed webhook).
 */
export const selectPlan = async (tenantId, { plan, customSolutions = [] }) => {
  const { solutions } = resolvePlan(plan, customSolutions);

  if (!BILLING_ENABLED) {
    return { ...(await activatePlan(tenantId, plan, solutions)), freeEarlyAccess: true };
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new NotFoundError("Tenant not found");

  const customerId = await ensureStripeCustomer(tenant);
  const metadata = { tenantId, plan, planSolutions: JSON.stringify(solutions) };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: buildLineItems(plan, solutions),
    metadata,
    subscription_data: { metadata },
    // Replace any existing subscription rather than stacking a second one.
    allow_promotion_codes: true,
    success_url: `${APP_URL}/account/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/account/billing?checkout=cancelled`,
  });

  return { requiresPayment: true, checkoutUrl: session.url, plan, planName: planLabel(plan) };
};

// Legacy plan catalogue (kept for the old Stripe path/webhook code below).
export const LEGACY_PLANS = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 49,
    yearlyPrice: 470,
    monthlyCost: "$49",
    yearlyCost: "$470",
    description: "Perfect for small teams getting started",
    features: [
      "Up to 5 users",
      "CRM & Sales Pipeline",
      "Basic Analytics",
      "2 API Keys",
      "Email Support",
    ],
    highlighted: false,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? null,
    stripePriceIdYearly:  process.env.STRIPE_PRICE_STARTER_YEARLY  ?? null,
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPrice: 149,
    yearlyPrice: 1430,
    monthlyCost: "$149",
    yearlyCost: "$1,430",
    description: "For growing businesses with advanced needs",
    features: [
      "Up to 25 users",
      "Everything in Starter",
      "Marketing Automation",
      "Network Management",
      "10 API Keys",
      "Priority Support",
    ],
    highlighted: true,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_GROWTH_MONTHLY ?? null,
    stripePriceIdYearly:  process.env.STRIPE_PRICE_GROWTH_YEARLY  ?? null,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: 499,
    yearlyPrice: 4790,
    monthlyCost: "$499",
    yearlyCost: "$4,790",
    description: "Full platform for enterprise organisations",
    features: [
      "Unlimited users",
      "Everything in Growth",
      "Enterprise Workspace",
      "Custom Integrations",
      "Dedicated CSM",
      "Audit Logs & Compliance",
      "SLA Guarantee",
      "Unlimited API Keys",
    ],
    highlighted: false,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ?? null,
    stripePriceIdYearly:  process.env.STRIPE_PRICE_ENTERPRISE_YEARLY  ?? null,
  },
];

const planById = (id) => LEGACY_PLANS.find((p) => p.id === id) ?? LEGACY_PLANS[2];
const fmtAmount = (cents) => `$${(cents / 100).toFixed(2)}`;

// ── Demo data (used when no Stripe key is configured) ─────────────────────────
const demoNextRenewal = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};

// Default state when no Stripe subscription exists: no active plan, no history.
const DEMO_BILLING = {
  customerId: null,
  plan: {
    id: null,
    name: "No active plan",
    monthlyCost: "$0",
    interval: "month",
    status: "none",
    features: [],
    currentPeriodEnd: null,
  },
  status: "none",
  nextRenewal: null,
  paymentMethod: null,
};

const DEMO_INVOICES = [];

const DEMO_PAYMENT_METHODS = [];

// ── Stripe helpers ────────────────────────────────────────────────────────────

async function ensureStripeCustomer(tenant) {
  if (tenant.stripeCustomerId) return tenant.stripeCustomerId;
  const customer = await stripe.customers.create({
    name: tenant.name,
    metadata: { tenantId: tenant.id, slug: tenant.slug },
  });
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

function fmtInvoice(inv) {
  return {
    id: inv.number ?? inv.id,
    stripeId: inv.id,
    date: new Date(inv.created * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    plan: inv.lines?.data?.[0]?.description ?? "Subscription",
    amount: fmtAmount(inv.amount_due ?? inv.total ?? 0),
    status: inv.status,
    pdfUrl: inv.invoice_pdf ?? null,
    hostedUrl: inv.hosted_invoice_url ?? null,
  };
}

function fmtPaymentMethod(pm) {
  return {
    id: pm.id,
    brand: pm.card?.brand ?? "card",
    last4: pm.card?.last4 ?? "????",
    expiry: pm.card ? `${String(pm.card.exp_month).padStart(2, "0")}/${String(pm.card.exp_year).slice(-2)}` : null,
    isDefault: false,
  };
}

// ── Public service functions ──────────────────────────────────────────────────

export const getPaymentMethods = async (tenantId) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!stripe || !tenant?.stripeCustomerId) return DEMO_PAYMENT_METHODS;

  try {
    const { data } = await stripe.paymentMethods.list({ customer: tenant.stripeCustomerId, type: "card", limit: 10 });
    const customer  = await stripe.customers.retrieve(tenant.stripeCustomerId);
    const defaultPm = customer.invoice_settings?.default_payment_method;
    return data.map((pm) => ({ ...fmtPaymentMethod(pm), isDefault: pm.id === defaultPm }));
  } catch (err) {
    console.error("Stripe getPaymentMethods error:", err.message);
    return DEMO_PAYMENT_METHODS;
  }
};

export const getInvoices = async (tenantId) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!stripe || !tenant?.stripeCustomerId) return DEMO_INVOICES;

  try {
    const { data } = await stripe.invoices.list({ customer: tenant.stripeCustomerId, limit: 24 });
    return data.map(fmtInvoice);
  } catch (err) {
    console.error("Stripe getInvoices error:", err.message);
    return DEMO_INVOICES;
  }
};

export const upgradePlan = async (tenantId, data) => {
  const { planId, interval = "month" } = data;
  const plan = LEGACY_PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error("Unknown plan");

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new NotFoundError("Tenant not found");

  if (!stripe) {
    await prisma.tenant.update({ where: { id: tenantId }, data: { stripePlanId: planId } });
    return { upgraded: true, plan: planId };
  }

  try {
    const priceId = interval === "year" ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;
    if (!priceId) throw new Error("Stripe price ID not configured for this plan");

    const customerId = await ensureStripeCustomer(tenant);
    const existing   = await stripe.subscriptions.list({ customer: customerId, limit: 1, status: "active" });
    let sub;

    if (existing.data.length > 0) {
      const current = existing.data[0];
      sub = await stripe.subscriptions.update(current.id, {
        items: [{ id: current.items.data[0].id, price: priceId }],
        proration_behavior: "create_prorations",
      });
    } else {
      sub = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: "default_incomplete",
        expand: ["latest_invoice.payment_intent"],
      });
    }

    await prisma.tenant.update({ where: { id: tenantId }, data: { stripePlanId: planId, stripeSubId: sub.id } });
    return { upgraded: true, subscriptionId: sub.id, plan: planId, status: sub.status };
  } catch (err) {
    throw new Error(err.message);
  }
};

export const createPortalSession = async (tenantId, returnUrl) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!stripe) return { url: null, demo: true };

  try {
    const customerId = await ensureStripeCustomer(tenant);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl ?? `${process.env.FRONTEND_URL ?? "http://localhost:5173"}/account/billing`,
    });
    return { url: session.url };
  } catch (err) {
    throw new Error(err.message);
  }
};

export const createSetupSession = async (tenantId, returnUrl) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!stripe) return { url: null, clientSecret: null, demo: true };

  try {
    const customerId = await ensureStripeCustomer(tenant);
    const intent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
    });
    return { clientSecret: intent.client_secret };
  } catch (err) {
    throw new Error(err.message);
  }
};

export const handleWebhook = async (payload, sig) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) return { received: true };

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }

  switch (event.type) {
    // Payment succeeded → activate the chosen plan from the session metadata.
    case "checkout.session.completed": {
      const session = event.data.object;
      const md = session.metadata || {};
      if (md.tenantId && md.plan) {
        let solutions = [];
        try { solutions = JSON.parse(md.planSolutions || "[]"); } catch { solutions = []; }
        await activatePlan(md.tenantId, md.plan, solutions, {
          stripeCustomerId: session.customer,
          stripeSubId: session.subscription,
        });
        // Cancel any older subscriptions so the customer isn't billed twice.
        if (session.customer && session.subscription) {
          try {
            const subs = await stripe.subscriptions.list({ customer: session.customer, status: "active", limit: 10 });
            for (const s of subs.data) {
              if (s.id !== session.subscription) await stripe.subscriptions.cancel(s.id);
            }
          } catch (err) {
            console.error("Stripe cleanup of old subscriptions failed:", err.message);
          }
        }
      }
      break;
    }

    // Keep the stored subscription id in sync with Stripe's lifecycle.
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const tenant = await prisma.tenant.findFirst({ where: { stripeCustomerId: sub.customer } });
      if (tenant) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { stripeSubId: event.type === "customer.subscription.deleted" ? null : sub.id },
        });
        // On a full cancellation the org keeps its selected plan tier (so access
        // is unchanged) but has no live subscription; an admin can re-subscribe.
      }
      break;
    }
    default:
      break;
  }

  return { received: true };
};
