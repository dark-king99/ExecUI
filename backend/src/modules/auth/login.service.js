import prisma from "../../config/database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function loginUser({ email, password, employeeId }, meta = {}) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { tenant: true, role: true },
  });

  // Generic message so we never reveal which credential was wrong.
  const invalid = () => new Error("Invalid credentials");

  if (!user) throw invalid();

  // Account provisioned by an admin but the employee hasn't set a password yet.
  if (!user.passwordHash || user.status === "invited") {
    throw new Error("Account not activated yet. Complete sign-up with your enterprise code first.");
  }

  if (!user.isActive) throw new Error("Account is suspended. Contact your administrator.");

  // Every account signs in with email + password + employee ID code.
  if (!employeeId || (user.employeeId ?? "").trim() !== String(employeeId).trim()) {
    throw invalid();
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw invalid();

  const token = jwt.sign(
    { userId: user.id, tenantId: user.tenantId, role: user.role.name, department: user.department ?? null },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || "1d" }
  );

  // Record session and update lastLoginAt in parallel
  await Promise.all([
    prisma.userSession.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
        isActive: true,
      },
    }),
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
