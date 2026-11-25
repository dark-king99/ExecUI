/**
 * Payment providers.
 *
 * Paddle is the payment provider. The adapter interface stays so the billing
 * service doesn't need to know Paddle's API, and so "nothing configured" can be
 * a provider of its own (free early access) rather than a special case.
 * Providers differ in what they can actually do, and pretending otherwise
 * produces a UI full of buttons that fail. So an adapter DECLARES its
 * capabilities and the surfaces above it ask before offering:
 *
 *   hostedCheckout   redirect the buyer to a payment page
 *   savedCards       list stored payment methods
 *   customerPortal   a provider-hosted self-service billing page
 *   invoiceHistory   the provider is the system of record for invoices
 *   webhooks         asynchronous payment confirmation
 *   recurring        the provider itself renews the subscription
 *
 * A provider that returns `{ supported: false }` for an operation is not an
 * error — it is a fact about that market, and the caller renders accordingly.
 */
import { log } from "../../../lib/logger.js";
import paddleProvider from "./paddle.provider.js";

/**
 * No payment provider configured: free early access.
 *
 * Choosing a plan activates it immediately. This is how a deployment runs
 * before a merchant account exists, and how local development works without
 * Paddle keys. It is never chosen silently in place of a provider someone
 * asked for — see providerId().
 */
const freeProvider = {
  id: "free",
  label: "Free early access",
  capabilities: {
    hostedCheckout: false, savedCards: false, customerPortal: false,
    invoiceHistory: false, webhooks: false, recurring: false,
  },
  configured: () => false,
  methods: [],
  notes: "No payment provider is configured, so plans activate without payment.",
  async createCheckout() { return { activateNow: true, reason: "no_payment_provider_configured" }; },
  async listInvoices() { return []; },
  async listPaymentMethods() { return { supported: false, methods: [] }; },
  async createPortalSession() { return { supported: false }; },
};

export const PROVIDERS = {
  paddle: paddleProvider,
  free: freeProvider,
};

/**
 * Which provider is in force.
 *
 * Paddle is the only payment provider. With no Paddle key and no explicit
 * choice, plans are free (early access). Any other explicit value — including
 * the retired "manual" and "flutterwave" — resolves to Paddle, so a deployment
 * that meant to collect money fails loudly with a Paddle configuration error
 * instead of quietly giving plans away.
 */
export function providerId() {
  const explicit = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();
  if (explicit === "free") return "free";
  if (explicit && explicit !== "paddle") {
    log.warn("payment_provider_unsupported", { requested: explicit, using: "paddle" });
    return "paddle";
  }
  if (explicit === "paddle" || process.env.PADDLE_API_KEY?.trim()) return "paddle";
  return "free";
}

export const provider = () => PROVIDERS[providerId()];

/** Does the active provider support `capability`? */
export const supports = (capability) => !!provider().capabilities?.[capability];

/**
 * Is money actually being collected? False only in free early access.
 */
export const billingEnabled = () => provider().id === "paddle";

/** What the admin UI shows about payment configuration. */
export function providerInfo() {
  const p = provider();
  return {
    id: p.id,
    label: p.label,
    configured: !!p.configured?.(),
    capabilities: { ...p.capabilities },
    methods: p.methods ?? [],
    notes: p.notes ?? null,
  };
}
