/**
 * Payment providers.
 *
 * Billing is provider-neutral because processor availability varies by market.
 * `PAYMENT_PROVIDER` names one, and every adapter answers the same interface.
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
import manualProvider from "./manual.provider.js";
import flutterwaveProvider from "./flutterwave.provider.js";

export const PROVIDERS = {
  paddle: paddleProvider,
  manual: manualProvider,
  flutterwave: flutterwaveProvider,
};

/**
 * Which provider is in force.
 *
 * Explicit configuration wins. Failing that we infer from supported provider
 * keys. No key means free early-access mode (`manual` with
 * nothing configured activates plans immediately, exactly as before).
 */
export function providerId() {
  const explicit = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();
  if (explicit && PROVIDERS[explicit]) return explicit;
  if (explicit) {
    log.warn("payment_provider_unknown", { requested: explicit, using: "manual" });
    return "manual";
  }
  if (process.env.PADDLE_API_KEY?.trim()) return "paddle";
  return "manual";
}

export const provider = () => PROVIDERS[providerId()];

/** Does the active provider support `capability`? */
export const supports = (capability) => !!provider().capabilities?.[capability];

/**
 * Is money actually being collected?
 *
 * False means free early-access mode: choosing a plan activates it immediately.
 * That is a deliberate state, not a misconfiguration — it is how the product
 * ships before a merchant account exists.
 */
export const billingEnabled = () => {
  const active = provider();
  // An explicitly selected Paddle provider must fail with a configuration
  // error, never fall through to free activation when credentials are absent.
  return active.id === "paddle" || !!active.configured?.();
};

/** What the admin UI shows about payment configuration. */
export function providerInfo() {
  const p = provider();
  return {
    id: p.id,
    label: p.label,
    configured: !!p.configured?.(),
    capabilities: { ...p.capabilities },
    // How a customer actually pays, in words the buyer understands.
    methods: p.methods ?? [],
    notes: p.notes ?? null,
  };
}
