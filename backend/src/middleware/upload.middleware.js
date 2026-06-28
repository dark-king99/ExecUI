import multer from "multer";
import { STORAGE_ROOT, objectKey } from "../lib/storage.js";

// Stream uploads straight to the object store (disk) — never into the DB.
const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, STORAGE_ROOT),
  filename: (req, file, cb) => cb(null, objectKey(file.originalname, req._uploadPrefix || "file")),
});

const withPrefix = (prefix) => (req, _res, next) => { req._uploadPrefix = prefix; next(); };

export const uploadImage = [
  withPrefix("avatar"),
  multer({
    storage: diskStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (_req, file, cb) =>
      file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Only image files are allowed")),
  }).single("avatar"),
];

// General-purpose upload (images, documents, video) up to 100 MB.
export const uploadFile = [
  withPrefix("upload"),
  multer({ storage: diskStorage, limits: { fileSize: 100 * 1024 * 1024 } }).single("file"),
];
