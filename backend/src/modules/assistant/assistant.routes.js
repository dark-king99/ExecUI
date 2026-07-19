import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import * as c from "./assistant.controller.js";

const router = express.Router();

router.post("/chat", authenticate, c.chat);

export default router;
