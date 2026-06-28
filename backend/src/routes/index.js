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
import overviewRoutes   from "../modules/overview/overview.routes.js";
import integrationRoutes from "../modules/integration/integration.routes.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireModule } from "../middleware/access.middleware.js";

const router = express.Router();

router.get("/health", (_req, res) => res.json({ status: "ok" }));

// External integration API — authenticated by API key (not JWT/session).
router.use("/v1",         integrationRoutes);

router.use("/auth",       authRoutes);
router.use("/users",      userRoutes);
router.use("/roles",      roleRoutes);
router.use("/overview",   overviewRoutes);

// ── Department-gated core modules ───────────────────────────────────────────
// authenticate first so requireModule can read the caller's department.
router.use("/crm",        authenticate, requireModule("crm"),       contactRoutes);
router.use("/crm",        authenticate, requireModule("crm"),       crmRoutes);
router.use("/marketing",  authenticate, requireModule("marketing"), marketingRoutes);
router.use("/network",    authenticate, requireModule("network"),   networkRoutes);
router.use("/analytics",  authenticate, requireModule("analytics"), analyticsRoutes);
router.use("/services",   authenticate, requireModule("services"),  servicesRoutes);

router.use("/account",    accountRoutes);
router.use("/assistant",  assistantRoutes);
router.use("/views",      viewsRoutes);

export default router;
