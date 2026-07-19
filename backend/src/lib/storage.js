/**
 * Object storage abstraction. Binary assets (avatars, files, videos) are kept
 * OUT of the database — only their public URL is persisted. Backed by the
 * local filesystem here (a drop-in stand-in for S3/GCS/Azure Blob); swap the
 * key/url/remove helpers for a cloud SDK without touching call sites.
 */
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const STORAGE_ROOT = process.env.STORAGE_DIR || path.resolve(__dirname, "../../storage/uploads");
export const PUBLIC_BASE = "/api/uploads";

fs.mkdirSync(STORAGE_ROOT, { recursive: true });

/** Generate a collision-resistant object key, preserving the file extension. */
export function objectKey(originalName, prefix = "file") {
  const ext = path.extname(originalName || "").toLowerCase().slice(0, 12).replace(/[^.a-z0-9]/g, "");
  const id = crypto.randomBytes(8).toString("hex");
  return `${prefix}-${Date.now()}-${id}${ext}`;
}

/** Public URL for a stored object key. */
export function urlFor(key) {
  return `${PUBLIC_BASE}/${key}`;
}

/** Absolute filesystem path for a stored object key. */
export function pathFor(key) {
  return path.join(STORAGE_ROOT, path.basename(key));
}

/** Best-effort delete of a previously stored object (accepts a key or a public URL). */
export function remove(urlOrKey) {
  if (!urlOrKey) return;
  const key = urlOrKey.startsWith(PUBLIC_BASE) ? urlOrKey.slice(PUBLIC_BASE.length + 1) : urlOrKey;
  fs.promises.unlink(pathFor(key)).catch(() => {});
}
