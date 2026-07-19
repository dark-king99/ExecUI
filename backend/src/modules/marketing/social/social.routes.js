/**
 * Social marketing routes — additive, mounted at /api/marketing/social.
 * Core marketing routes are untouched.
 */
import express from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import * as svc from "./social.service.js";

const router = express.Router();
const tid = (req) => req.user.tenantId;
const handle = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (err) { res.status(err.status ?? 400).json({ message: err.message, code: err.code }); }
};

// Platform catalog + connected accounts
router.get("/platforms",        authenticate, handle(() => ({ platforms: svc.platforms() })));
router.get("/accounts",         authenticate, handle((req) => svc.listAccounts(tid(req))));
router.post("/accounts",        authenticate, handle((req) => svc.connectAccount(tid(req), req.user.userId, req.body)));
router.delete("/accounts/:id",  authenticate, handle((req) => svc.disconnectAccount(tid(req), req.params.id)));

// Posts / publishing queue
router.get("/posts",            authenticate, handle((req) => svc.listPosts(tid(req), req.query)));
router.post("/posts",           authenticate, handle((req) => svc.createPost(tid(req), req.user, req.body)));
router.patch("/posts/:id",      authenticate, handle((req) => svc.updatePost(tid(req), req.params.id, req.body)));
router.delete("/posts/:id",     authenticate, handle((req) => svc.deletePost(tid(req), req.params.id)));
router.post("/posts/:id/publish", authenticate, handle((req) => svc.publishPost(tid(req), req.params.id)));

// AI caption helper + analytics
router.post("/improve",         authenticate, handle((req) => svc.improveCaption(tid(req), req.body)));
router.get("/analytics",        authenticate, handle((req) => svc.analytics(tid(req))));

export default router;
