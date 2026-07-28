import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import * as c from "./rewards.controller.js";

const router = express.Router();

// The reward system is available to every authenticated employee — the
// leaderboard and colleague profiles are an org-wide, transparent view.
router.get("/config", authenticate, c.getConfig);
router.get("/leaderboard", authenticate, c.getLeaderboard);
router.get("/me", authenticate, c.getMe);
router.get("/user/:id", authenticate, c.getUser);
router.post("/track", authenticate, c.track);

export default router;
