/**
 * Organization-level administration: per-tenant settings, and deleting the
 * organization itself.
 *
 * Everything here is enterprise-admin only, and the destructive half is
 * deliberately *not* a single endpoint. `POST /deletion` only schedules; nothing
 * on this router destroys data. The purge is reachable only from the scheduler,
 * once the grace window has elapsed — so no request, replayed or forged, can
 * skip the window.
 */
import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import { rateLimit } from "../../middleware/ratelimit.middleware.js";
import { uploadImage } from "../../middleware/upload.middleware.js";
import * as storage from "../../lib/storage.js";
import * as tenants from "./tenants.service.js";
import * as settings from "../settings/settings.service.js";

const router = express.Router();
const admin = [authenticate, requireRole("enterprise_admin", "system_admin")];

const tid = (req) => req.user.tenantId;
const handle = (fn, status = 200) => async (req, res) => {
  try { res.status(status).json(await fn(req)); }
  catch (e) { res.status(e.status ?? 500).json({ message: e.message }); }
};

// ── Settings ─────────────────────────────────────────────────────────────────
router.get("/settings", ...admin, handle((req) => settings.describeSettings(tid(req))));
router.put("/settings", ...admin, handle((req) => settings.updateSettings(tid(req), req.user.userId, req.body ?? {})));

// Branding is read by ordinary employees too — the app shell renders it — so it
// only requires a session, not an admin role.
router.get("/branding", authenticate, handle((req) => settings.brandingFor(tid(req))));

/**
 * Logo upload. Deliberately its own endpoint rather than reusing the avatar
 * uploader: that one writes `user.avatarUrl` as a side effect, so uploading a
 * company logo through it would silently replace the admin's own profile
 * picture. It stores the object and returns the URL; nothing is applied until
 * the admin saves `branding.logoUrl`.
 */
router.post("/branding/logo", ...admin, ...uploadImage, (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No image uploaded" });
  res.json({ url: storage.urlFor(req.file.filename) });
});

// ── Deletion ─────────────────────────────────────────────────────────────────
router.get("/deletion", ...admin, handle((req) => tenants.deletionStatus(tid(req))));
router.get("/deletion/preview", ...admin, handle((req) => tenants.previewDeletion(tid(req))));

// The pre-deletion copy of the org's data. Rate-limited because it reads the
// whole dataset.
router.get("/deletion/export", ...admin, rateLimit({ windowMs: 300_000, max: 3 }), async (req, res) => {
  try {
    const bundle = await tenants.exportOrganization(tid(req));
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${bundle.organization.slug}-export-${stamp}.json"`);
    res.send(JSON.stringify(bundle, null, 2));
  } catch (e) {
    res.status(e.status ?? 500).json({ message: e.message });
  }
});

router.post("/deletion", ...admin, rateLimit({ windowMs: 3_600_000, max: 5 }),
  handle((req) => tenants.requestDeletion(tid(req), req.user.userId, req.body ?? {})));

router.delete("/deletion", ...admin,
  handle((req) => tenants.cancelDeletion(tid(req), req.user.userId)));

export default router;
