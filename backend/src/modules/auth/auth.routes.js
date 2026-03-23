import express from "express";
import { registerEnterprise } from "./auth.controller.js";
import { login } from "./login.controller.js";

const router = express.Router();

router.post("/register-enterprise", registerEnterprise);
router.post("/login", login);

export default router;