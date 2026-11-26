import prisma from "../../config/database.js";
import bcrypt from "bcrypt";
import { startSignup, resendCode, verifySignup } from "./signup.service.js";
import jwt from "jsonwebtoken";

const signToken = (user, roleName) =>
  jwt.sign(
    { userId: user.id, tenantId: user.tenantId, role: roleName, department: user.department ?? null },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || "1d" }
  );

// ── Register a new enterprise (first account = the organization) ───────────────
// Two steps: POST /auth/signup emails a code (nothing is created yet), then
// POST /auth/signup/verify with that code creates the enterprise and signs in.
export const registerEnterprise = async (req, res) => {
  try {
    res.status(202).json(await startSignup(req.body ?? {}, { ip: req.ip }));
  } catch (error) {
    res.status(error.status ?? 500).json({ message: error.message });
  }
};

export const resendSignupCode = async (req, res) => {
  try {
    res.json(await resendCode(req.body?.email));
  } catch (error) {
    res.status(error.status ?? 500).json({ message: error.message });
  }
};

export const verifyEnterpriseSignup = async (req, res) => {
  try {
    const result = await verifySignup(req.body ?? {});
    const token = signToken(result.adminUser, "enterprise_admin");
    res.status(201).json({
      token,
      enterpriseCode: result.tenant.code,
      user: {
        id:         result.adminUser.id,
        email:      result.adminUser.email,
        firstName:  result.adminUser.firstName,
        lastName:   result.adminUser.lastName,
        employeeId: result.adminUser.employeeId,
        tenantId:   result.adminUser.tenantId,
        enterprise: result.tenant.name,
        enterpriseCode: result.tenant.code,
        trialEndsAt: result.tenant.trialEndsAt,
        emailVerified: true,
        role:       "enterprise_admin"
      }
    });
  } catch (error) {
    if (error.message?.includes("already exists")) {
      return res.status(409).json({ message: "An account with that email already exists." });
    }
    res.status(error.status ?? 500).json({ message: error.message });
  }
};

// ── Employee activation ("join enterprise") ───────────────────────────────────
// An enterprise admin pre-provisions the employee (email + employee ID, no
// password, status "invited"). The employee completes signup here by setting a
// password against their enterprise code + employee ID + email.
export const employeeSignup = async (req, res) => {
  try {
    const { enterpriseCode, employeeId, email, password } = req.body;

    if (!enterpriseCode || !employeeId || !email || !password) {
      return res.status(400).json({
        message: "Enterprise code, employee ID, email and password are required"
      });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { code: enterpriseCode.trim().toUpperCase() }
    });
    if (!tenant) {
      return res.status(404).json({ message: "No enterprise found for that code." });
    }

    const user = await prisma.user.findFirst({
      where: { tenantId: tenant.id, employeeId: employeeId.trim() },
      include: { role: true },
    });

    if (!user || user.email.toLowerCase() !== email.trim().toLowerCase()) {
      return res.status(404).json({
        message: "No matching invitation. Check your employee ID and email, or ask your admin to add you."
      });
    }
    if (user.passwordHash || user.status === "active") {
      return res.status(409).json({
        message: "This account is already active. Please sign in instead."
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, status: "active", isActive: true },
      include: { role: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: updated.id,
        tenantId: tenant.id,
        action: "activate_account",
        resource: "auth",
        detail: `Employee ${updated.employeeId} completed signup`,
      },
    }).catch(() => {});

    const roleName = updated.role?.name ?? "employee";
    const token = signToken(updated, roleName);

    res.status(201).json({
      token,
      user: {
        id:         updated.id,
        email:      updated.email,
        firstName:  updated.firstName,
        lastName:   updated.lastName,
        employeeId: updated.employeeId,
        tenantId:   updated.tenantId,
        enterprise: tenant.name,
        enterpriseCode: tenant.code,
        role:       roleName,
      }
    });

  } catch (error) {
    res.status(error.status ?? 500).json({ message: error.message });
  }
};
