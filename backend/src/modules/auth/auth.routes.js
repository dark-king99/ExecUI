import express from "express";
import { registerEnterprise, employeeSignup } from "./auth.controller.js";
import { login } from "./login.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { authRateLimit, rateLimit } from "../../middleware/ratelimit.middleware.js";
import { loginSchema, enterpriseSignupSchema, employeeSignupSchema } from "./auth.schema.js";
import ssoRoutes from "../sso/sso.routes.js";
import prisma from "../../config/database.js";

const router = express.Router();

// Enterprise Single Sign-On (OIDC + SAML). Public login endpoints plus the
// admin configuration API — see sso.routes.js.
router.use("/sso", ssoRoutes);

// Signups are rarer than logins — a small per-IP budget stops mass account
// creation without bothering a real admin onboarding a company.
const signupLimit = rateLimit({ windowMs: 60_000, max: 5 });

// Register a new enterprise tenant + admin user
router.post("/register-enterprise", signupLimit, validate(enterpriseSignupSchema), registerEnterprise);

// Alias so frontend /auth/signup works
router.post("/signup", signupLimit, validate(enterpriseSignupSchema), registerEnterprise);

// Employee completes signup ("join enterprise") against an admin-issued ID
router.post("/employee-signup", signupLimit, validate(employeeSignupSchema), employeeSignup);

// Login → returns { token, user }. Rate-limited per IP+email against
// brute-force; shape-validated so bad payloads get a clear 400.
router.post("/login", authRateLimit, validate(loginSchema), login);

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
      department: user.department ?? null,
      jobTitle: user.jobTitle ?? null,
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
      avatarUrl: user.avatarUrl ?? null,
      plan: user.tenant?.plan ?? "executive",
      planSolutions: user.tenant?.planSolutions ?? [],
      trialEndsAt: user.tenant?.trialEndsAt ?? null,
    });
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
});

export default router;
