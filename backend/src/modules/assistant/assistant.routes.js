import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { attachAccess } from "../../middleware/access.middleware.js";
import { rateLimit } from "../../middleware/ratelimit.middleware.js";
import * as c from "./assistant.controller.js";

const router = express.Router();

router.post("/chat", authenticate, attachAccess, rateLimit({ windowMs: 60_000, max: 20 }), c.chat);
router.post("/chat/stream", authenticate, attachAccess, rateLimit({ windowMs: 60_000, max: 20 }), c.streamChat);
router.get("/runs", authenticate, rateLimit({ windowMs: 60_000, max: 60 }), c.listRuns);
router.get("/runs/:runId", authenticate, rateLimit({ windowMs: 60_000, max: 60 }), c.getRun);

export default router;
