/**
 * Stripe adapter — the behaviour this product already had, behind the common
 * interface.
 *
 * Nothing here changes for an existing deployment: with STRIPE_SECRET_KEY set
 * and PAYMENT_PROVIDER unset, `providerId()` resolves to "stripe" and the flow
 * is the one that was there before.
 *
 * Stripe is the richest of the adapters — it is the only one that can renew a
 * subscription by itself, keep cards on file and host a billing portal — which
 * is precisely why those are declared as capabilities rather than assumed by
 * the callers.
 */
import Stripe from "stripe";
import { log } from "../../../lib/logger.js";

const KEY = () => process.env.STRIPE_SECRET_KEY?.trim() || null;

let cached = null;
let cachedKey = null;
/** Lazily constructed so tests and unconfigured deployments never need a key. */
export function client() {
  const key = KEY();
  if (!key) return null;
  if (!cached || cachedKey !== key) {
    cached = new Stripe(key, { apiVersion: "2024-04-10" });
    cachedKey = key;
  }
  return cached;
}

export default {
  id: "stripe",
  label: "Stripe",
  capabilities: {
    hostedCheckout: true,
    savedCards: true,
    customerPortal: true,
    invoiceHistory: true,
    webhooks: true,
    recurring: true,
  },
  configured: () => !!KEY(),
  methods: ["Card", "Apple Pay", "Google Pay"],
  notes:
    "Stripe does not onboard merchants in every country — Liberia among them. " +
    "Where it can't, set PAYMENT_PROVIDER to another adapter.",

  async createCheckout({ tenantId, plan, amountUsd, lineItems, successUrl, cancelUrl, customerEmail }) {
    const stripe = client();
    if (!stripe) return { activateNow: true, reason: "stripe_not_configured" };
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail ?? undefined,
      client_reference_id: tenantId,
      metadata: { tenantId, plan, amountUsd: String(amountUsd) },
      subscription_data: { metadata: { tenantId, plan } },
    });
    return { activateNow: false, url: session.url, sessionId: session.id };
  },

  async listInvoices(_tenantId, { customerId } = {}) {
    const stripe = client();
    if (!stripe || !customerId) return [];
    try {
      const { data } = await stripe.invoices.list({ customer: customerId, limit: 24 });
      return data.map((i) => ({
        id: i.id,
        reference: i.number,
        amountUsd: Math.round((i.amount_paid ?? i.amount_due ?? 0) / 100),
        currency: (i.currency ?? "usd").toUpperCase(),
        status: i.status === "paid" ? "paid" : i.status,
        issuedAt: i.created ? new Date(i.created * 1000) : null,
        paidAt: i.status_transitions?.paid_at ? new Date(i.status_transitions.paid_at * 1000) : null,
        url: i.hosted_invoice_url ?? null,
      }));
    } catch (e) {
      log.warn("stripe_invoices_failed", { error: e.message });
      return [];
    }
  },

  async listPaymentMethods(_tenantId, { customerId } = {}) {
    const stripe = client();
    if (!stripe || !customerId) return { supported: true, methods: [] };
    try {
      const { data } = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 10 });
      return {
        supported: true,
        methods: data.map((m) => ({
          id: m.id, brand: m.card?.brand, last4: m.card?.last4,
          expMonth: m.card?.exp_month, expYear: m.card?.exp_year,
        })),
      };
    } catch (e) {
      log.warn("stripe_payment_methods_failed", { error: e.message });
      return { supported: true, methods: [] };
    }
  },

  async createPortalSession(_tenantId, { customerId, returnUrl } = {}) {
    const stripe = client();
    if (!stripe || !customerId) return { supported: true, url: null };
    const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
    return { supported: true, url: session.url };
  },

  /** Verify and parse a webhook. Throws if the signature doesn't check out. */
  verifyWebhook(payload, headers) {
    const stripe = client();
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!stripe || !secret) throw Object.assign(new Error("Stripe webhooks are not configured"), { status: 400 });
    const sig = headers["stripe-signature"] ?? headers["Stripe-Signature"];
    return stripe.webhooks.constructEvent(payload, sig, secret);
  },
};
