/**
 * Turning a campaign into one recipient's email.
 *
 *   {{first_name}} {{name}} {{email}} {{unsubscribe_url}}
 *
 * Values are HTML-escaped. Every message gets a footer with the unsubscribe
 * link and the organization's postal address (required by CAN-SPAM and
 * similar laws) whether or not the body includes them, and the
 * List-Unsubscribe / List-Unsubscribe-Post headers (RFC 8058 one-click).
 */
import crypto from "crypto";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const secret = () => process.env.MARKETING_UNSUBSCRIBE_SECRET || process.env.JWT_SECRET || "execui-unsubscribe";

export const publicBase = () => (process.env.OAUTH_REDIRECT_BASE || process.env.APP_URL || `http://localhost:${process.env.PORT || 5555}`).replace(/\/$/, "");

/** A signed, unguessable unsubscribe token for one delivery. */
export function unsubscribeToken(deliveryId) {
  const mac = crypto.createHmac("sha256", secret()).update(`unsub:${deliveryId}`).digest("base64url").slice(0, 32);
  return `${deliveryId}.${mac}`;
}

export function verifyUnsubscribeToken(token) {
  const [id, mac] = String(token ?? "").split(".");
  if (!id || !mac) return null;
  const expected = unsubscribeToken(id).split(".")[1];
  const a = Buffer.from(mac), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? id : null;
}

export const unsubscribeUrl = (deliveryId) => `${publicBase()}/api/public/marketing/unsubscribe/${unsubscribeToken(deliveryId)}`;

export const htmlToText = (html) => String(html ?? "")
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
  .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
  .replace(/<br\s*\/?>|<\/(p|div|h\d|li|tr)>/gi, "\n")
  .replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'")
  .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

function fill(template, vars, { html }) {
  return String(template ?? "").replace(/\{\{\s*(first_name|name|email|unsubscribe_url)\s*\}\}/g, (_, k) => (html && k !== "unsubscribe_url" ? esc(vars[k]) : vars[k]));
}

/**
 * Render one message. `contact` is { name, email }; `deliveryId` drives the
 * unsubscribe link (a test send passes null and gets a non-working preview link).
 */
export function renderEmail(campaign, settings, contact, deliveryId) {
  const unsub = deliveryId ? unsubscribeUrl(deliveryId) : `${publicBase()}/api/public/marketing/unsubscribe/test`;
  const vars = { first_name: String(contact.name ?? "").trim().split(/\s+/)[0] || "there", name: contact.name ?? "", email: contact.email, unsubscribe_url: unsub };
  const from = campaign.fromName ?? settings?.defaultFromName ?? "";
  const address = settings?.postalAddress ?? "";
  const preheader = campaign.previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(fill(campaign.previewText, vars, { html: false }))}</div>`
    : "";
  const footerHtml = `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font:12px/1.5 Arial,sans-serif;color:#6b7280">`
    + `You're receiving this because you subscribed to email from ${esc(from)}. `
    + `<a href="${esc(unsub)}" style="color:#6b7280">Unsubscribe</a>.<br>${esc(address)}</div>`;
  const body = fill(campaign.htmlBody, vars, { html: true });
  const html = /<\/body>/i.test(body) ? body.replace(/<\/body>/i, `${footerHtml}</body>`) : `${preheader}${body}${footerHtml}`;
  const textBody = campaign.textBody ? fill(campaign.textBody, vars, { html: false }) : htmlToText(fill(campaign.htmlBody, vars, { html: false }));
  const text = `${textBody}\n\n--\nYou're receiving this because you subscribed to email from ${from}.\nUnsubscribe: ${unsub}\n${address}`;
  return {
    subject: fill(campaign.subject, vars, { html: false }).replace(/[\r\n]+/g, " ").slice(0, 300),
    html,
    text,
    headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}
