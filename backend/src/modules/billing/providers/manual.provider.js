/**
 * Manual (offline) billing — bank transfer, mobile money, cash, cheque.
 *
 * This is not a fallback. In a market where card penetration is low and mobile
 * money is most of the digital economy — and where no card processor will
 * onboard the merchant anyway — an invoice with a reference number the customer
 * quotes when they pay IS the billing system. Liberia is exactly that market:
 * Orange Money and Lonestar/MTN Mobile Money carry the majority of digital
 * transactions, and Stripe does not accept Liberian merchants at all.
 *
 * The flow:
 *   1. The tenant picks a plan → an invoice is issued with a unique reference
 *      and payment instructions taken from configuration.
 *   2. They pay by whatever means the instructions describe.
 *   3. An operator confirms receipt, quoting the reference; the plan activates.
 *
 * With NOTHING configured this degrades to free early-access mode — choosing a
 * plan activates it immediately — which is the behaviour a deployment with no
 * payment keys has always had.
 */
import crypto from "crypto";
import prisma from "../../../config/database.js";
import { runUnscoped } from "../../../lib/tenantContext.js";
import { log } from "../../../lib/logger.js";

const env = (k) => process.env[k]?.trim() || null;

/** Payment instructions, assembled from configuration. */
export function instructions() {
  const methods = [];
  if (env("PAY_BANK_NAME")) {
    methods.push({
      id: "bank",
      label: "Bank transfer",
      fields: [
        ["Bank", env("PAY_BANK_NAME")],
        ["Account name", env("PAY_BANK_ACCOUNT_NAME")],
        ["Account number", env("PAY_BANK_ACCOUNT_NUMBER")],
        ["SWIFT / routing", env("PAY_BANK_SWIFT")],
      ].filter(([, v]) => v),
    });
  }
  if (env("PAY_MOBILE_MONEY_NUMBER")) {
    methods.push({
      id: "mobile_money",
      label: env("PAY_MOBILE_MONEY_LABEL") || "Mobile money",
      fields: [
        ["Number", env("PAY_MOBILE_MONEY_NUMBER")],
        ["Registered name", env("PAY_MOBILE_MONEY_NAME")],
      ].filter(([, v]) => v),
    });
  }
  return methods;
}

const configured = () => instructions().length > 0;

/** A short, unambiguous reference. No 0/O/1/I — people read these aloud. */
function newReference() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[bytes[i] % alphabet.length];
  return `EX-${out.slice(0, 4)}-${out.slice(4)}`;
}

const DUE_DAYS = Number(process.env.PAY_INVOICE_DUE_DAYS) || 14;

export default {
  id: "manual",
  label: "Bank transfer / mobile money",
  capabilities: {
    hostedCheckout: false,
    savedCards: false,
    customerPortal: false,
    // We are the system of record here, so invoice history comes from our own
    // table rather than a provider API.
    invoiceHistory: true,
    webhooks: false,
    // Nobody's phone auto-debits: renewal is a new invoice, not a silent charge.
    recurring: false,
  },
  configured,
  get methods() { return instructions().map((m) => m.label); },
  notes:
    "Payments are confirmed by an operator after the money arrives. Nothing is " +
    "charged automatically, so each renewal is invoiced again.",

  /**
   * Issue an invoice instead of redirecting anywhere.
   *
   * Returns `{ activateNow: true }` when nothing is configured, which is how a
   * deployment with no payment details keeps working as free early access.
   */
  async createCheckout({ tenantId, plan, planSolutions = [], amountUsd, localAmount, currency }) {
    if (!configured()) return { activateNow: true, reason: "no_payment_details_configured" };

    const invoice = await runUnscoped(async () =>
      prisma.platformInvoice.create({
        data: {
          tenantId, plan, planSolutions,
          amountUsd, localAmount: localAmount ?? null, currency: currency ?? "USD",
          reference: newReference(),
          dueAt: new Date(Date.now() + DUE_DAYS * 86_400_000),
        },
      }),
    );
    log.info("platform_invoice_issued", { tenantId, reference: invoice.reference, amountUsd });

    return {
      activateNow: false,
      // No URL — the UI renders the instructions inline rather than sending the
      // buyer to a page that doesn't exist.
      url: null,
      invoice: shape(invoice),
      instructions: instructions(),
    };
  },

  /** Invoices we issued, newest first. */
  async listInvoices(tenantId) {
    const rows = await runUnscoped(async () =>
      prisma.platformInvoice.findMany({ where: { tenantId }, orderBy: { issuedAt: "desc" }, take: 50 }),
    );
    return rows.map(shape);
  },

  async listPaymentMethods() {
    return { supported: false, methods: [] };
  },
  async createPortalSession() {
    return { supported: false };
  },
};

export const shape = (i) => ({
  id: i.id,
  reference: i.reference,
  plan: i.plan,
  amountUsd: i.amountUsd,
  localAmount: i.localAmount,
  currency: i.currency,
  status: i.status,
  method: i.method,
  issuedAt: i.issuedAt,
  dueAt: i.dueAt,
  paidAt: i.paidAt,
  // Overdue is derived rather than stored: a stored flag would need a job to
  // stay true, and would be wrong between runs.
  overdue: i.status === "pending" && !!i.dueAt && i.dueAt < new Date(),
});
