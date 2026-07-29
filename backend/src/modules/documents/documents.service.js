/**
 * Document hub — versioned company documents.
 *
 * The rule that shapes this file: **a version is never mutated**. Uploading a
 * replacement adds version N+1 and moves the document's pointer; the old bytes
 * stay on disk and stay downloadable. Without that, "here is the contract we
 * signed" is a claim rather than a fact — and the e-signature certificate binds
 * to a version's checksum precisely so it can be proven.
 *
 * Binaries live in object storage (lib/storage.js); this module owns metadata,
 * tenant scoping and the checksum.
 */
import fs from "fs";
import crypto from "crypto";
import prisma from "../../config/database.js";
import * as storage from "../../lib/storage.js";
import {
  DOCUMENT_CATEGORIES, DOCUMENT_STATUSES, documentCategory,
} from "./documents.registry.js";

const err = (message, status = 400) => { const e = new Error(message); e.status = status; return e; };

// Executables have no business in a document store (mirrors the attachments
// module — the same reasoning applies whichever door the file comes through).
const BLOCKED_EXT = /\.(exe|bat|cmd|com|msi|scr|ps1|sh|dll|jar)$/i;

const ADMIN_ROLES = ["enterprise_admin", "system_admin"];
export const isAdmin = (role) => ADMIN_ROLES.includes(role);

const str = (v, max) => (v == null ? null : String(v).slice(0, max));

export const shapeVersion = (v) => ({
  id: v.id, version: v.version, fileName: v.fileName, mimeType: v.mimeType,
  size: v.size, url: v.url, checksum: v.checksum, notes: v.notes,
  uploaderName: v.uploaderName, uploadedById: v.uploadedById, createdAt: v.createdAt,
});

export const shape = (d, { versions, signatureCount = 0 } = {}) => ({
  id: d.id,
  title: d.title,
  description: d.description,
  category: d.category,
  categoryLabel: documentCategory(d.category)?.label ?? d.category,
  status: d.status,
  confidential: d.confidential,
  currentVersion: d.currentVersion,
  tags: d.tags ?? [],
  entityType: d.entityType,
  entityId: d.entityId,
  templateId: d.templateId,
  ownerId: d.ownerId,
  ownerName: d.ownerName,
  createdById: d.createdById,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
  signatureCount,
  latest: versions?.length ? shapeVersion(versions[0]) : null,
  versions: versions ? versions.map(shapeVersion) : undefined,
});

/** SHA-256 of a stored object — the fingerprint a signature binds to. */
export async function checksumOf(objectKeyOrUrl) {
  try {
    const key = String(objectKeyOrUrl).replace(/^.*\/uploads\//, "");
    const hash = crypto.createHash("sha256");
    await new Promise((resolve, reject) => {
      fs.createReadStream(storage.pathFor(key))
        .on("data", (c) => hash.update(c))
        .on("end", resolve)
        .on("error", reject);
    });
    return hash.digest("hex");
  } catch {
    // A missing file must not break the upload record; the certificate will
    // simply report that no checksum could be computed.
    return null;
  }
}

/** SHA-256 of an in-memory buffer (generated documents never touch disk twice). */
export const checksumOfBuffer = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

// ── Reading ──────────────────────────────────────────────────────────────────
export async function listDocuments({ category, status = "active", search, entityType, entityId, mine, userId, limit = 100 } = {}) {
  const where = {};
  if (status && status !== "all") where.status = status;
  if (category) where.category = category;
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (mine && userId) where.ownerId = userId;
  if (search) {
    const q = String(search).slice(0, 120);
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { tags: { has: q } },
    ];
  }

  const rows = await prisma.document.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: Math.min(500, Math.max(1, Number(limit) || 100)),
    include: {
      versions: { orderBy: { version: "desc" }, take: 1 },
      _count: { select: { requests: true } },
    },
  });
  return rows.map((d) => shape(d, { versions: d.versions, signatureCount: d._count.requests }));
}

export async function getDocument(id) {
  const row = await prisma.document.findFirst({
    where: { id },
    include: {
      versions: { orderBy: { version: "desc" } },
      _count: { select: { requests: true } },
    },
  });
  if (!row) throw err("Document not found", 404);
  return shape(row, { versions: row.versions, signatureCount: row._count.requests });
}

/** The version a signature request or download should use (latest by default). */
export async function getVersion(documentId, version) {
  const where = { documentId };
  if (version != null) where.version = Number(version);
  const row = await prisma.documentVersion.findFirst({
    where, orderBy: { version: "desc" },
  });
  if (!row) throw err("This document has no file uploaded yet", 404);
  return row;
}

// ── Writing ──────────────────────────────────────────────────────────────────
export async function createDocument(user, body = {}) {
  const title = String(body.title ?? "").trim();
  if (!title) throw err("A document needs a title");

  const category = body.category ?? "general";
  if (!documentCategory(category)) {
    throw err(`Unknown category "${category}". Pick one of: ${DOCUMENT_CATEGORIES.map((c) => c.id).join(", ")}`);
  }

  const me = await prisma.user.findFirst({
    where: { id: user.userId }, select: { firstName: true, lastName: true, email: true },
  });
  const myName = me ? `${me.firstName ?? ""} ${me.lastName ?? ""}`.trim() || me.email : null;

  return shape(await prisma.document.create({
    data: {
      title: title.slice(0, 250),
      description: str(body.description, 2000),
      category,
      confidential: !!body.confidential,
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 12).map((t) => String(t).slice(0, 40)) : [],
      entityType: str(body.entityType, 40),
      entityId: str(body.entityId, 64),
      templateId: str(body.templateId, 64),
      ownerId: body.ownerId ? String(body.ownerId) : user.userId,
      ownerName: body.ownerId ? null : myName,
      createdById: user.userId,
    },
  }), { versions: [] });
}

/** Only the owner or an admin may change a document. */
async function mustEdit(user, id) {
  const doc = await prisma.document.findFirst({ where: { id } });
  if (!doc) throw err("Document not found", 404);
  if (doc.ownerId !== user.userId && !isAdmin(user.role)) {
    throw err("Only the document owner or an admin can change this document.", 403);
  }
  return doc;
}

export async function updateDocument(user, id, body = {}) {
  await mustEdit(user, id);
  const data = {};
  if (body.title !== undefined) {
    const t = String(body.title).trim();
    if (!t) throw err("A document needs a title");
    data.title = t.slice(0, 250);
  }
  if (body.description !== undefined) data.description = str(body.description, 2000);
  if (body.category !== undefined) {
    if (!documentCategory(body.category)) throw err(`Unknown category "${body.category}"`);
    data.category = body.category;
  }
  if (body.status !== undefined) {
    if (!DOCUMENT_STATUSES.includes(body.status)) throw err(`Status must be one of: ${DOCUMENT_STATUSES.join(", ")}`);
    data.status = body.status;
  }
  if (body.confidential !== undefined) data.confidential = !!body.confidential;
  if (body.tags !== undefined) {
    data.tags = Array.isArray(body.tags) ? body.tags.slice(0, 12).map((t) => String(t).slice(0, 40)) : [];
  }
  if (body.ownerId !== undefined) {
    const owner = await prisma.user.findFirst({
      where: { id: String(body.ownerId) }, select: { id: true, firstName: true, lastName: true, email: true },
    });
    if (!owner) throw err("That owner doesn't exist in this organization", 404);
    data.ownerId = owner.id;
    data.ownerName = `${owner.firstName ?? ""} ${owner.lastName ?? ""}`.trim() || owner.email;
  }

  await prisma.document.update({ where: { id }, data });
  return getDocument(id);
}

/**
 * Add a new version. The upload middleware has already written the bytes; this
 * assigns the next version number and computes the checksum.
 */
export async function addVersion(user, documentId, file, { notes } = {}) {
  const doc = await mustEdit(user, documentId);
  if (!file) throw err("No file uploaded");
  if (BLOCKED_EXT.test(file.originalname ?? "")) {
    storage.remove(file.filename);
    throw err("This file type isn't allowed in the document store");
  }

  const me = await prisma.user.findFirst({
    where: { id: user.userId }, select: { firstName: true, lastName: true, email: true },
  });
  const url = storage.urlFor(file.filename);
  const checksum = await checksumOf(file.filename);

  // The unique index on (documentId, version) is the real guard against two
  // concurrent uploads claiming the same number; retry once on collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const last = await prisma.documentVersion.findFirst({
      where: { documentId }, orderBy: { version: "desc" }, select: { version: true },
    });
    const version = (last?.version ?? 0) + 1;
    try {
      await prisma.documentVersion.create({
        data: {
          documentId, version,
          fileName: String(file.originalname ?? file.filename).slice(0, 250),
          mimeType: str(file.mimetype, 120),
          size: file.size ?? 0,
          url, checksum,
          notes: str(notes, 500),
          uploadedById: user.userId,
          uploaderName: me ? `${me.firstName ?? ""} ${me.lastName ?? ""}`.trim() || me.email : null,
        },
      });
      await prisma.document.update({ where: { id: documentId }, data: { currentVersion: version } });
      return getDocument(documentId);
    } catch (e) {
      if (e.code !== "P2002" || attempt === 2) throw e;
    }
  }
  throw err("Couldn't allocate a version number — try again", 409);
}

/**
 * Store a generated file (from a template) as a new version, without a
 * multipart upload.
 */
export async function addGeneratedVersion(user, documentId, { buffer, fileName, mimeType, notes }) {
  const key = storage.objectKey(fileName, "document");
  await fs.promises.writeFile(storage.pathFor(key), buffer);
  return addVersion(
    user, documentId,
    { filename: key, originalname: fileName, mimetype: mimeType, size: buffer.length },
    { notes },
  );
}

/**
 * Archive rather than delete by default. Hard delete is admin-only and refuses
 * when the document carries signatures — destroying signed evidence shouldn't be
 * one click away.
 */
export async function archiveDocument(user, id) {
  await mustEdit(user, id);
  await prisma.document.update({ where: { id }, data: { status: "archived" } });
  return getDocument(id);
}

export async function deleteDocument(user, id) {
  const doc = await prisma.document.findFirst({
    where: { id }, include: { _count: { select: { requests: true, contracts: true } } },
  });
  if (!doc) throw err("Document not found", 404);
  if (!isAdmin(user.role)) throw err("Only an admin can permanently delete a document.", 403);
  if (doc._count.requests) {
    throw err("This document has signature requests against it. Archive it instead — deleting it would destroy signature evidence.", 409);
  }
  if (doc._count.contracts) {
    throw err("This document is attached to a contract. Detach it from the contract first.", 409);
  }

  const versions = await prisma.documentVersion.findMany({ where: { documentId: id }, select: { url: true } });
  await prisma.document.delete({ where: { id } });
  for (const v of versions) storage.remove(v.url);
  return { deleted: true, versionsRemoved: versions.length };
}

/** Counts for the hub header. */
export async function stats() {
  const [total, archived, byCategory, signatures] = await Promise.all([
    prisma.document.count({ where: { status: "active" } }),
    prisma.document.count({ where: { status: "archived" } }),
    prisma.document.groupBy({ by: ["category"], where: { status: "active" }, _count: { _all: true } }),
    prisma.signatureRequest.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  return {
    active: total,
    archived,
    byCategory: byCategory.map((r) => ({
      category: r.category,
      label: documentCategory(r.category)?.label ?? r.category,
      count: r._count._all,
    })),
    signatures: Object.fromEntries(signatures.map((r) => [r.status, r._count._all])),
  };
}
