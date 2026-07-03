/**
 * Generic attachments — files on any entity (deals, leads, tasks, projects,
 * campaigns). Binaries go to object storage via the shared upload middleware;
 * this module owns the metadata and tenant scoping.
 */
import express from "express";
import prisma from "../../config/database.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { uploadFile } from "../../middleware/upload.middleware.js";
import * as storage from "../../lib/storage.js";

const router = express.Router();
const tid = (req) => req.user.tenantId;
const uid = (req) => req.user.userId;

const ENTITY_TYPES = ["deal", "lead", "task", "project", "campaign", "contact"];

// Executables have no business in a business file store.
const BLOCKED_EXT = /\.(exe|bat|cmd|com|msi|scr|ps1|sh|dll|jar)$/i;

const shape = (a) => ({
  id: a.id, entityType: a.entityType, entityId: a.entityId,
  fileName: a.fileName, mimeType: a.mimeType, size: a.size, url: a.url,
  uploaderName: a.uploaderName, uploadedById: a.uploadedById, time: a.createdAt,
});

function validEntity(req, res) {
  const { entityType, entityId } = req.params;
  if (!ENTITY_TYPES.includes(entityType)) {
    res.status(400).json({ message: `entityType must be one of: ${ENTITY_TYPES.join(", ")}` });
    return false;
  }
  if (!entityId || entityId.length > 64) {
    res.status(400).json({ message: "Invalid entityId" });
    return false;
  }
  return true;
}

// List files on an entity.
router.get("/:entityType/:entityId", authenticate, async (req, res) => {
  try {
    if (!validEntity(req, res)) return;
    const rows = await prisma.attachment.findMany({
      where: { tenantId: tid(req), entityType: req.params.entityType, entityId: req.params.entityId },
      orderBy: { createdAt: "desc" },
    });
    res.json(rows.map(shape));
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
});

// Upload a file to an entity (multipart field: "file", ≤100MB).
router.post("/:entityType/:entityId", authenticate, ...uploadFile, async (req, res) => {
  try {
    if (!validEntity(req, res)) return;
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    if (BLOCKED_EXT.test(req.file.originalname ?? "")) {
      storage.remove(req.file.filename);
      return res.status(400).json({ message: "This file type isn't allowed" });
    }
    const me = await prisma.user.findUnique({ where: { id: uid(req) }, select: { firstName: true, lastName: true } });
    const row = await prisma.attachment.create({
      data: {
        tenantId: tid(req),
        entityType: req.params.entityType,
        entityId: req.params.entityId,
        fileName: req.file.originalname ?? req.file.filename,
        mimeType: req.file.mimetype ?? null,
        size: req.file.size ?? 0,
        url: storage.urlFor(req.file.filename),
        uploadedById: uid(req),
        uploaderName: me ? `${me.firstName} ${me.lastName}`.trim() : null,
      },
    });
    res.status(201).json(shape(row));
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
});

// Delete: the uploader or an admin; removes the stored object too.
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const row = await prisma.attachment.findFirst({ where: { id: req.params.id, tenantId: tid(req) } });
    if (!row) return res.status(404).json({ message: "Attachment not found" });
    const isAdmin = ["enterprise_admin", "system_admin"].includes(req.user.role);
    if (row.uploadedById !== uid(req) && !isAdmin) {
      return res.status(403).json({ message: "Only the uploader or an admin can delete this file" });
    }
    await prisma.attachment.delete({ where: { id: row.id } });
    storage.remove(row.url);
    res.status(204).end();
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
});

export default router;
