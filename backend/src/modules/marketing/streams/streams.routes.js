/**
 * Data Streams management — mounted at /api/marketing/streams.
 *
 * Creating, changing, rotating keys and deleting streams need "Manage
 * marketing settings"; importing a file needs "Draft audiences" (it creates
 * contacts and may record consent). Viewing is open to the module.
 *
 * CSV is uploaded as multipart form data (field "file", up to 10 MB); the
 * import's mapping and consent choices are form fields beside it.
 */
import express from "express";
import { requirePermission } from "../../../middleware/permission.middleware.js";
import { uploadCsv } from "../../../middleware/upload.middleware.js";
import prisma from "../../../config/database.js";
import * as svc from "./streams.service.js";
import { preview, importCsv } from "./csv.js";

const router = express.Router();
const tid = (req) => req.user.tenantId;
const uid = (req) => req.user.userId;
const handle = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (e) { res.status(e.status ?? 500).json({ message: e.message }); }
};
const manage = requirePermission("marketing.settings.manage");
const write = requirePermission("marketing.audience.write");
const err = (message, status = 400) => Object.assign(new Error(message), { status });
const text = (req) => {
  const s = req.file?.buffer?.toString("utf8") ?? "";
  if (!s.trim()) throw err("Choose a CSV file to upload");
  if (s.includes("\u0000")) throw err("That doesn't look like a CSV file");
  return s;
};

router.get("/", handle((req) => svc.list(tid(req))));
router.get("/overview", handle((req) => svc.overview(tid(req))));
router.get("/custom-events", handle((req) => svc.customEventTypes(tid(req))));
router.post("/", manage, handle((req) => svc.create(tid(req), uid(req), req.body ?? {})));
router.post("/csv/preview", write, ...uploadCsv, handle((req) => preview(text(req))));
router.get("/:id", handle((req) => svc.get(tid(req), req.params.id)));
router.put("/:id", manage, handle((req) => svc.update(tid(req), req.params.id, req.body ?? {})));
router.delete("/:id", manage, handle((req) => svc.remove(tid(req), uid(req), req.params.id)));
router.post("/:id/rotate-key", manage, handle((req) => svc.rotateKey(tid(req), uid(req), req.params.id)));
router.get("/:id/runs", handle((req) => svc.runs(tid(req), req.params.id)));
router.get("/:id/recent", handle((req) => svc.recent(tid(req), req.params.id)));
router.post("/:id/import", write, ...uploadCsv, handle(async (req) => {
  const source = await prisma.marketingDataSource.findFirst({ where: { id: String(req.params.id), tenantId: tid(req) } });
  if (!source) throw err("Data stream not found", 404);
  if (source.kind !== "csv") throw err("Imports go into a CSV data stream", 409);
  let mapping = {};
  const f = req.body ?? {};
  try { mapping = JSON.parse(String(f.mapping ?? "{}")); } catch { throw err("mapping must be JSON"); }
  const consent = f.consentEvidence ? { attested: f.attested === "1" || f.attested === "true", evidence: String(f.consentEvidence) } : null;
  return importCsv(source, { text: text(req), fileName: req.file?.originalname, mapping, consent, actorId: uid(req) });
}));

export default router;
