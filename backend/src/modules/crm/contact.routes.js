import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { listContacts, createContact } from "./contact.controller.js";

const router = express.Router();

router.get(
  "/contacts",
  authenticate,
  requirePermission("crm.contact.read"),
  listContacts
);

router.post(
  "/contacts",
  authenticate,
  requirePermission("crm.contact.write"),
  createContact
);

export default router;