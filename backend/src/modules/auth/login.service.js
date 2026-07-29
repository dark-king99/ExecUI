import prisma from "../../config/database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { verifyTotp } from "../../lib/totp.js";
import { isSsoEnforced } from "../sso/sso.service.js";

export async function loginUser({ email, password, employeeId, mfaCode }, meta = {}) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { tenant: true, role: true },
  });

  // Generic message so we never reveal which credential was wrong.
  const invalid = () => new Error("Invalid credentials");

  if (!user) throw invalid();

  if (!user.isActive) throw new Error("Account is suspended. Contact your administrator.");

  // SSO enforced ⇒ employees must come through the IdP. Checked before the
  // password checks so an SSO-provisioned account (which has no password by
  // design) gets the actionable message rather than "complete sign-up first".
  // Admins deliberately keep the password path, so a misconfigured IdP can
  // never lock the whole organization out.
  const isOrgAdmin = ["enterprise_admin", "system_admin"].includes(user.role?.name);
  if (!isOrgAdmin && (await isSsoEnforced(user.tenantId))) {
    throw new Error("Your organization requires Single Sign-On. Please use the “Sign in with SSO” option.");
  }

  // Account provisioned by an admin but the employee hasn't set a password yet.
  if (!user.passwordHash || user.status === "invited") {
    throw new Error("Account not activated yet. Complete sign-up with your enterprise code first.");
  }

  // Every account signs in with email + password + employee ID code.
  if (!employeeId || (user.employeeId ?? "").trim() !== String(employeeId).trim()) {
    throw invalid();
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw invalid();

  // Two-factor: after the password checks out, require a TOTP code.
  if (user.mfaEnabled) {
    if (!mfaCode) return { mfaRequired: true };
    if (!verifyTotp(user.mfaSecret, mfaCode)) {
      throw new Error("Invalid two-factor code");
    }
  }

  // Create the session first so its id can ride inside the JWT — this lets the
  // Security page mark "current" and revoke the others.
  const session = await prisma.userSession.create({
    data: {
      userId: user.id,
      tenantId: user.tenantId,
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
      isActive: true,
    },
  });

  const token = jwt.sign(
    {
      userId: user.id, tenantId: user.tenantId, role: user.role.name,
      department: user.department ?? null, sessionId: session.id,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || "1d" }
  );

  await Promise.all([
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        action: "login",
        resource: "auth",
        detail: `Login from ${meta.ipAddress ?? "unknown"}`,
        ipAddress: meta.ipAddress ?? null,
      },
    }),
  ]);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      employeeId: user.employeeId,
      tenantId: user.tenantId,
      enterprise: user.tenant?.name ?? null,
      enterpriseCode: user.tenant?.code ?? null,
      role: user.role.name,
      department: user.department ?? null,
      avatarUrl: user.avatarUrl ?? null,
      plan: user.tenant?.plan ?? "executive",
      planSolutions: user.tenant?.planSolutions ?? [],
    },
  };
}
