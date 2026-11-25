/**
 * Help-desk replies from the organization's own support mailbox.
 *
 * When a support inbox is connected with permission to send, an agent's public
 * reply goes out from that address and joins the customer's original email
 * thread (Gmail: same thread + In-Reply-To; Outlook: a reply to the message),
 * so the customer sees one conversation with support@their-company, not a
 * separate email from ExecUI. With no such mailbox — or if sending fails —
 * the caller falls back to ExecUI's own email sender.
 */
import prisma from "../../config/database.js";
import { log } from "../../lib/logger.js";
import { getProvider } from "./providers.js";
import { accessTokenFor, canSend } from "./connections.service.js";

/**
 * Send `text` to the ticket's customer from the support mailbox.
 * Returns { sent: true, from } on success, or null when the mailbox can't be
 * used (none connected, no send permission, or the provider refused).
 */
export async function sendFromSupportMailbox(ticket, { subject, text }) {
  if (!ticket?.contactEmail) return null;
  const connection = await prisma.oAuthConnection.findFirst({
    where: { tenantId: ticket.tenantId, purpose: "support_inbox", status: "active" },
  });
  if (!connection || !canSend(connection)) return null;

  try {
    const provider = getProvider(connection.provider);
    const token = await accessTokenFor(connection);
    // The customer's most recent email on this ticket is what we reply to.
    const last = await prisma.supportEmail.findFirst({
      where: { connectionId: connection.id, ticketId: ticket.id, outcome: { in: ["created", "replied"] } },
      orderBy: { receivedAt: "desc" },
    });
    const replyTo = last ? await provider.getMessage(token, last.externalId).catch(() => null) : null;
    await provider.sendMail(token, { to: ticket.contactEmail, subject, text, replyTo });
    return { sent: true, from: connection.accountEmail, threaded: !!replyTo };
  } catch (e) {
    log.warn?.("support_mailbox_send_failed", { ticketId: ticket.id, error: e.message });
    return null;
  }
}
