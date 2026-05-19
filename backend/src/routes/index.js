import express from "express";

import authRoutes       from "../modules/auth/auth.routes.js";
import userRoutes       from "../modules/users/users.routes.js";
import roleRoutes       from "../modules/role/role.routes.js";
import crmRoutes        from "../modules/crm/crm.routes.js";
import contactRoutes    from "../modules/crm/contact.routes.js";
import marketingRoutes  from "../modules/marketing/marketing.routes.js";
import networkRoutes    from "../modules/network/network.routes.js";
import analyticsRoutes  from "../modules/analytics/analytics.routes.js";
import accountRoutes    from "../modules/account/account.routes.js";
import assistantRoutes  from "../modules/assistant/assistant.routes.js";
import servicesRoutes   from "../modules/services/services.routes.js";
import viewsRoutes      from "../modules/views/views.routes.js";

const router = express.Router();

router.get("/health", (_req, res) => res.json({ status: "ok" }));

router.use("/auth",       authRoutes);
router.use("/users",      userRoutes);
router.use("/roles",      roleRoutes);
router.use("/crm",        contactRoutes);
router.use("/crm",        crmRoutes);
router.use("/marketing",  marketingRoutes);
router.use("/network",    networkRoutes);
router.use("/analytics",  analyticsRoutes);
router.use("/account",    accountRoutes);
router.use("/assistant",  assistantRoutes);
router.use("/services",   servicesRoutes);
router.use("/views",      viewsRoutes);

export default router;
