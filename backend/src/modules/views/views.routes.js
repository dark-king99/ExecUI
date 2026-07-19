import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import * as c from "./views.controller.js";

const router = express.Router();

router.get("/home",      authenticate, c.getHomeView);
router.get("/account",   authenticate, c.getAccountView);
router.get("/analytics", authenticate, c.getAnalyticsView);
router.get("/crm",       authenticate, c.getCrmView);
router.get("/marketing", authenticate, c.getMarketingView);
router.get("/network",   authenticate, c.getNetworkView);

export default router;
