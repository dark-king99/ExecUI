import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import * as c from "./overview.controller.js";

const router = express.Router();

// Executive Overview is the entry to the main system — available to every
// authenticated employee; the payload itself is department-scoped.
router.get("/dashboard",    authenticate, c.getDashboard);
router.get("/departments",  authenticate, c.listDepartments);
router.post("/messages",    authenticate, c.postMessage);

export default router;
