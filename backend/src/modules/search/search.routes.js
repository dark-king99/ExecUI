/**
 * Global search — mounted at /api/search.
 *
 * `attachAccess` resolves the caller's department + plan sections before the
 * handler runs, and the service queries only the sources that descriptor allows.
 * Search therefore can't become a side door around the module guards: the same
 * descriptor that hides a section in the sidebar stops it being searched.
 */
import express from "express";
import rateLimit from "express-rate-limit";
import { ipKeyGenerator } from "express-rate-limit";
import { authenticate } from "../../middleware/auth.middleware.js";
import { attachAccess } from "../../middleware/access.middleware.js";
import * as svc from "./search.service.js";

const router = express.Router();

// Type-ahead fires on keystrokes, so it gets a limit of its own — generous for a
// person, tight enough that it can't be used to enumerate the database.
const searchLimit = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.SEARCH_RATE_LIMIT_PER_MIN) || 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || ipKeyGenerator(req.ip),
  message: { message: "Slow down a moment — too many searches." },
});

const access = (req) => ({ sections: req.access?.sections ?? [], isAdmin: ["enterprise_admin", "system_admin"].includes(req.user?.role) });

const handle = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (err) { res.status(err.status ?? 500).json({ message: err.message }); }
};

router.use(authenticate, attachAccess, searchLimit);

router.get("/catalog", handle((req) => svc.catalog(access(req))));

router.get("/", handle((req) => svc.search(req.query.q, access(req), {
  sources: req.query.sources ? String(req.query.sources).split(",").filter(Boolean) : undefined,
  limit: req.query.limit,
})));

router.get("/suggest", handle((req) => svc.suggest(req.query.q, access(req), { limit: req.query.limit })));

export default router;
