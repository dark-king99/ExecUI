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
import integrationRoutes from "../modules/integrations/integrations.routes.js";
import attachmentRoutes  from "../modules/attachments/attachments.routes.js";
import messagingRoutes  from "../modules/messaging/messaging.routes.js";
import notificationRoutes from "../modules/notifications/notifications.routes.js";
import emailRoutes      from "../modules/email/email.routes.js";
import rewardsRoutes    from "../modules/rewards/rewards.routes.js";
import reportsRoutes    from "../modules/reports/reports.routes.js";
import developerRoutes  from "../modules/api/developer.routes.js";
import workflowRoutes   from "../modules/workflows/workflows.routes.js";
import approvalRoutes   from "../modules/approvals/approvals.routes.js";
import governanceRoutes from "../modules/governance/governance.routes.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireModule } from "../middleware/access.middleware.js";
import { rewardTracking } from "../middleware/rewardTracking.middleware.js";

const router = express.Router();

router.get("/health", (_req, res) => res.json({ status: "ok" }));

// Turn successful workspace mutations into reward points (best-effort, on
// response finish — see the middleware). Must run before the route handlers so
// it can observe their outcome.
router.use(rewardTracking);

router.use("/auth",       authRoutes);
router.use("/users",      userRoutes);
router.use("/roles",      roleRoutes);
router.use("/overview",   overviewRoutes);
router.use("/messaging",  messagingRoutes);
router.use("/notifications", notificationRoutes);
router.use("/email",      emailRoutes);
// Outbound integration secret store (ExecUI -> external services), admin-managed.
router.use("/integrations", integrationRoutes);
router.use("/attachments", attachmentRoutes);

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
router.use("/rewards",    rewardsRoutes);
router.use("/reports",    reportsRoutes);
router.use("/developer",  developerRoutes);
router.use("/workflows",  workflowRoutes);
router.use("/approvals",  approvalRoutes);
router.use("/governance", governanceRoutes);

export default router;
