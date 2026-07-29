/**
 * E-signature engine.
 *
 * Design decisions worth stating, because they're what make an electronic
 * signature defensible rather than decorative:
 *
 * 1. **The signer's link is a bearer secret we don't keep.** Each party gets a
 *    random 32-byte token; only its SHA-256 is stored. A database dump therefore
 *    can't be used to sign on someone's behalf.
 * 2. **Intent is captured, not assumed.** A signature requires the signer to
 *    type their legal name *and* affirm consent to sign electronically — the
 *    ESIGN/UETA notion of intent. Neither is inferred from a click.
 * 3. **The signature binds to bytes.** The certificate records the SHA-256 of
 *    the exact document version signed, so a later edit is detectable rather
 *    than arguable.
 * 4. **The certificate is self-verifying.** It carries a hash over its own
 *    canonical JSON; `verifyCertificate` recomputes it, so tampering with a
 *    stored certificate is provable.
 * 5. **Honest degradation.** With no email provider configured, nothing is
 *    faked: the signing links are returned to the sender to distribute, and the
 *    response says so plainly.
 *
 * The signing endpoints are public by necessity — counterparties have no
 * account. They are therefore token-only, rate-limited, and run under
 * `runUnscoped` (there is no session to derive a tenant from), with every
 * subsequent write pinned to the tenant the token itself resolved to.
 */
import crypto from "crypto";
import prisma from "../../config/database.js";
import { runUnscoped, runWithTenant } from "../../lib/tenantContext.js";
import { sendEmail, emailConfigured } from "../../lib/email.js";
import { notify } from "../notifications/notifications.service.js";
import { log } from "../../lib/logger.js";
import {
  validateSigners, activeSigners, isEnvelopeComplete, ACTING_ROLES, SIGNER_ROLES,
} from "./documents.registry.js";
import { getDocument, getVersion } from "./documents.service.js";

const err = (message, status = 400) => { const e = new Error(message); e.status = status; return e; };

const DEFAULT_EXPIRY_DAYS = 30;
const MAX_EXPIRY_DAYS = 365;

// ── Tokens ───────────────────────────────────────────────────────────────────
export const newToken = () => crypto.randomBytes(32).toString("base64url");
export const hashToken = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");

const appUrl = () => (process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
export const signingUrl = (token) => `${appUrl()}/sign/${token}`;

// ── Shaping ──────────────────────────────────────────────────────────────────
const shapeSigner = (s) => ({
  id: s.id, name: s.name, email: s.email, role: s.role, roleLabel: SIGNER_ROLES[s.role] ?? s.role,
  order: s.order, status: s.status, signatureName: s.signatureName,
  viewedAt: s.viewedAt, signedAt: s.signedAt, remindedAt: s.remindedAt,
  declineReason: s.declineReason, ip: s.ip,
});

const shapeEvent = (e) => ({
  id: e.id, type: e.type, detail: e.detail, actorName: e.actorName,
  ip: e.ip, createdAt: e.createdAt,
});

export const shape = (r) => ({
  id: r.id,
  documentId: r.documentId,
  documentTitle: r.document?.title ?? null,
  versionId: r.versionId,
  title: r.title,
  message: r.message,
  status: r.status,
  sequential: r.sequential,
  expiresAt: r.expiresAt,
  sentAt: r.sentAt,
  completedAt: r.completedAt,
  certificate: r.certificate ?? null,
  createdById: r.createdById,
  createdAt: r.createdAt,
  signers: (r.signers ?? []).map(shapeSigner),
  events: r.events ? r.events.map(shapeEvent) : undefined,
  progress: (() => {
    const acting = (r.signers ?? []).filter((s) => ACTING_ROLES.includes(s.role));
    return { signed: acting.filter((s) => s.status === "signed").length, total: acting.length };
  })(),
});

const include = {
  document: { select: { title: true } },
  signers: { orderBy: [{ order: "asc" }, { email: "asc" }] },
};

async function trail(requestId, type, { signerId, detail, ip, userAgent, actorName, tenantId } = {}) {
  try {
    await prisma.signatureEvent.create({
      data: {
        // tenantId is normally injected by the tenant guard; system sweeps run
        // without a request context and pass it explicitly.
        ...(tenantId ? { tenantId } : {}),
        requestId, signerId: signerId ?? null, type,
        detail: detail ? String(detail).slice(0, 500) : null,
        ip: ip ? String(ip).slice(0, 64) : null,
        userAgent: userAgent ? String(userAgent).slice(0, 300) : null,
        actorName: actorName ? String(actorName).slice(0, 160) : null,
      },
    });
  } catch (e) {
    // The audit trail is important but must never block a signature.
    log.warn?.("signature_trail_failed", { requestId, type, error: e.message });
  }
}

// ── Creating an envelope ─────────────────────────────────────────────────────
export async function createRequest(user, body = {}) {
  // An absent id would become `where: { id: undefined }` — no filter at all —
  // and quietly attach the envelope to whichever document came back first.
  if (!body.documentId) throw err("Choose the document to send for signature");
  const doc = await getDocument(body.documentId);
  const version = await getVersion(doc.id, body.version);

  const signers = validateSigners(body.signers);
  const days = Math.min(MAX_EXPIRY_DAYS, Math.max(1, Number(body.expiresInDays) || DEFAULT_EXPIRY_DAYS));

  // Envelope and signers are created in two steps rather than one nested write:
  // the tenant guard injects tenantId into the *top-level* create only, and
  // Signer requires its own tenantId. Two explicit writes keep every row scoped.
  const envelope = await prisma.signatureRequest.create({
    data: {
      documentId: doc.id,
      versionId: version.id,
      title: String(body.title ?? "").trim().slice(0, 200) || `Signature: ${doc.title}`,
      message: body.message ? String(body.message).slice(0, 2000) : null,
      sequential: !!body.sequential,
      expiresAt: new Date(Date.now() + days * 86_400_000),
      createdById: user.userId,
    },
  });
  await prisma.signer.createMany({
    data: signers.map((s) => ({ ...s, requestId: envelope.id })),
  });
  const request = await prisma.signatureRequest.findFirst({ where: { id: envelope.id }, include });

  await trail(request.id, "created", {
    detail: `${signers.length} part${signers.length === 1 ? "y" : "ies"} · version ${version.version}`,
    actorName: user.name ?? null,
  });
  return shape(request);
}

export async function listRequests({ status, documentId, limit = 100 } = {}) {
  const where = {};
  if (status && status !== "all") where.status = status;
  if (documentId) where.documentId = documentId;
  const rows = await prisma.signatureRequest.findMany({
    where, orderBy: { createdAt: "desc" },
    take: Math.min(300, Math.max(1, Number(limit) || 100)),
    include,
  });
  return rows.map(shape);
}

export async function getRequest(id) {
  const row = await prisma.signatureRequest.findFirst({
    where: { id },
    include: { ...include, events: { orderBy: { createdAt: "asc" } } },
  });
  if (!row) throw err("Signature request not found", 404);
  return shape(row);
}

// ── Sending ──────────────────────────────────────────────────────────────────
/**
 * Issue fresh tokens to whoever's turn it is and email them their link.
 * Tokens are minted here and never stored in plaintext, so the links are only
 * available in this response — which is exactly what makes the no-email-provider
 * fallback (hand the links to the sender) safe rather than a leak.
 */
export async function sendRequest(user, id, { resend = false, trailType } = {}) {
  const row = await prisma.signatureRequest.findFirst({ where: { id }, include });
  if (!row) throw err("Signature request not found", 404);
  if (!["draft", "sent"].includes(row.status)) throw err(`This envelope is ${row.status} — it can't be sent again.`, 409);
  if (row.expiresAt && row.expiresAt < new Date()) throw err("This envelope has expired. Create a new one.", 409);
  if (row.status === "sent" && !resend) throw err("This envelope has already been sent. Use resend to nudge the outstanding parties.", 409);

  const turn = activeSigners(row.signers, { sequential: row.sequential });
  if (!turn.length) throw err("There's nobody left to send to on this envelope.", 409);

  const doc = await prisma.document.findFirst({ where: { id: row.documentId }, select: { title: true } });
  const links = [];

  for (const signer of turn) {
    const token = newToken();
    await prisma.signer.update({
      where: { id: signer.id },
      data: {
        tokenHash: hashToken(token),
        status: signer.status === "pending" ? "sent" : signer.status,
        remindedAt: signer.status !== "pending" ? new Date() : null,
      },
    });
    const url = signingUrl(token);
    links.push({ name: signer.name, email: signer.email, role: signer.role, url });

    try {
      await sendEmail({
        tenantId: row.tenantId,
        to: signer.email,
        subject: row.title || `Please sign: ${doc?.title ?? "document"}`,
        text: [
          `Hello ${signer.name},`,
          "",
          row.message || `You've been asked to ${signer.role === "approver" ? "approve" : "sign"} "${doc?.title ?? row.title}".`,
          "",
          `Open it here: ${url}`,
          "",
          row.expiresAt ? `This link expires on ${row.expiresAt.toUTCString()}.` : "",
          "",
          "If you weren't expecting this, you can ignore this message.",
        ].filter(Boolean).join("\n"),
        context: "signature_request",
        userId: row.createdById,
      });
    } catch (e) {
      log.warn?.("signature_email_failed", { requestId: id, error: e.message });
    }

    await trail(id, trailType ?? (resend ? "reminded" : "sent"), {
      signerId: signer.id, detail: `to ${signer.email}`, actorName: user?.name ?? null,
    });
  }

  const updated = await prisma.signatureRequest.update({
    where: { id },
    data: { status: "sent", sentAt: row.sentAt ?? new Date() },
    include,
  });

  return {
    ...shape(updated),
    // Only present in this response — the plaintext tokens don't exist anywhere else.
    links,
    delivery: emailConfigured()
      ? "emailed"
      : "no_email_provider: no email provider is configured, so nothing was sent. Copy the links below to the signers yourself.",
  };
}

export async function cancelRequest(user, id, { reason } = {}) {
  const row = await prisma.signatureRequest.findFirst({ where: { id } });
  if (!row) throw err("Signature request not found", 404);
  if (["completed", "cancelled", "declined"].includes(row.status)) {
    throw err(`This envelope is already ${row.status}.`, 409);
  }
  // Revoking the tokens is the actual cancellation — the links stop working.
  await prisma.signer.updateMany({ where: { requestId: id }, data: { tokenHash: null } });
  await prisma.signatureRequest.update({ where: { id }, data: { status: "cancelled" } });
  await trail(id, "cancelled", { detail: reason ? String(reason) : null, actorName: user?.name ?? null });
  return getRequest(id);
}

// ── The signer's side (public, token-only) ───────────────────────────────────
/**
 * Resolve a signing token. Unscoped by necessity — a counterparty has no session
 * — but everything the caller can reach afterwards is pinned to the tenant this
 * lookup returned.
 *
 * The callback is `async` on purpose: a Prisma promise awaited *outside* the
 * AsyncLocalStorage context would lose it, and the tenant guard would skip
 * injection.
 */
async function resolveToken(token) {
  if (!token || String(token).length < 20) throw err("This signing link isn't valid.", 404);
  const tokenHash = hashToken(token);

  const signer = await runUnscoped(async () =>
    prisma.signer.findFirst({
      where: { tokenHash },
      include: {
        request: {
          include: {
            document: { select: { id: true, title: true, description: true } },
            signers: { orderBy: [{ order: "asc" }, { email: "asc" }] },
          },
        },
      },
    }),
  );
  if (!signer) throw err("This signing link isn't valid, or it has already been used.", 404);

  const request = signer.request;
  if (!request) throw err("This signing link isn't valid.", 404);
  if (request.status === "cancelled") throw err("This request was cancelled by the sender.", 409);
  if (request.status === "declined") throw err("This request was declined and is closed.", 409);
  if (request.expiresAt && request.expiresAt < new Date()) throw err("This signing link has expired. Ask the sender for a new one.", 410);

  return { signer, request, tenantId: signer.tenantId };
}

/** What the public signing page shows. No internals, no other party's contact details. */
export async function viewByToken(token, { ip, userAgent } = {}) {
  const { signer, request, tenantId } = await resolveToken(token);

  const version = await runWithTenant({ tenantId }, async () =>
    request.versionId
      ? prisma.documentVersion.findFirst({ where: { id: request.versionId } })
      : prisma.documentVersion.findFirst({ where: { documentId: request.documentId }, orderBy: { version: "desc" } }),
  );

  const myTurn = activeSigners(request.signers, { sequential: request.sequential }).some((s) => s.id === signer.id);

  // First open is a real audit event; re-opens aren't re-recorded.
  if (signer.status === "sent") {
    await runWithTenant({ tenantId }, async () => {
      await prisma.signer.update({ where: { id: signer.id }, data: { status: "viewed", viewedAt: new Date(), ip: ip ?? null, userAgent: userAgent ? String(userAgent).slice(0, 300) : null } });
      await trail(request.id, "viewed", { signerId: signer.id, detail: `by ${signer.email}`, ip, userAgent, actorName: signer.name });
    });
  }

  const org = await runUnscoped(async () =>
    prisma.tenant.findFirst({ where: { id: tenantId }, select: { name: true } }),
  );

  return {
    request: {
      id: request.id,
      title: request.title,
      message: request.message,
      status: request.status,
      sequential: request.sequential,
      expiresAt: request.expiresAt,
      organization: org?.name ?? null,
    },
    document: {
      title: request.document?.title ?? null,
      description: request.document?.description ?? null,
      fileName: version?.fileName ?? null,
      mimeType: version?.mimeType ?? null,
      size: version?.size ?? 0,
      version: version?.version ?? null,
      checksum: version?.checksum ?? null,
      url: version?.url ?? null,
    },
    me: {
      name: signer.name,
      email: signer.email,
      role: signer.role,
      status: signer.status,
      myTurn,
      // Never expose other signers' addresses to a counterparty; the count and
      // progress are enough context.
      waitingOn: myTurn ? null : "another party",
    },
    parties: request.signers.map((s) => ({ name: s.name, role: s.role, status: s.status, signedAt: s.signedAt })),
  };
}

/**
 * Record a signature. Requires a typed legal name that matches nothing except
 * the signer's own intent, plus explicit consent — this is the act of signing.
 */
export async function signByToken(token, { signatureName, consent, ip, userAgent } = {}) {
  const { signer, request, tenantId } = await resolveToken(token);

  if (!ACTING_ROLES.includes(signer.role)) throw err("You were sent a copy of this document, so there's nothing to sign.", 403);
  if (signer.status === "signed") throw err("You've already signed this document.", 409);
  if (signer.status === "declined") throw err("You declined this document.", 409);

  const typed = String(signatureName ?? "").trim();
  if (typed.length < 2) throw err("Type your full name to sign.");
  if (consent !== true) throw err("You must agree to sign electronically before you can sign.");

  const myTurn = activeSigners(request.signers, { sequential: request.sequential }).some((s) => s.id === signer.id);
  if (!myTurn) throw err("It isn't your turn yet — this document is being signed in order. You'll be emailed when it reaches you.", 409);

  return runWithTenant({ tenantId }, async () => {
    await prisma.signer.update({
      where: { id: signer.id },
      data: {
        status: "signed",
        signatureName: typed.slice(0, 160),
        consent: true,
        signedAt: new Date(),
        ip: ip ?? signer.ip ?? null,
        userAgent: userAgent ? String(userAgent).slice(0, 300) : signer.userAgent,
        // The link is single-use: once signed, the token stops resolving.
        tokenHash: null,
      },
    });
    await trail(request.id, "signed", {
      signerId: signer.id, detail: `${signer.email} signed as "${typed}"`, ip, userAgent, actorName: signer.name,
    });

    const signers = await prisma.signer.findMany({ where: { requestId: request.id }, orderBy: [{ order: "asc" }, { email: "asc" }] });

    if (isEnvelopeComplete(signers)) {
      await completeRequest(tenantId, request.id);
      return { signed: true, complete: true, message: "Thank you — everyone has now signed. A completion certificate has been issued." };
    }

    // Sequential envelopes advance to the next party automatically.
    if (request.sequential) {
      const next = activeSigners(signers, { sequential: true });
      if (next.length) {
        await sendRequest({ name: "Signature routing" }, request.id, { resend: true, trailType: "sent" })
          .catch((e) => log.warn?.("signature_advance_failed", { requestId: request.id, error: e.message }));
      }
    }

    await notifyOwner(tenantId, request, `${signer.name} signed "${request.title}"`);
    return { signed: true, complete: false, message: "Thank you — your signature has been recorded. We're waiting on the other parties." };
  });
}

export async function declineByToken(token, { reason, ip, userAgent } = {}) {
  const { signer, request, tenantId } = await resolveToken(token);
  if (signer.status === "signed") throw err("You've already signed this document.", 409);

  return runWithTenant({ tenantId }, async () => {
    await prisma.signer.update({
      where: { id: signer.id },
      data: {
        status: "declined",
        declineReason: reason ? String(reason).slice(0, 500) : null,
        ip: ip ?? null,
        tokenHash: null,
      },
    });
    // One decline ends the envelope: an agreement isn't partially agreed.
    await prisma.signatureRequest.update({ where: { id: request.id }, data: { status: "declined" } });
    await prisma.signer.updateMany({ where: { requestId: request.id, status: { in: ["pending", "sent", "viewed"] } }, data: { tokenHash: null } });
    await trail(request.id, "declined", {
      signerId: signer.id, detail: reason ? `${signer.email}: ${reason}` : `${signer.email} declined`, ip, userAgent, actorName: signer.name,
    });
    await notifyOwner(tenantId, request, `${signer.name} declined "${request.title}"`);
    return { declined: true, message: "Your response has been recorded and the sender has been notified." };
  });
}

async function notifyOwner(tenantId, request, message) {
  if (!request.createdById) return;
  try {
    await runWithTenant({ tenantId }, async () =>
      notify({
        tenantId, userId: request.createdById, type: "signature",
        title: message, link: "/documents", actorName: "E-signature",
      }),
    );
  } catch (e) {
    log.warn?.("signature_notify_failed", { requestId: request.id, error: e.message });
  }
}

// ── Completion certificate ───────────────────────────────────────────────────
/**
 * Canonical JSON: keys sorted at every level, so the hash depends on the data
 * and not on property insertion order. Without this, "verify" would be a
 * coin flip.
 */
export function canonicalize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(",")}}`;
}

export const certificateHash = (body) => crypto.createHash("sha256").update(canonicalize(body)).digest("hex");

/** Build the certificate body (pure — takes plain data, returns plain data). */
export function buildCertificate({ request, document, version, signers, issuedAt = new Date() }) {
  const body = {
    version: 1,
    issuedAt: new Date(issuedAt).toISOString(),
    envelope: {
      id: request.id,
      title: request.title,
      sequential: !!request.sequential,
      createdAt: new Date(request.createdAt).toISOString(),
      sentAt: request.sentAt ? new Date(request.sentAt).toISOString() : null,
    },
    document: {
      id: document?.id ?? null,
      title: document?.title ?? null,
      fileName: version?.fileName ?? null,
      version: version?.version ?? null,
      size: version?.size ?? null,
      // The whole point: the certificate is bound to these exact bytes.
      sha256: version?.checksum ?? null,
    },
    signatures: signers
      .filter((s) => ACTING_ROLES.includes(s.role))
      .map((s) => ({
        name: s.name,
        email: s.email,
        role: s.role,
        signedAs: s.signatureName ?? null,
        consented: !!s.consent,
        signedAt: s.signedAt ? new Date(s.signedAt).toISOString() : null,
        viewedAt: s.viewedAt ? new Date(s.viewedAt).toISOString() : null,
        ip: s.ip ?? null,
      }))
      .sort((a, b) => String(a.email).localeCompare(String(b.email))),
    copies: signers.filter((s) => s.role === "viewer").map((s) => ({ name: s.name, email: s.email })),
  };
  return { ...body, hash: certificateHash(body) };
}

/**
 * Re-derive the hash and compare. `valid: false` means the stored certificate no
 * longer matches its own contents — i.e. it was edited after issue.
 */
export function verifyCertificate(certificate) {
  if (!certificate || typeof certificate !== "object") return { valid: false, reason: "No certificate has been issued for this envelope." };
  const { hash, ...body } = certificate;
  if (!hash) return { valid: false, reason: "The certificate carries no hash." };
  const expected = certificateHash(body);
  return expected === hash
    ? { valid: true, hash }
    : { valid: false, reason: "The certificate's contents don't match its hash — it has been altered since it was issued.", expected, stored: hash };
}

/** Seal the envelope: issue the certificate and lock every remaining token. */
async function completeRequest(tenantId, requestId) {
  return runWithTenant({ tenantId }, async () => {
    const request = await prisma.signatureRequest.findFirst({
      where: { id: requestId },
      include: { document: true, signers: { orderBy: [{ order: "asc" }, { email: "asc" }] } },
    });
    if (!request) return null;

    const version = request.versionId
      ? await prisma.documentVersion.findFirst({ where: { id: request.versionId } })
      : await prisma.documentVersion.findFirst({ where: { documentId: request.documentId }, orderBy: { version: "desc" } });

    const certificate = buildCertificate({
      request, document: request.document, version, signers: request.signers,
    });

    await prisma.signatureRequest.update({
      where: { id: requestId },
      data: { status: "completed", completedAt: new Date(), certificate },
    });
    await prisma.signer.updateMany({ where: { requestId }, data: { tokenHash: null } });
    await trail(requestId, "completed", { detail: `certificate ${certificate.hash.slice(0, 16)}…` });

    await notifyOwner(tenantId, request, `"${request.title}" is fully signed`);

    // A contract waiting on these signatures becomes active.
    try {
      const { onSignatureCompleted } = await import("./contracts.service.js");
      await onSignatureCompleted(requestId);
    } catch (e) {
      log.warn?.("contract_signature_hook_failed", { requestId, error: e.message });
    }

    // Email every party their copy of the certificate.
    for (const s of request.signers) {
      try {
        await sendEmail({
          tenantId,
          to: s.email,
          subject: `Signed: ${request.document?.title ?? request.title}`,
          text: [
            `Hello ${s.name},`,
            "",
            `"${request.document?.title ?? request.title}" has been signed by all parties.`,
            "",
            `Document fingerprint (SHA-256): ${version?.checksum ?? "unavailable"}`,
            `Certificate id: ${certificate.hash}`,
            "",
            "Keep this message — the fingerprint lets you prove which file was signed.",
          ].join("\n"),
          context: "signature_completed",
        });
      } catch { /* a delivery failure must not un-complete a signed envelope */ }
    }

    return certificate;
  });
}

/** Certificate as a PDF — what a counterparty files away. */
export async function certificatePdf(id) {
  const request = await getRequest(id);
  if (!request.certificate) throw err("This envelope isn't complete yet, so no certificate has been issued.", 409);
  const check = verifyCertificate(request.certificate);
  const c = request.certificate;

  const PDFDocument = (await import("pdfkit")).default;
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 56 });
      const chunks = [];
      doc.on("data", (ch) => chunks.push(ch));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(18).fillColor("#0f172a").text("Certificate of completion");
      doc.moveDown(0.2);
      doc.fontSize(9).fillColor("#64748b").text(`Issued ${new Date(c.issuedAt).toUTCString()}`);
      doc.moveDown(1);

      const row = (label, value) => {
        doc.fontSize(9).fillColor("#64748b").text(label, { continued: false });
        doc.fontSize(11).fillColor("#0f172a").text(String(value ?? "—"));
        doc.moveDown(0.5);
      };

      row("Document", c.document.title);
      row("File", `${c.document.fileName ?? "—"} (version ${c.document.version ?? "—"})`);
      row("Document fingerprint (SHA-256)", c.document.sha256 ?? "unavailable");
      row("Envelope", `${c.envelope.title} · ${c.envelope.id}`);
      row("Signing order", c.envelope.sequential ? "Sequential" : "Parallel");

      doc.moveDown(0.5);
      doc.fontSize(13).fillColor("#0f172a").text("Signatures");
      doc.moveDown(0.4);
      for (const s of c.signatures) {
        doc.fontSize(11).fillColor("#0f172a").text(`${s.name} <${s.email}>`);
        doc.fontSize(9).fillColor("#475569").text(
          [
            `signed as "${s.signedAs ?? "—"}"`,
            s.signedAt ? `at ${new Date(s.signedAt).toUTCString()}` : "not signed",
            s.ip ? `from ${s.ip}` : null,
            s.consented ? "consented to electronic signature" : "no consent recorded",
          ].filter(Boolean).join(" · "),
        );
        doc.moveDown(0.5);
      }

      if (c.copies?.length) {
        doc.moveDown(0.3).fontSize(13).fillColor("#0f172a").text("Copies sent to");
        doc.moveDown(0.3);
        for (const v of c.copies) doc.fontSize(10).fillColor("#475569").text(`${v.name} <${v.email}>`);
      }

      doc.moveDown(1);
      doc.fontSize(9).fillColor("#64748b").text("Certificate integrity");
      doc.fontSize(9).fillColor(check.valid ? "#047857" : "#b91c1c").text(
        check.valid
          ? `Verified — the certificate matches its hash (${c.hash}).`
          : `NOT VERIFIED — ${check.reason}`,
        { width: doc.page.width - 112 },
      );
      doc.moveDown(0.6);
      doc.fontSize(8).fillColor("#94a3b8").text(
        "This certificate records an electronic signature made with the signer's typed name and explicit consent, "
        + "bound to the document fingerprint above. Any change to the document produces a different fingerprint.",
        { width: doc.page.width - 112 },
      );

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

// ── Expiry sweep ─────────────────────────────────────────────────────────────
/**
 * Close out envelopes past their expiry. Run from the contracts scheduler so the
 * module has one ticker rather than two.
 */
export async function expireStaleRequests() {
  // Runs from the scheduler, so there is no tenant context: each row is handled
  // inside its own tenant's context rather than with hand-written filters.
  const stale = await prisma.signatureRequest.findMany({
    where: { status: { in: ["draft", "sent"] }, expiresAt: { lt: new Date() } },
    select: { id: true, tenantId: true },
  });
  for (const { id, tenantId } of stale) {
    await runWithTenant({ tenantId }, async () => {
      await prisma.signatureRequest.update({ where: { id }, data: { status: "expired" } });
      await prisma.signer.updateMany({ where: { requestId: id }, data: { tokenHash: null } });
      await trail(id, "expired", { detail: "the envelope passed its expiry date", tenantId });
    });
  }
  return { expired: stale.length };
}
