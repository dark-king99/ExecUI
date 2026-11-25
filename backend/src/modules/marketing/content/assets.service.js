/**
 * Content Studio: the organization's marketing assets.
 *
 * Files live in object storage (lib/storage.js) at unguessable URLs, so they
 * can be used in email and social posts. The file type is decided by the
 * file's own first bytes, not the name or the browser's claim. Only PNG, JPEG,
 * GIF, WebP, MP4, MOV, WebM and PDF are accepted. SVG and HTML are refused
 * because they can carry script.
 *
 * Uploading a new file makes a new version with its own URL. Old URLs keep
 * working, because emails already sent point at them. For the same reason, an
 * asset used in an email that has gone out can be archived but not deleted.
 * Only approved assets are offered when inserting into an email.
 */
import fs from "fs";
import prisma from "../../../config/database.js";
import * as storage from "../../../lib/storage.js";
import { publicBase } from "../email/render.js";

const err = (message, status = 400) => Object.assign(new Error(message), { status });
export const STATUSES = ["draft", "approved", "archived"];

/** Identify a file from its first bytes. Returns { mime, kind } or null. */
export function sniff(buf) {
  const b = Buffer.from(buf ?? []);
  const at = (o, s) => b.slice(o, o + s.length).toString("latin1") === s;
  if (b[0] === 0x89 && at(1, "PNG")) return { mime: "image/png", kind: "image" };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", kind: "image" };
  if (at(0, "GIF87a") || at(0, "GIF89a")) return { mime: "image/gif", kind: "image" };
  if (at(0, "RIFF") && at(8, "WEBP")) return { mime: "image/webp", kind: "image" };
  if (at(0, "%PDF-")) return { mime: "application/pdf", kind: "document" };
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { mime: "video/webm", kind: "video" };
  if (at(4, "ftyp")) return at(8, "qt  ") ? { mime: "video/quicktime", kind: "video" } : { mime: "video/mp4", kind: "video" };
  return null;
}

async function readHead(path) {
  const fh = await fs.promises.open(path, "r");
  try { const { buffer, bytesRead } = await fh.read(Buffer.alloc(16), 0, 16, 0); return buffer.slice(0, bytesRead); }
  finally { await fh.close(); }
}

/** Check an uploaded file; deletes it and throws if it isn't an allowed type. */
export async function acceptUpload(file) {
  if (!file) throw err("Choose a file to upload");
  const type = sniff(await readHead(file.path).catch(() => Buffer.alloc(0)));
  if (!type) {
    storage.remove(file.filename);
    throw err("That file type isn't supported. Upload PNG, JPEG, GIF, WebP, MP4, MOV, WebM or PDF.");
  }
  return { ...type, url: storage.urlFor(file.filename), size: file.size, fileName: String(file.originalname ?? "").slice(0, 200) };
}

const absolute = (url) => `${publicBase()}${url}`;
const shape = (a) => ({ ...a, absoluteUrl: absolute(a.url) });
const tagsOf = (v) => [...new Set((Array.isArray(v) ? v : String(v ?? "").split(",")).map((t) => String(t).trim().toLowerCase().slice(0, 30)).filter(Boolean))].slice(0, 15);

async function load(tenantId, id) {
  const a = await prisma.marketingAsset.findFirst({ where: { id: String(id), tenantId } });
  if (!a) throw err("Asset not found", 404);
  return a;
}

export async function list(tenantId, { kind, status, q, tag } = {}) {
  const rows = await prisma.marketingAsset.findMany({
    where: {
      tenantId,
      ...(kind ? { kind: String(kind) } : {}),
      ...(status ? { status: String(status) } : { status: { not: "archived" } }),
      ...(q ? { name: { contains: String(q).slice(0, 100), mode: "insensitive" } } : {}),
      ...(tag ? { tags: { has: String(tag).toLowerCase() } } : {}),
    },
    orderBy: { updatedAt: "desc" }, take: 500,
  });
  return rows.map(shape);
}

export async function get(tenantId, id) {
  const a = await load(tenantId, id);
  const versions = await prisma.marketingAssetVersion.findMany({ where: { tenantId, assetId: a.id }, orderBy: { version: "desc" } });
  return { ...shape(a), versions: versions.map((v) => ({ ...v, absoluteUrl: absolute(v.url) })), usage: await usage(tenantId, a.id) };
}

export async function create(tenantId, userId, file, body = {}) {
  const f = await acceptUpload(file);
  const name = String(body.name ?? "").trim().slice(0, 160) || f.fileName || "Untitled asset";
  const a = await prisma.marketingAsset.create({
    data: { tenantId, name, kind: f.kind, mimeType: f.mime, size: f.size, url: f.url, altText: body.altText ? String(body.altText).slice(0, 300) : null, tags: tagsOf(body.tags), createdById: userId },
  });
  await prisma.marketingAssetVersion.create({ data: { tenantId, assetId: a.id, version: 1, url: f.url, mimeType: f.mime, size: f.size, fileName: f.fileName, uploadedById: userId } });
  return get(tenantId, a.id);
}

/** Upload a replacement file. It needs re-approval; old version URLs keep working. */
export async function addVersion(tenantId, userId, id, file, { note } = {}) {
  const a = await load(tenantId, id);
  if (a.status === "archived") { if (file) storage.remove(file.filename); throw err("Restore the asset before uploading a new version", 409); }
  const f = await acceptUpload(file);
  if (f.kind !== a.kind) { storage.remove(f.url); throw err(`A new version must also be ${a.kind === "image" ? "an image" : `a ${a.kind}`}`); }
  const version = a.version + 1;
  await prisma.marketingAssetVersion.create({ data: { tenantId, assetId: a.id, version, url: f.url, mimeType: f.mime, size: f.size, fileName: f.fileName, note: note ? String(note).slice(0, 300) : null, uploadedById: userId } });
  await prisma.marketingAsset.update({ where: { id: a.id }, data: { version, url: f.url, mimeType: f.mime, size: f.size, status: "draft", approvedById: null, approvedAt: null } });
  return get(tenantId, a.id);
}

export async function update(tenantId, id, body = {}) {
  const a = await load(tenantId, id);
  const data = {};
  if (body.name !== undefined) { data.name = String(body.name ?? "").trim().slice(0, 160); if (!data.name) throw err("Name the asset"); }
  if (body.altText !== undefined) data.altText = body.altText ? String(body.altText).slice(0, 300) : null;
  if (body.tags !== undefined) data.tags = tagsOf(body.tags);
  await prisma.marketingAsset.update({ where: { id: a.id }, data });
  return get(tenantId, a.id);
}

/** approve | unapprove | archive | restore */
export async function setStatus(tenantId, userId, id, action) {
  const a = await load(tenantId, id);
  const to = { approve: "approved", unapprove: "draft", archive: "archived", restore: "draft" }[action];
  if (!to) throw err("Unknown action");
  if (action === "approve" && a.kind === "image" && !a.altText) throw err("Add alt text before approving an image — screen readers and image-blocking inboxes show it");
  await prisma.marketingAsset.update({ where: { id: a.id }, data: { status: to, ...(to === "approved" ? { approvedById: userId, approvedAt: new Date() } : { approvedById: null, approvedAt: null }) } });
  await prisma.auditLog.create({ data: { tenantId, userId, action: `marketing.asset.${action}`, resource: "marketing_asset", resourceId: a.id, detail: `${action[0].toUpperCase()}${action.slice(1)}d asset "${a.name}"` } }).catch(() => {});
  return get(tenantId, a.id);
}

/** Emails whose content uses any version of this asset. */
export async function usage(tenantId, id) {
  const versions = await prisma.marketingAssetVersion.findMany({ where: { tenantId, assetId: String(id) }, select: { url: true } });
  if (!versions.length) return [];
  const rows = await prisma.marketingCampaign.findMany({
    where: { tenantId, OR: versions.map((v) => ({ htmlBody: { contains: v.url } })) },
    select: { id: true, name: true, status: true, mode: true, sendStartedAt: true },
  });
  return rows;
}

export async function remove(tenantId, userId, id) {
  const a = await load(tenantId, id);
  const used = await usage(tenantId, a.id);
  const sent = used.filter((c) => c.sendStartedAt || !["draft", "cancelled"].includes(c.status));
  if (sent.length) throw err(`"${sent[0].name}" has gone out with this asset, so deleting it would break the image in people's inboxes. Archive it instead.`, 409);
  const versions = await prisma.marketingAssetVersion.findMany({ where: { tenantId, assetId: a.id } });
  await prisma.marketingAsset.delete({ where: { id: a.id } });
  for (const v of versions) storage.remove(v.url);
  await prisma.auditLog.create({ data: { tenantId, userId, action: "marketing.asset.deleted", resource: "marketing_asset", resourceId: a.id, detail: `Deleted asset "${a.name}"` } }).catch(() => {});
  return { deleted: true };
}

export async function summary(tenantId) {
  const rows = await prisma.marketingAsset.groupBy({ by: ["status", "kind"], where: { tenantId }, _count: { _all: true }, _sum: { size: true } });
  const out = { total: 0, approved: 0, draft: 0, archived: 0, images: 0, videos: 0, documents: 0, bytes: 0 };
  for (const r of rows) {
    out[r.status] += r._count._all;
    if (r.status !== "archived") { out.total += r._count._all; out[`${r.kind}s`] += r._count._all; }
    out.bytes += r._sum.size ?? 0;
  }
  return out;
}
