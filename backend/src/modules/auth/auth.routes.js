import express from "express";
import { registerEnterprise, employeeSignup } from "./auth.controller.js";
import { login } from "./login.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import prisma from "../../config/database.js";

const router = express.Router();

// Register a new enterprise tenant + admin user
router.post("/register-enterprise", registerEnterprise);

// Alias so frontend /auth/signup works
router.post("/signup", registerEnterprise);

// Employee completes signup ("join enterprise") against an admin-issued ID
router.post("/employee-signup", employeeSignup);

// Login → returns { token, user }
router.post("/login", login);

// Logout – stateless JWT; client drops the token
router.post("/logout", (_req, res) => {
  res.json({ message: "Logged out" });
});

// Return a fresh copy of the same token (extend session)
router.post("/refresh", authenticate, (req, res) => {
  const token = req.headers.authorization?.split(" ")[1] ?? "";
  res.json({ token });
});

// Return the authenticated user's profile
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { role: true, tenant: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      employeeId: user.employeeId,
      status: user.status,
      tenantId: user.tenantId,
      enterprise: user.tenant.name,
      enterpriseCode: user.tenant.code,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        code: user.tenant.code,
      },
      role: user.role?.name ?? null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
