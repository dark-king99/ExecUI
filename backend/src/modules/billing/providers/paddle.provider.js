/**
 * Paddle adapter (Paddle Billing, not Paddle Classic) behind the common
 * payment-provider interface.
 *
 * Paddle acts as merchant of record, so it handles sales tax/VAT and renews
 * subscriptions itself, keeps payment methods on file and hosts a customer
 * portal — provider capabilities are surfaced to the billing UI.
 *
 * Env:
 *   PADDLE_API_KEY         server-side API key (pdl_sdbx_… or pdl_live_…)
 *   PADDLE_WEBHOOK_SECRET  secret of the notification destination
 *   PADDLE_ENV             required: "sandbox" or "production"
 *
 * Differences from other hosted-checkout providers that callers should know about:
 *   - Checkout is a Paddle *transaction*. Its `checkout.url` points at your
 *     "default payment link" (Paddle dashboard → Checkout → Checkout settings),
 *     which must be a page of yours that loads Paddle.js. successUrl/cancelUrl
 *     are set there via Paddle.Checkout.open({ settings: { successUrl } }),
 *     not on the server, so they are returned here for the page to use.
 *   - `customerId` is a Paddle customer id (ctm_…), `sessionId` a transaction
 *     id (txn_…). Webhook payloads use provider-specific fields.
 *   - verifyWebhook is async — callers must await it.
 */
import { Paddle, Environment } from "@paddle/paddle-node-sdk";
import { log } from "../../../lib/logger.js";

const KEY = () => process.env.PADDLE_API_KEY?.trim() || null;

function environment(key) {
  const explicit = process.env.PADDLE_ENV?.trim().toLowerCase();
  if (explicit === "sandbox" && key.startsWith("pdl_sdbx_")) return Environment.sandbox;
  if (explicit === "production" && key.startsWith("pdl_live_")) return Environment.production;
  if (explicit !== "sandbox" && explicit !== "production") {
    throw Object.assign(new Error("PADDLE_ENV must explicitly be sandbox or production; Paddle will not infer an environment."), { status: 503 });
  }
  throw Object.assign(new Error(`PADDLE_ENV is ${explicit} but PADDLE_API_KEY does not match that Paddle environment.`), { status: 503 });
}

let cached = null;
let cachedKey = null;
/** Lazily constructed so tests and unconfigured deployments never need a key. */
export function client() {
  const key = KEY();
  if (!key) return null;
  if (!cached || cachedKey !== key) {
    cached = new Paddle(key, { environment: environment(key) });
    cachedKey = key;
  }
  return cached;
}

/**
 * Accepts the line items produced by the billing service
 * ({ price, quantity } or { price_data, quantity }) as well as native Paddle
 * items ({ priceId, quantity }).
 */
function toPaddleItems(lineItems = []) {
  return lineItems.map((li) => {
    const quantity = li.quantity ?? 1;
    if (li.priceId) return { priceId: li.priceId, quantity };
    if (typeof li.price === "string") return { priceId: li.price, quantity };

    const pd = li.price_data;
    if (!pd) throw new Error("Line item needs a price id or price_data");
    const name = pd.product_data?.name ?? "Subscription";
    return {
      quantity,
      // Non-catalog price: created on the fly for this transaction only.
      price: {
        description: name,
        name,
        unitPrice: {
          amount: String(pd.unit_amount),
          currencyCode: (pd.currency ?? "usd").toUpperCase(),
        },
        billingCycle: pd.recurring
          ? { interval: pd.recurring.interval, frequency: pd.recurring.interval_count ?? 1 }
          : null,
        ...(typeof pd.product === "string"
          ? { productId: pd.product }
          : { product: { name, taxCategory: "standard" } }),
      },
    };
  });
}

const STATUS = {
  completed: "paid",
  paid: "paid",
  billed: "open",
  past_due: "past_due",
  canceled: "void",
  draft: "draft",
  ready: "draft",
};

export default {
  id: "paddle",
  label: "Paddle",
  capabilities: {
    hostedCheckout: true,
    savedCards: true,
    customerPortal: true,
    invoiceHistory: true,
    webhooks: true,
    recurring: true,
    subscriptionUpdates: true,
  },
  configured: () => {
    const key = KEY();
    const env = process.env.PADDLE_ENV?.trim().toLowerCase();
    return !!key && ((env === "sandbox" && key.startsWith("pdl_sdbx_")) || (env === "production" && key.startsWith("pdl_live_")));
  },
  methods: ["Card", "PayPal", "Apple Pay", "Google Pay"],
  notes:
    "Paddle is merchant of record and pays out to approved sellers; check that your " +
    "business country is on Paddle's supported-sellers list before going live.",

  async createCheckout({
    tenantId, plan, planSolutions = [], lineItems, successUrl, cancelUrl,
    checkoutPageUrl, customerId, billingInterval = "month", networkProfile, metadata,
  }) {
    const paddle = client();
    if (!paddle) throw Object.assign(new Error("Paddle is selected but PADDLE_API_KEY is not configured."), { status: 503 });

    let resolvedCustomerId = customerId;
    let txn;
    try {
      txn = await paddle.transactions.create({
        items: toPaddleItems(lineItems),
        ...(resolvedCustomerId ? { customerId: resolvedCustomerId } : {}),
        // Copied onto the subscription Paddle creates from this transaction.
        customData: metadata ?? { tenantId, plan, planSolutions, billingInterval, networkProfile },
      });
    } catch (error) {
      throw normalizePaddleError(error);
    }

    if (!txn.id || !checkoutPageUrl) {
      throw Object.assign(
        new Error("Paddle checkout needs a transaction id and a public checkout page URL"),
        { status: 500 },
      );
    }
    const checkoutUrl = new URL(checkoutPageUrl);
    checkoutUrl.searchParams.set("_ptxn", txn.id);
    return {
      activateNow: false,
      // Always route through the first-party page so it can initialize Paddle.js.
      url: checkoutUrl.toString(),
      sessionId: txn.id,
      successUrl,
      cancelUrl,
      customerId: resolvedCustomerId ?? null,
    };
  },

  async listInvoices(_tenantId, { customerId } = {}) {
    const paddle = client();
    if (!paddle || !customerId) return [];
    try {
      const txns = await paddle.transactions
        .list({
          customerId: [customerId],
          status: ["billed", "paid", "completed", "past_due", "canceled"],
          orderBy: "billed_at[DESC]",
          perPage: 24,
        })
        .next();

      return Promise.all(
        txns.map(async (t) => {
          const total = Number(t.details?.totals?.grandTotal ?? t.details?.totals?.total ?? 0);
          const paid = t.payments?.find((p) => p.status === "captured");
          return {
            id: t.id,
            reference: t.invoiceNumber ?? null,
            amountUsd: total / 100,
            currency: (t.currencyCode ?? "USD").toUpperCase(),
            status: STATUS[t.status] ?? t.status,
            issuedAt: t.billedAt ? new Date(t.billedAt) : t.createdAt ? new Date(t.createdAt) : null,
            paidAt: paid?.capturedAt ? new Date(paid.capturedAt) : null,
            plan: t.customData?.plan ?? null,
            downloadable: !!t.invoiceNumber,
          };
        }),
      );
    } catch (e) {
      log.warn("paddle_invoices_failed", { error: e.message });
      throw e;
    }
  },

  async listPaymentMethods(_tenantId, { customerId } = {}) {
    const paddle = client();
    if (!paddle || !customerId) return { supported: true, methods: [] };
    try {
      const data = await paddle.paymentMethods.list(customerId).next();
      return {
        supported: true,
        methods: data
          .filter((m) => m.type === "card" && m.card)
          .slice(0, 10)
          .map((m) => ({
            id: m.id,
            brand: m.card.type,
            last4: m.card.last4,
            expMonth: m.card.expiryMonth,
            expYear: m.card.expiryYear,
          })),
      };
    } catch (e) {
      log.warn("paddle_payment_methods_failed", { error: e.message });
      return { supported: true, methods: [] };
    }
  },

  async getInvoicePdf(_tenantId, transactionId, { customerId } = {}) {
    const paddle = client();
    if (!paddle || !customerId) return null;
    const transaction = await paddle.transactions.get(transactionId);
    if (transaction.customerId !== customerId || !transaction.invoiceNumber) return null;
    return (await paddle.transactions.getInvoicePDF(transactionId)).url ?? null;
  },

  async getSubscription(_tenantId, { subscriptionId } = {}) {
    const paddle = client();
    if (!paddle || !subscriptionId) return null;
    try {
      const sub = await paddle.subscriptions.get(subscriptionId);
      return shapeSubscription(sub);
    } catch (error) {
      throw normalizePaddleError(error);
    }
  },

  async findActiveSubscription(_tenantId, { customerId } = {}) {
    const paddle = client();
    if (!paddle || !customerId) return null;
    try {
      const subscriptions = await paddle.subscriptions
        .list({
          customerId: [customerId],
          status: ["active", "trialing", "past_due", "paused"],
          orderBy: "created_at[DESC]",
          perPage: 1,
        })
        .next();
      return subscriptions[0] ? shapeSubscription(subscriptions[0]) : null;
    } catch (error) {
      throw normalizePaddleError(error);
    }
  },

  async updateSubscription({ subscriptionId, lineItems, customData }) {
    const paddle = client();
    if (!paddle) throw Object.assign(new Error("Paddle is not configured"), { status: 503 });
    try {
      const sub = await paddle.subscriptions.update(subscriptionId, {
        items: toPaddleItems(lineItems),
        customData,
        prorationBillingMode: "prorated_immediately",
      });
      return { id: sub.id, status: sub.status, customerId: sub.customerId };
    } catch (error) {
      throw normalizePaddleError(error);
    }
  },

  /**
   * Paddle's portal has no return URL; it links back via the business website
   * set in the dashboard. Pass subscriptionIds to get deep links per subscription.
   */
  async createPortalSession(_tenantId, { customerId, subscriptionIds = [] } = {}) {
    const paddle = client();
    if (!paddle || !customerId || !subscriptionIds.length) return { supported: true, url: null };
    const session = await paddle.customerPortalSessions.create(customerId, subscriptionIds);
    const subscriptionUrls = session.urls.subscriptions.map((subscription) => ({
      id: subscription.id,
      updatePaymentMethodUrl: subscription.updateSubscriptionPaymentMethod,
      cancelUrl: subscription.cancelSubscription,
    }));
    const directLink = subscriptionUrls.find((subscription) => subscription.id === subscriptionIds[0]);
    return {
      supported: true,
      url: directLink?.updatePaymentMethodUrl ?? session.urls.general?.overview ?? null,
      subscriptionUrls,
    };
  },

  /** Verify and parse a webhook. Rejects if the signature doesn't check out. */
  async verifyWebhook(payload, headers) {
    const paddle = client();
    const secret = process.env.PADDLE_WEBHOOK_SECRET?.trim();
    if (!paddle || !secret) throw Object.assign(new Error("Paddle webhooks are not configured"), { status: 400 });
    const sig = headers["paddle-signature"] ?? headers["Paddle-Signature"];
    if (!sig) throw Object.assign(new Error("Missing Paddle-Signature header"), { status: 400 });
    // payload must be the raw request body as a string.
    const raw = Buffer.isBuffer(payload) ? payload.toString("utf8") : payload;
    try {
      return await paddle.webhooks.unmarshal(raw, secret, sig);
    } catch (e) {
      throw Object.assign(new Error(`Invalid Paddle webhook: ${e.message}`), { status: 400 });
    }
  },
};

function normalizePaddleError(error) {
  const status = error.status ?? error.statusCode;
  const message = String(error.message ?? "");
  if (status === 401 || status === 403 || /authorization|authentication|unauthorized|not authorized/i.test(message)) {
    return Object.assign(
      new Error("Paddle rejected the server API key or it lacks permission for this operation. Verify that PADDLE_API_KEY is a server API key for the account selected by PADDLE_ENV and has permission to create transactions."),
      { status: 502 },
    );
  }
  return error;
}

function shapeSubscription(sub) {
  const periodEnd = sub.currentBillingPeriod?.endsAt;
  const billingCycle = sub.items?.[0]?.price?.billingCycle;
  return {
    id: sub.id,
    status: sub.status,
    cancelAtPeriodEnd: sub.scheduledChange?.action === "cancel",
    currentPeriodEnd: periodEnd ? new Date(periodEnd).toISOString().slice(0, 10) : null,
    billingInterval: billingCycle?.interval === "year" ? "year" : "month",
    customerId: sub.customerId,
  };
}
