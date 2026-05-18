import Stripe from "stripe";
import prisma from "../../config/database.js";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY?.trim() || null;
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY, { apiVersion: "2024-04-10" }) : null;

// ── Plan catalogue ────────────────────────────────────────────────────────────
export const PLANS = [
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

const planById = (id) => PLANS.find((p) => p.id === id) ?? PLANS[2];
const fmtAmount = (cents) => `$${(cents / 100).toFixed(2)}`;

// ── Demo data (used when no Stripe key is configured) ─────────────────────────
const demoNextRenewal = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};

const DEMO_BILLING = {
  customerId: null,
  plan: {
    id: "enterprise",
    name: "Enterprise",
    monthlyCost: "$499",
    interval: "month",
    status: "active",
    features: planById("enterprise").features,
    currentPeriodEnd: demoNextRenewal(),
  },
  status: "active",
  nextRenewal: demoNextRenewal(),
  paymentMethod: { brand: "visa", last4: "4242", expiry: "12/27", type: "card" },
};

const DEMO_INVOICES = [
  { id: "INV-2026-005", date: "May 1, 2026",  plan: "Enterprise", amount: "$499.00", status: "paid",  pdfUrl: null },
  { id: "INV-2026-004", date: "Apr 1, 2026",  plan: "Enterprise", amount: "$499.00", status: "paid",  pdfUrl: null },
  { id: "INV-2026-003", date: "Mar 1, 2026",  plan: "Enterprise", amount: "$499.00", status: "paid",  pdfUrl: null },
  { id: "INV-2026-002", date: "Feb 1, 2026",  plan: "Growth",     amount: "$149.00", status: "paid",  pdfUrl: null },
  { id: "INV-2026-001", date: "Jan 1, 2026",  plan: "Growth",     amount: "$149.00", status: "paid",  pdfUrl: null },
  { id: "INV-2025-012", date: "Dec 1, 2025",  plan: "Starter",    amount: "$49.00",  status: "paid",  pdfUrl: null },
];

const DEMO_PAYMENT_METHODS = [
  { id: "pm_demo_1", brand: "visa",       last4: "4242", expiry: "12/27", isDefault: true  },
  { id: "pm_demo_2", brand: "mastercard", last4: "5555", expiry: "08/26", isDefault: false },
];

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

export const getPlans = () => Promise.resolve(PLANS.map(({ stripePriceIdMonthly, stripePriceIdYearly, ...p }) => p));

export const getBilling = async (tenantId) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("Tenant not found");

  if (!stripe) return DEMO_BILLING;

  try {
    const customerId = await ensureStripeCustomer(tenant);
    const [subscriptions, paymentMethods] = await Promise.all([
      stripe.subscriptions.list({ customer: customerId, limit: 1, status: "active", expand: ["data.default_payment_method"] }),
      stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 5 }),
    ]);

    const sub = subscriptions.data[0] ?? null;
    const pm = sub?.default_payment_method ?? paymentMethods.data[0] ?? null;
    const priceId = sub?.items?.data?.[0]?.price?.id ?? null;
    const activePlan = PLANS.find((p) => p.stripePriceIdMonthly === priceId || p.stripePriceIdYearly === priceId) ?? PLANS[2];

    return {
      customerId,
      plan: {
        id: activePlan.id,
        name: activePlan.name,
        monthlyCost: activePlan.monthlyCost,
        interval: sub?.items?.data?.[0]?.price?.recurring?.interval ?? "month",
        status: sub?.status ?? "active",
        features: activePlan.features,
        currentPeriodEnd: sub ? new Date(sub.current_period_end * 1000).toISOString().slice(0, 10) : demoNextRenewal(),
      },
      status: sub?.status ?? "active",
      nextRenewal: sub ? new Date(sub.current_period_end * 1000).toISOString().slice(0, 10) : demoNextRenewal(),
      paymentMethod: pm ? {
        brand: pm.card?.brand ?? "card",
        last4: pm.card?.last4 ?? "????",
        expiry: pm.card ? `${String(pm.card.exp_month).padStart(2, "0")}/${String(pm.card.exp_year).slice(-2)}` : null,
        type: "card",
      } : null,
    };
  } catch (err) {
    console.error("Stripe getBilling error:", err.message);
    return DEMO_BILLING;
  }
};

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
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error("Unknown plan");

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("Tenant not found");

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
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const tenant = await prisma.tenant.findFirst({ where: { stripeCustomerId: sub.customer } });
      if (tenant) {
        const planId = PLANS.find(
          (p) => p.stripePriceIdMonthly === sub.items?.data?.[0]?.price?.id || p.stripePriceIdYearly === sub.items?.data?.[0]?.price?.id
        )?.id ?? null;
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { stripePlanId: planId, stripeSubId: event.type === "customer.subscription.deleted" ? null : sub.id },
        });
      }
      break;
    }
    default:
      break;
  }

  return { received: true };
};
