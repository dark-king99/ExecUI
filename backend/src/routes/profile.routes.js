import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.get(
  "/profile",
  authenticate,
  requirePermission("profile.read"),
  (req, res) => {
    res.json({
      message: "Authenticated",
      user: req.user
    });
  }
);

export default router;