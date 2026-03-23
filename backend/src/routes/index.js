import express from "express";

import authRoutes from "../modules/auth/auth.routes.js";
import profileRoutes from "./profile.routes.js";
import userRoutes from "../modules/users/users.routes.js";
import roleRoutes from "../modules/role/role.routes.js";
import contactRoutes from "../modules/crm/contact.routes.js";
import crmRoutes from "../modules/crm/crm.routes.js";
import networkRoutes from "../modules/network/network.routes.js";
import viewRoutes from "../modules/views/views.routes.js";
import marketingRoutes from "../modules/marketing/marketing.routes.js";

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/users", userRoutes);
router.use("/roles", roleRoutes);
router.use("/crm", contactRoutes);
router.use("/crm", crmRoutes);
router.use("/network", networkRoutes);
router.use("/views", viewRoutes);
router.use("/marketing", marketingRoutes);

export default router;