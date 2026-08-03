/**
 * Flutterwave adapter — cards, bank transfer, USSD and mobile money across
 * Africa (M-Pesa, MTN MoMo, Airtel Money, Orange Money).
 *
 * Why this one: in the markets the regional price book is aimed at, mobile
 * money is most of the digital economy, and a card-only processor reaches
 * almost nobody. Flutterwave's v3 API covers those rails behind one hosted
 * checkout.
 *
 * ⚠️ NOT VERIFIED AGAINST A LIVE ACCOUNT. This is written to Flutterwave's
 * documented v3 API, but nobody has run it against a real merchant account, and
 * — critically — whether Flutterwave will onboard a merchant registered in
 * Liberia specifically is a KYC question that only they can answer. Confirm
 * both before taking money with it. `manual` needs no onboarding at all and is
 * the safe default until then.
 */
import crypto from "crypto";
import { log } from "../../../lib/logger.js";

const BASE = process.env.FLW_BASE_URL?.replace(/\/$/, "") || "https://api.flutterwave.com/v3";
const SECRET = () => process.env.FLW_SECRET_KEY?.trim() || null;
/** Shared secret echoed by Flutterwave in the `verif-hash` webhook header. */
const HASH = () => process.env.FLW_SECRET_HASH?.trim() || null;

async function call(path, { method = "GET", body } = {}) {
  const key = SECRET();
  if (!key) throw Object.assign(new Error("Flutterwave is not configured"), { status: 500 });
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status === "error") {
    throw Object.assign(new Error(json.message || `Flutterwave HTTP ${res.status}`), { status: 502 });
  }
  return json;
}

export default {
  id: "flutterwave",
  label: "Flutterwave",
  capabilities: {
    hostedCheckout: true,
    // Tokenised cards exist in the API, but mobile money — the point of using
    // this provider — has no equivalent, so the UI shouldn't promise a wallet.
    savedCards: false,
    customerPortal: false,
    invoiceHistory: false,
    webhooks: true,
    // Their recurring support is card-only. Mobile money customers re-authorise
    // each cycle, so the platform must not assume a silent renewal.
    recurring: false,
  },
  configured: () => !!SECRET(),
  methods: ["Card", "Bank transfer", "USSD", "Mobile money"],
  notes:
    "Mobile money does not auto-renew — each cycle needs the customer to " +
    "authorise again. Not yet verified against a live merchant account.",

  /**
   * Hosted checkout. Charges in USD to match what the price book quotes;
   * Flutterwave presents the local equivalent to the payer at their own rate.
   */
  async createCheckout({ tenantId, plan, amountUsd, successUrl, customerEmail, customerName, reference }) {
    if (!SECRET()) return { activateNow: true, reason: "flutterwave_not_configured" };
    const txRef = reference || `ex-${tenantId.slice(0, 8)}-${Date.now()}`;
    const payload = {
      tx_ref: txRef,
      amount: amountUsd,
      currency: "USD",
      redirect_url: successUrl,
      payment_options: "card,mobilemoney,ussd,banktransfer",
      customer: { email: customerEmail, name: customerName || undefined },
      meta: { tenantId, plan },
      customizations: { title: "ExecUI", description: `${plan} plan` },
    };
    const json = await call("/payments", { method: "POST", body: payload });
    log.info("flutterwave_checkout_created", { tenantId, txRef });
    return { activateNow: false, url: json?.data?.link ?? null, sessionId: txRef };
  },

  /**
   * Verify a webhook.
   *
   * Flutterwave signs with a shared secret echoed in `verif-hash` rather than an
   * HMAC over the body, so this is a constant-time comparison of that value —
   * NOT a signature over the payload. It proves the sender knows the secret, not
   * that the body is untampered, which is why `confirm()` below re-fetches the
   * transaction from the API before anything is trusted.
   */
  verifyWebhook(payload, headers) {
    const expected = HASH();
    if (!expected) throw Object.assign(new Error("FLW_SECRET_HASH is not set"), { status: 400 });
    const got = headers["verif-hash"] ?? headers["Verif-Hash"] ?? "";
    const a = Buffer.from(String(got));
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw Object.assign(new Error("Bad webhook signature"), { status: 401 });
    }
    return typeof payload === "string" ? JSON.parse(payload) : payload;
  },

  /** Re-fetch a transaction from Flutterwave and report what it really says. */
  async confirm(transactionId) {
    const json = await call(`/transactions/${transactionId}/verify`);
    const d = json?.data ?? {};
    return {
      paid: d.status === "successful",
      amountUsd: Number(d.amount) || 0,
      currency: d.currency,
      reference: d.tx_ref,
      tenantId: d.meta?.tenantId ?? null,
      plan: d.meta?.plan ?? null,
    };
  },

  async listInvoices() { return []; },
  async listPaymentMethods() { return { supported: false, methods: [] }; },
  async createPortalSession() { return { supported: false }; },
};
