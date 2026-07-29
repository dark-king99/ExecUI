/**
 * Outbound email via Resend (https://resend.com), with a graceful fallback.
 *
 * If RESEND_API_KEY is set, mail is sent through the Resend REST API and the
 * result is recorded in EmailLog. If it's NOT set, the send is recorded as
 * "skipped" (email not configured) instead of throwing — so every email
 * operation in the app degrades cleanly in environments without a key.
 *
 * Configure in .env:
 *   RESEND_API_KEY=re_xxx
 *   RESEND_FROM="ExecUI <noreply@yourdomain.com>"   # must be a verified sender
 */
import prisma from "../config/database.js";

const API_KEY = process.env.RESEND_API_KEY || "";
const FROM = process.env.RESEND_FROM || "ExecUI <onboarding@resend.dev>";

export function emailConfigured() {
  return !!API_KEY;
}

/**
 * Send an email. `attachments` is an optional array of
 * { filename, content: Buffer|base64 string, contentType } — used by scheduled
 * report delivery to attach the rendered CSV/XLSX/PDF.
 */
export async function sendEmail({ tenantId, to, subject, html, text, from, context, userId, attachments }) {
  const fromEmail = from || FROM;
  const toList = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  const base = {
    tenantId, toEmail: toList.join(", "), fromEmail, subject: subject || "(no subject)",
    context: context || null, createdById: userId || null,
  };

  if (!toList.length) {
    return { sent: false, error: "No recipient" };
  }

  // Not configured → record + return gracefully (never throw).
  if (!API_KEY) {
    const log = await prisma.emailLog.create({ data: { ...base, status: "skipped", error: "RESEND_API_KEY not set" } });
    return { sent: false, skipped: true, id: log.id, message: "Email is not configured on this server (set RESEND_API_KEY)." };
  }

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail, to: toList, subject: base.subject,
        html: html || undefined, text: text || (html ? undefined : base.subject),
        attachments: Array.isArray(attachments) && attachments.length
          ? attachments.map((a) => ({
              filename: a.filename,
              content: Buffer.isBuffer(a.content) ? a.content.toString("base64") : a.content,
              content_type: a.contentType || undefined,
            }))
          : undefined,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const error = data?.message || data?.name || `HTTP ${resp.status}`;
      const log = await prisma.emailLog.create({ data: { ...base, status: "failed", error } });
      return { sent: false, error, id: log.id };
    }
    const log = await prisma.emailLog.create({ data: { ...base, status: "sent", providerId: data?.id || null } });
    return { sent: true, id: log.id, providerId: data?.id || null };
  } catch (e) {
    const log = await prisma.emailLog.create({ data: { ...base, status: "failed", error: e.message } });
    return { sent: false, error: e.message, id: log.id };
  }
}

export async function listEmailLogs(tenantId, limit = 50) {
  const rows = await prisma.emailLog.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: Number(limit) });
  return rows.map((l) => ({
    id: l.id, to: l.toEmail, subject: l.subject, status: l.status,
    context: l.context, error: l.error, providerId: l.providerId,
    time: l.createdAt,
  }));
}
