import { STORAGE_ROOT, objectKey } from "../lib/storage.js";

// Multer is treated as an OPTIONAL dependency. If it isn't installed yet
// (e.g. `npm install` hasn't been run after pulling new code), the server still
// boots and only file uploads are disabled — instead of crashing the whole API
// on startup with ERR_MODULE_NOT_FOUND.
let multer = null;
try {
  ({ default: multer } = await import("multer"));
} catch {
  console.warn("⚠️  'multer' is not installed — file uploads are disabled. Run `npm install` in backend/ to enable them.");
}

const unavailable = (_req, res) =>
  res.status(503).json({
    message: "File uploads are unavailable on this server (missing 'multer'). Run `npm install` in the backend, then restart.",
    code: "UPLOADS_DISABLED",
  });

const withPrefix = (prefix) => (req, _res, next) => { req._uploadPrefix = prefix; next(); };

function uploader(prefix, field, limits, fileFilter) {
  if (!multer) return [unavailable];
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, STORAGE_ROOT),
    filename: (req, file, cb) => cb(null, objectKey(file.originalname, req._uploadPrefix || "file")),
  });
  return [withPrefix(prefix), multer({ storage, limits, fileFilter }).single(field)];
}

// Avatars / images, up to 5 MB.
export const uploadImage = uploader(
  "avatar", "avatar",
  { fileSize: 5 * 1024 * 1024 },
  (_req, file, cb) => (file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Only image files are allowed"))),
);

// General-purpose uploads (documents, video), up to 100 MB.
export const uploadFile = uploader("upload", "file", { fileSize: 100 * 1024 * 1024 }, undefined);
