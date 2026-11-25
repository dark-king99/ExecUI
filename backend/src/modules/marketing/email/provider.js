/**
 * Marketing email delivery provider.
 *
 * Deliberately separate from lib/email.js (the app's own transactional mail —
 * password resets, invitations): marketing has its own key, its own sending
 * domains per organization, bounce/complaint webhooks and unsubscribe headers,
 * and a reputation problem in marketing must never take down login emails.
 *
 * Provider: Resend (https://resend.com/docs/api-reference). Chosen for its
 * domain API (DNS records + verification), idempotent sends, and signed
 * webhooks for delivered/bounced/complained/opened/clicked. The interface below
 * is what an Amazon SES adapter would implement for high-volume senders.
 *
 *   MARKETING_EMAIL_PROVIDER=resend
 *   MARKETING_RESEND_API_KEY=re_...
 *   MARKETING_RESEND_WEBHOOK_SECRET=whsec_...
 */
const env = (k) => process.env[k]?.trim() || null;
const API = "https://api.resend.com";

export class ProviderError extends Error {
  constructor(message, { status = 0, transient = false } = {}) {
    super(message);
    this.status = status;
    this.transient = transient; // retry later (rate limit, 5xx, network)
  }
}

async function call(path, { method = "GET", body, idempotencyKey } = {}) {
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${env("MARKETING_RESEND_API_KEY")}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    throw new ProviderError(`Email provider unreachable: ${e.message}`, { transient: true });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ProviderError(`Email provider ${res.status}: ${String(data?.message ?? data?.name ?? res.statusText).slice(0, 300)}`, {
      status: res.status,
      transient: res.status === 429 || res.status >= 500,
    });
  }
  return data;
}

export const resend = {
  id: "resend",
  label: "Resend",
  configured: () => !!env("MARKETING_RESEND_API_KEY"),

  /** Register a domain → { providerDomainId, status, records } */
  async createDomain(name) {
    const d = await call("/domains", { method: "POST", body: { name } });
    return { providerDomainId: d.id, status: d.status, records: d.records ?? [] };
  },
  async getDomain(id) {
    const d = await call(`/domains/${encodeURIComponent(id)}`);
    return { status: d.status, records: d.records ?? [] };
  },
  async verifyDomain(id) {
    await call(`/domains/${encodeURIComponent(id)}/verify`, { method: "POST" });
  },
  async deleteDomain(id) {
    await call(`/domains/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  },

  /**
   * Send one message. `idempotencyKey` is the delivery id, so a retry after a
   * crash can't send the same email twice.
   */
  async send({ from, to, subject, html, text, replyTo, headers, tags, idempotencyKey }) {
    const d = await call("/emails", {
      method: "POST",
      idempotencyKey,
      body: { from, to: [to], subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}), headers, tags },
    });
    return { providerMessageId: d.id };
  },
};

const PROVIDERS = { resend };
export const emailProvider = () => PROVIDERS[env("MARKETING_EMAIL_PROVIDER") ?? "resend"] ?? resend;
