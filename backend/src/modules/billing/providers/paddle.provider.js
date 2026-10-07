/**
 * Paddle adapter (Paddle Billing, not Paddle Classic) behind the common
 * payment-provider interface.
 *
 * Paddle acts as merchant of record, so it handles sales tax/VAT and renews
 * subscriptions itself, keeps payment methods on file and hosts a customer
 * portal — the same capability set the Stripe adapter declared.
 *
 * Env:
 *   PADDLE_API_KEY         server-side API key (pdl_sdbx_… or pdl_live_…)
 *   PADDLE_WEBHOOK_SECRET  secret of the notification destination
 *   PADDLE_ENV             optional: "sandbox" | "production"
 *                          (inferred from the key prefix when unset)
 *
 * Differences from Stripe that callers should know about:
 *   - Checkout is a Paddle *transaction*. Its `checkout.url` points at your
 *     "default payment link" (Paddle dashboard → Checkout → Checkout settings),
 *     which must be a page of yours that loads Paddle.js. successUrl/cancelUrl
 *     are set there via Paddle.Checkout.open({ settings: { successUrl } }),
 *     not on the server, so they are returned here for the page to use.
 *   - `customerId` is a Paddle customer id (ctm_…), `sessionId` a transaction
 *     id (txn_…). Webhook payloads have a different shape from Stripe's.
 *   - verifyWebhook is async — callers must await it.
 */
import { Paddle, Environment } from "@paddle/paddle-node-sdk";
import { log } from "../../../lib/logger.js";

const KEY = () => process.env.PADDLE_API_KEY?.trim() || null;

function environment(key) {
  const explicit = process.env.PADDLE_ENV?.trim().toLowerCase();
  if (explicit === "production") return Environment.production;
  if (explicit === "sandbox") return Environment.sandbox;
  return key.startsWith("pdl_live_") ? Environment.production : Environment.sandbox;
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
 * Accepts the line items the callers already build for Stripe
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

/** Paddle transactions take a customer id, not an email — find or create one. */
async function customerIdForEmail(paddle, email) {
  if (!email) return undefined;
  const page = await paddle.customers.list({ email: [email] }).next();
  if (page?.length) return page[0].id;
  const created = await paddle.customers.create({ email });
  return created.id;
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
  },
  configured: () => !!KEY(),
  methods: ["Card", "PayPal", "Apple Pay", "Google Pay"],
  notes:
    "Paddle is merchant of record and pays out to approved sellers; check that your " +
    "business country is on Paddle's supported-sellers list before going live.",

  async createCheckout({ tenantId, plan, amountUsd, lineItems, successUrl, cancelUrl, customerEmail }) {
    const paddle = client();
    if (!paddle) return { activateNow: true, reason: "paddle_not_configured" };

    const customerId = await customerIdForEmail(paddle, customerEmail);
    const txn = await paddle.transactions.create({
      items: toPaddleItems(lineItems),
      customerId,
      // Copied onto the subscription Paddle creates from this transaction.
      customData: { tenantId, plan, amountUsd: String(amountUsd) },
    });

    if (!txn.checkout?.url) {
      throw Object.assign(
        new Error("Paddle returned no checkout URL — set a default payment link in Checkout settings"),
        { status: 500 },
      );
    }
    // Paddle appends ?_ptxn=<id> to the payment-link page; that page opens
    // Paddle.js and should use successUrl/cancelUrl.
    return { activateNow: false, url: txn.checkout.url, sessionId: txn.id, successUrl, cancelUrl };
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
          let url = null;
          if (t.invoiceNumber) {
            try {
              // Signed link, valid for about an hour.
              url = (await paddle.transactions.getInvoicePDF(t.id)).url;
            } catch {
              url = null;
            }
          }
          const total = Number(t.details?.totals?.grandTotal ?? t.details?.totals?.total ?? 0);
          const paid = t.payments?.find((p) => p.status === "captured");
          return {
            id: t.id,
            reference: t.invoiceNumber ?? null,
            amountUsd: Math.round(total / 100),
            currency: (t.currencyCode ?? "USD").toUpperCase(),
            status: STATUS[t.status] ?? t.status,
            issuedAt: t.billedAt ? new Date(t.billedAt) : t.createdAt ? new Date(t.createdAt) : null,
            paidAt: paid?.capturedAt ? new Date(paid.capturedAt) : null,
            url,
          };
        }),
      );
    } catch (e) {
      log.warn("paddle_invoices_failed", { error: e.message });
      return [];
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

  /**
   * Paddle's portal has no return URL; it links back via the business website
   * set in the dashboard. Pass subscriptionIds to get deep links per subscription.
   */
  async createPortalSession(_tenantId, { customerId, subscriptionIds = [] } = {}) {
    const paddle = client();
    if (!paddle || !customerId) return { supported: true, url: null };
    const session = await paddle.customerPortalSessions.create(customerId, subscriptionIds);
    return { supported: true, url: session.urls?.general?.overview ?? null };
  },

  /** Verify and parse a webhook. Rejects if the signature doesn't check out. */
  async verifyWebhook(payload, headers) {
    const paddle = client();
    const secret = process.env.PADDLE_WEBHOOK_SECRET?.trim();
    if (!paddle || !secret) throw Object.assign(new Error("Paddle webhooks are not configured"), { status: 400 });
    const sig = headers["paddle-signature"] ?? headers["Paddle-Signature"];
    if (!sig) throw Object.assign(new Error("Missing Paddle-Signature header"), { status: 400 });
    // payload must be the raw request body as a string, as with Stripe.
    const raw = Buffer.isBuffer(payload) ? payload.toString("utf8") : payload;
    try {
      return await paddle.webhooks.unmarshal(raw, secret, sig);
    } catch (e) {
      throw Object.assign(new Error(`Invalid Paddle webhook: ${e.message}`), { status: 400 });
    }
  },
};
