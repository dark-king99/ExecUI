import prisma from "../../config/database.js";
import bcrypt from "bcrypt";
import { sendEmail } from "../../lib/email.js";

const handle = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (err) { res.status(500).json({ error: err.message }); }
};

const tid = (req) => req.user.tenantId;

const userShape = (u) => ({
  id:          u.id,
  email:       u.email,
  employeeId:  u.employeeId,
  status:      u.status,
  firstName:   u.firstName,
  lastName:    u.lastName,
  fullName:    `${u.firstName} ${u.lastName}`,
  avatarUrl:   u.avatarUrl,
  department:  u.department,
  jobTitle:    u.jobTitle,
  phone:       u.phone,
  isActive:    u.isActive,
  lastLoginAt: u.lastLoginAt,
  createdAt:   u.createdAt,
  updatedAt:   u.updatedAt,
  role:        u.role ? { id: u.role.id, name: u.role.name } : null,
  tenantId:    u.tenantId,
});

// ── List users ────────────────────────────────────────────────────────────────
export const listUsers = handle(async (req) => {
  const users = await prisma.user.findMany({
    where: { tenantId: tid(req) },
    include: { role: true },
    orderBy: { createdAt: "desc" },
  });
  return users.map(userShape);
});

// ── Get single user ───────────────────────────────────────────────────────────
export const getUser = handle(async (req) => {
  const user = await prisma.user.findFirst({
    where: { id: req.params.id, tenantId: tid(req) },
    include: { role: true, sessions: { orderBy: { startedAt: "desc" }, take: 10 } },
  });
  if (!user) throw new Error("User not found");
  return { ...userShape(user), sessions: user.sessions };
});

// ── List roles (for invite dropdown) ─────────────────────────────────────────
export const listRoles = handle(async (req) => {
  const roles = await prisma.role.findMany({
    where: { tenantId: tid(req) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return roles;
});

// ── Invite / create user ──────────────────────────────────────────────────────
// Next sequential employee ID code for a tenant (EMP-0001, EMP-0002, …)
async function nextEmployeeId(tenantId) {
  const users = await prisma.user.findMany({
    where: { tenantId, employeeId: { startsWith: "EMP-" } },
    select: { employeeId: true },
  });
  const max = users.reduce((m, u) => {
    const n = parseInt((u.employeeId ?? "").replace("EMP-", ""), 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `EMP-${String(max + 1).padStart(4, "0")}`;
}

// ── Provision an employee ─────────────────────────────────────────────────────
// The admin issues the employee ID; the account is created in "invited" status
// with no password. The employee completes signup via /auth/employee-signup.
export const inviteUser = handle(async (req) => {
  const { email, firstName, lastName, employeeId: rawEmployeeId, roleId: rawRoleId, role: roleName, department, jobTitle, phone } = req.body;

  if (!email || !firstName || !lastName) {
    throw new Error("Email, first name and last name are required");
  }

  // Resolve roleId — accept UUID directly or fall back to name lookup → default
  let resolvedRoleId = rawRoleId && rawRoleId.length === 36 ? rawRoleId : null;
  if (!resolvedRoleId && roleName) {
    const found = await prisma.role.findFirst({ where: { tenantId: tid(req), name: roleName } });
    resolvedRoleId = found?.id ?? null;
  }
  if (!resolvedRoleId) {
    const fallback = await prisma.role.findFirst({
      where: { tenantId: tid(req), NOT: { name: "enterprise_admin" } },
      orderBy: { name: "asc" },
    });
    resolvedRoleId = fallback?.id;
  }
  if (!resolvedRoleId) throw new Error("No valid role found for this tenant");

  // Employee ID code — admin-issued, unique within the enterprise. Auto-assign if omitted.
  const employeeId = (rawEmployeeId && String(rawEmployeeId).trim()) || (await nextEmployeeId(tid(req)));
  const dupe = await prisma.user.findFirst({ where: { tenantId: tid(req), employeeId } });
  if (dupe) throw new Error(`Employee ID "${employeeId}" is already in use.`);

  const user = await prisma.user.create({
    // No password yet — the employee sets it when they complete signup.
    data: {
      email, firstName, lastName, employeeId,
      status: "invited", isActive: true,
      roleId: resolvedRoleId, tenantId: tid(req), department, jobTitle, phone,
    },
    include: { role: true },
  });
  await prisma.auditLog.create({
    data: { userId: req.user.userId, tenantId: tid(req), action: "create_user", resource: "user", resourceId: user.id, detail: `Provisioned employee ${employeeId} (${email})` },
  });

  // Send the invite email via Resend (no-op/skip if email isn't configured).
  const tenant = await prisma.tenant.findUnique({ where: { id: tid(req) }, select: { name: true, code: true } });
  sendEmail({
    tenantId: tid(req), userId: req.user.userId, to: email, context: "auth:invite",
    subject: `You've been invited to ${tenant?.name ?? "your enterprise"} on ExecUI`,
    html: `<div style="font-family:system-ui,sans-serif;line-height:1.6">
      <h2>Welcome to ${tenant?.name ?? "ExecUI"} 👋</h2>
      <p>Hi ${firstName}, an admin has created your account. Complete sign-up with:</p>
      <ul>
        <li><b>Enterprise code:</b> ${tenant?.code ?? "(ask your admin)"}</li>
        <li><b>Employee ID:</b> ${employeeId}</li>
        <li><b>Email:</b> ${email}</li>
      </ul>
      <p>Choose “Join Enterprise” on the sign-in screen, enter these, and set your password.</p>
    </div>`,
  }).catch(() => {});

  return userShape(user);
});

// ── Update user ───────────────────────────────────────────────────────────────
export const updateUser = handle(async (req) => {
  const { firstName, lastName, department, jobTitle, phone, roleId } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { firstName, lastName, department, jobTitle, phone, roleId, updatedAt: new Date() },
    include: { role: true },
  });
  await prisma.auditLog.create({
    data: { userId: req.user.userId, tenantId: tid(req), action: "update_user", resource: "user", resourceId: req.params.id },
  });
  return userShape(user);
});

// ── Suspend / activate user ───────────────────────────────────────────────────
export const toggleUserStatus = handle(async (req) => {
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, tenantId: tid(req) } });
  if (!existing) throw new Error("User not found");
  if (existing.id === req.user.userId) throw new Error("Cannot suspend your own account");
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: !existing.isActive, updatedAt: new Date() },
    include: { role: true },
  });
  // End all active sessions when suspending
  if (!user.isActive) {
    await prisma.userSession.updateMany({
      where: { userId: req.params.id, isActive: true },
      data: { isActive: false, endedAt: new Date() },
    });
  }
  await prisma.auditLog.create({
    data: { userId: req.user.userId, tenantId: tid(req), action: user.isActive ? "activate_user" : "suspend_user", resource: "user", resourceId: req.params.id, detail: `${user.isActive ? "Activated" : "Suspended"} user ${user.email}` },
  });
  return userShape(user);
});

// ── Delete user ───────────────────────────────────────────────────────────────
export const deleteUser = handle(async (req) => {
  if (req.params.id === req.user.userId) throw new Error("Cannot delete your own account");
  const user = await prisma.user.findFirst({ where: { id: req.params.id, tenantId: tid(req) } });
  if (!user) throw new Error("User not found");
  await prisma.user.delete({ where: { id: req.params.id } });
  await prisma.auditLog.create({
    data: { userId: req.user.userId, tenantId: tid(req), action: "delete_user", resource: "user", resourceId: req.params.id, detail: `Deleted user ${user.email}` },
  });
  return { success: true };
});

// ── Sessions ──────────────────────────────────────────────────────────────────
export const listSessions = handle(async (req) => {
  const sessions = await prisma.userSession.findMany({
    where: { tenantId: tid(req) },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    orderBy: { startedAt: "desc" },
    take: 200,
  });
  return sessions.map((s) => ({
    id: s.id,
    userId: s.userId,
    userName: `${s.user.firstName} ${s.user.lastName}`,
    userEmail: s.user.email,
    ipAddress: s.ipAddress,
    userAgent: s.userAgent,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    isActive: s.isActive,
  }));
});

// ── Audit logs ────────────────────────────────────────────────────────────────
export const listAuditLogs = handle(async (req) => {
  const { limit = 100, userId } = req.query;
  const logs = await prisma.auditLog.findMany({
    where: { tenantId: tid(req), ...(userId ? { userId } : {}) },
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: Number(limit),
  });
  return logs.map((l) => ({
    id: l.id,
    userId: l.userId,
    userName: `${l.user.firstName} ${l.user.lastName}`,
    userEmail: l.user.email,
    action: l.action,
    resource: l.resource,
    resourceId: l.resourceId,
    detail: l.detail,
    ipAddress: l.ipAddress,
    createdAt: l.createdAt,
  }));
});

// ── Workspace stats ───────────────────────────────────────────────────────────
export const getWorkspaceStats = handle(async (req) => {
  const tenantId = tid(req);
  const [totalUsers, activeUsers, activeSessions, todayLogins] = await Promise.all([
    prisma.user.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId, isActive: true } }),
    prisma.userSession.count({ where: { tenantId, isActive: true } }),
    prisma.auditLog.count({
      where: {
        tenantId,
        action: "login",
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);
  return { totalUsers, activeUsers, suspendedUsers: totalUsers - activeUsers, activeSessions, todayLogins };
});

// ── Organization (the enterprise account) — admin only ────────────────────────
export const getOrganization = handle(async (req) => {
  const tenantId = tid(req);
  const [tenant, totalMembers, activeMembers, invitedMembers, admins] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.user.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId, status: "active", isActive: true } }),
    prisma.user.count({ where: { tenantId, status: "invited" } }),
    prisma.user.count({ where: { tenantId, role: { name: "enterprise_admin" } } }),
  ]);
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    code: tenant.code,
    plan: tenant.stripePlanId ? "Active subscription" : "Free",
    createdAt: tenant.createdAt,
    members: { total: totalMembers, active: activeMembers, invited: invitedMembers, admins },
  };
});

export const updateOrganization = handle(async (req) => {
  const tenantId = tid(req);
  const { name } = req.body;
  if (!name || !name.trim()) throw new Error("Organization name is required");
  const tenant = await prisma.tenant.update({ where: { id: tenantId }, data: { name: name.trim() } });
  await prisma.auditLog.create({
    data: { userId: req.user.userId, tenantId, action: "update_organization", resource: "tenant", resourceId: tenantId, detail: `Renamed organization to ${tenant.name}` },
  });
  return { id: tenant.id, name: tenant.name, slug: tenant.slug, code: tenant.code };
});
