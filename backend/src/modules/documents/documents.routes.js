/**
 * Documents, templates, e-signature and contracts — mounted at /api/documents
 * and /api/contracts.
 *
 * Access model:
 *   • Documents are a company-wide resource: any employee can see the hub and
 *     upload; only the owner or an admin can change or re-version a document.
 *   • Templates, envelopes and contracts are managed by admins — they commit the
 *     organization legally or financially.
 *   • The public signing endpoints live in sign.routes.js; nothing here is
 *     reachable without a session.
 */
import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import { uploadFile } from "../../middleware/upload.middleware.js";
import * as docs from "./documents.service.js";
import * as templates from "./templates.service.js";
import * as signatures from "./signatures.service.js";
import * as contracts from "./contracts.service.js";
import { catalog } from "./documents.registry.js";
import { capture } from "../../lib/analytics.js";

const router = express.Router();

const actor = (req) => ({ userId: req.user.userId, role: req.user.role, name: req.user.name });
const admin = requireRole("enterprise_admin", "system_admin");

const handle = (fn, status = 200) => async (req, res) => {
  try { res.status(status).json(await fn(req)); }
  catch (err) { res.status(err.status ?? 500).json({ message: err.message }); }
};

const captureAction = (event, fn, status = 200, properties = () => ({})) => handle(async (req) => {
  const result = await fn(req);
  await capture(undefined, event, { area: "documents", ...properties(req) });
  return result;
}, status);

router.use(authenticate);

// ── Catalog (drives the whole UI) ────────────────────────────────────────────
router.get("/catalog", handle(() => catalog()));
router.get("/stats", handle(() => docs.stats()));

// ── Templates (admin) ────────────────────────────────────────────────────────
router.get("/templates", handle((req) => templates.listTemplates({ includeInactive: req.query.all === "true" })));
router.post("/templates", admin, handle((req) => templates.createTemplate(actor(req), req.body), 201));
router.get("/templates/:id", handle((req) => templates.getTemplate(req.params.id)));
router.put("/templates/:id", admin, handle((req) => templates.updateTemplate(req.params.id, req.body)));
router.delete("/templates/:id", admin, handle((req) => templates.deleteTemplate(req.params.id)));
router.post("/templates/:id/preview", handle((req) => templates.previewTemplate(req.params.id, req.body?.values)));
router.post("/templates/:id/generate", admin, handle((req) => templates.generate(actor(req), req.params.id, req.body), 201));

// ── Signature envelopes (admin) ──────────────────────────────────────────────
router.get("/signatures", admin, handle((req) => signatures.listRequests({ status: req.query.status, documentId: req.query.documentId, limit: req.query.limit })));
router.post("/signatures", admin, handle((req) => signatures.createRequest(actor(req), req.body), 201));
router.get("/signatures/:id", admin, handle((req) => signatures.getRequest(req.params.id)));
router.post("/signatures/:id/send", admin, captureAction(
  "signature_request_sent",
  (req) => signatures.sendRequest(actor(req), req.params.id, { resend: !!req.body?.resend }),
  200,
  (req) => ({ resend: !!req.body?.resend })
));
router.post("/signatures/:id/cancel", admin, handle((req) => signatures.cancelRequest(actor(req), req.params.id, { reason: req.body?.reason })));

// Certificate: JSON (with a live integrity check) or PDF.
router.get("/signatures/:id/certificate", admin, handle(async (req) => {
  const request = await signatures.getRequest(req.params.id);
  return { certificate: request.certificate, verification: signatures.verifyCertificate(request.certificate) };
}));

router.get("/signatures/:id/certificate.pdf", admin, async (req, res) => {
  try {
    const buffer = await signatures.certificatePdf(req.params.id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="certificate-${req.params.id.slice(0, 8)}.pdf"`);
    res.send(buffer);
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
});

// ── Contracts (admin) ────────────────────────────────────────────────────────
// Mounted under /api/documents/contracts as well as /api/contracts (see
// routes/index.js) so the module reads as one thing from either direction.
export const contractRouter = express.Router();
contractRouter.use(authenticate, admin);

contractRouter.get("/", handle((req) => contracts.listContracts({
  status: req.query.status, type: req.query.type, search: req.query.search,
  mine: req.query.mine === "true", userId: req.user.userId,
  expiringDays: req.query.expiringDays, limit: req.query.limit,
})));
contractRouter.get("/portfolio", handle(() => contracts.portfolio()));
contractRouter.post("/", captureAction("contract_created", (req) => contracts.createContract(actor(req), req.body), 201));
contractRouter.get("/:id", handle((req) => contracts.getContract(req.params.id)));
contractRouter.put("/:id", handle((req) => contracts.updateContract(actor(req), req.params.id, req.body)));
contractRouter.delete("/:id", handle((req) => contracts.deleteContract(actor(req), req.params.id)));
contractRouter.post("/:id/status", captureAction(
  "contract_status_changed",
  (req) => contracts.transition(actor(req), req.params.id, req.body?.status, { note: req.body?.note }),
  200,
  (req) => ({ status: req.body?.status })
));
contractRouter.post("/:id/note", handle((req) => contracts.addNote(actor(req), req.params.id, req.body?.note), 201));
contractRouter.post("/:id/approval", handle((req) => contracts.requestApproval(actor(req), req.params.id, req.body), 201));
contractRouter.post("/:id/signature", handle((req) => contracts.sendForSignature(actor(req), req.params.id, req.body), 201));
contractRouter.post("/:id/renew", handle((req) => contracts.renewContract(actor(req), req.params.id, req.body), 201));

// ── Documents ────────────────────────────────────────────────────────────────
// Declared last: the ":id" routes below would otherwise swallow /templates etc.
router.get("/", handle((req) => docs.listDocuments({
  category: req.query.category, status: req.query.status, search: req.query.search,
  entityType: req.query.entityType, entityId: req.query.entityId,
  mine: req.query.mine === "true", userId: req.user.userId, limit: req.query.limit,
})));
router.post("/", captureAction("document_created", (req) => docs.createDocument(actor(req), req.body), 201));
router.get("/:id", handle((req) => docs.getDocument(req.params.id)));
router.put("/:id", handle((req) => docs.updateDocument(actor(req), req.params.id, req.body)));
router.post("/:id/archive", handle((req) => docs.archiveDocument(actor(req), req.params.id)));
router.delete("/:id", admin, handle((req) => docs.deleteDocument(actor(req), req.params.id)));

// Upload a new version (multipart field: "file").
router.post("/:id/versions", ...uploadFile, handle((req) =>
  docs.addVersion(actor(req), req.params.id, req.file, { notes: req.body?.notes }), 201));

export default router;
