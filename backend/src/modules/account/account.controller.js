import bcrypt from "bcrypt";
import prisma from "../../config/database.js";
import * as billing from "./billing.service.js";
import * as refunds from "./refunds.service.js";
import * as storage from "../../lib/storage.js";
import { generateSecret, verifyTotp, otpauthUri } from "../../lib/totp.js";

const tid = (req) => req.user.tenantId;
const uid = (req) => req.user.userId;

const handle = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (err) { res.status(err.status ?? 500).json({ message: err.message }); }
};

// ── Profile ───────────────────────────────────────────────────────────────
export const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: uid(req) },
      include: { role: true, tenant: true },
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`.trim(),
      phone: user.phone ?? null,
      department: user.department ?? null,
      jobTitle: user.jobTitle ?? null,
      avatarUrl: user.avatarUrl ?? null,
      employeeId: user.employeeId ?? null,
      role: user.role?.name ?? null,
      tenantId: user.tenantId,
      tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug },
      createdAt: user.createdAt,
    });
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, firstName: fName, lastName: lName, phone, department, jobTitle, avatarUrl } = req.body;
    let firstName = fName;
    let lastName = lName;
    // The profile form edits a single "Full Name" field, so when it's provided
    // it is the source of truth (it ships alongside the now-stale first/last).
    if (name) {
      const parts = name.trim().split(/\s+/);
      firstName = parts[0] ?? '';
      lastName = parts.slice(1).join(' ');
    }
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName !== undefined && lastName !== null) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone || null;
    if (department !== undefined) updateData.department = department || null;
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle || null;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl || null;

    const user = await prisma.user.update({
      where: { id: uid(req) },
      data: updateData,
      include: { role: true, tenant: true },
    });
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`.trim(),
      phone: user.phone ?? null,
      department: user.department ?? null,
      jobTitle: user.jobTitle ?? null,
      avatarUrl: user.avatarUrl ?? null,
      employeeId: user.employeeId ?? null,
      role: user.role?.name ?? null,
      tenantId: user.tenantId,
      enterprise: user.tenant?.name ?? null,
      enterpriseCode: user.tenant?.code ?? null,
      tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug },
      createdAt: user.createdAt,
    });
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
};

export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No image uploaded" });
    const url = storage.urlFor(req.file.filename);
    const prev = await prisma.user.findUnique({ where: { id: uid(req) }, select: { avatarUrl: true } });
    await prisma.user.update({ where: { id: uid(req) }, data: { avatarUrl: url } });
    if (prev?.avatarUrl) storage.remove(prev.avatarUrl); // clean up the replaced object
    res.json({ avatarUrl: url });
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
};

// Clear the avatar (revert to initials) and remove the stored object.
export const removeAvatar = async (req, res) => {
  try {
    const prev = await prisma.user.findUnique({ where: { id: uid(req) }, select: { avatarUrl: true } });
    await prisma.user.update({ where: { id: uid(req) }, data: { avatarUrl: null } });
    if (prev?.avatarUrl) storage.remove(prev.avatarUrl);
    res.json({ avatarUrl: null });
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
};

// ── Security ──────────────────────────────────────────────────────────────
const audit = (req, action, detail) =>
  prisma.auditLog.create({
    data: { userId: uid(req), tenantId: tid(req), action, resource: "security", detail, ipAddress: req.ip ?? null },
  }).catch(() => {});

export const getSecurity = async (req, res) => {
  try {
    const [user, activeSessions] = await Promise.all([
      prisma.user.findUnique({ where: { id: uid(req) }, select: { mfaEnabled: true, passwordChangedAt: true } }),
      prisma.userSession.count({ where: { userId: uid(req), isActive: true } }),
    ]);
    res.json({
      mfa: { enabled: user?.mfaEnabled ?? false },
      mfaEnabled: user?.mfaEnabled ?? false,
      lastPasswordChange: user?.passwordChangedAt ?? null,
      activeSessions,
    });
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body ?? {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }
    const user = await prisma.user.findUnique({ where: { id: uid(req) } });
    const ok = user?.passwordHash && await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(400).json({ message: "Current password is incorrect" });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: uid(req) }, data: { passwordHash, passwordChangedAt: new Date() } });
    await audit(req, "password_change", "Password changed");
    res.json({ success: true });
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
};

// Start TOTP enrollment: issue a secret; MFA activates only after verifyMfa
// confirms the user's authenticator produces valid codes.
export const enableMfa = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: uid(req) }, select: { email: true, mfaEnabled: true } });
    if (user?.mfaEnabled) return res.status(400).json({ message: "Two-factor auth is already enabled" });
    const secret = generateSecret();
    await prisma.user.update({ where: { id: uid(req) }, data: { mfaSecret: secret, mfaEnabled: false } });
    res.json({ pending: true, secret, otpauthUri: otpauthUri(secret, { label: user?.email }) });
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
};

export const verifyMfa = async (req, res) => {
  try {
    const { code } = req.body ?? {};
    const user = await prisma.user.findUnique({ where: { id: uid(req) }, select: { mfaSecret: true } });
    if (!user?.mfaSecret) return res.status(400).json({ message: "Start 2FA enrollment first" });
    if (!verifyTotp(user.mfaSecret, code)) {
      return res.status(400).json({ message: "Invalid code — check your authenticator app" });
    }
    await prisma.user.update({ where: { id: uid(req) }, data: { mfaEnabled: true } });
    await audit(req, "mfa_enabled", "Two-factor authentication enabled");
    res.json({ verified: true, enabled: true });
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
};

export const disableMfa = async (req, res) => {
  try {
    await prisma.user.update({ where: { id: uid(req) }, data: { mfaEnabled: false, mfaSecret: null } });
    await audit(req, "mfa_disabled", "Two-factor authentication disabled");
    res.json({ disabled: true });
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
};

// Short human label from a raw user-agent string.
const deviceLabel = (ua = "") => {
  const browser =
    /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" :
    /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Unknown browser";
  const os =
    /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" :
    /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "Unknown OS";
  return `${browser} on ${os}`;
};

export const listSessions = async (req, res) => {
  try {
    const sessions = await prisma.userSession.findMany({
      where: { userId: uid(req), isActive: true },
      orderBy: { startedAt: "desc" },
      take: 20,
    });
    res.json(sessions.map((s) => ({
      id: s.id,
      device: deviceLabel(s.userAgent ?? ""),
      location: s.ipAddress ?? "Unknown IP",
      lastActive: new Date(s.startedAt).toLocaleString(),
      current: s.id === req.user.sessionId,
    })));
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
};

export const revokeSession = async (req, res) => {
  try {
    // Scoped to the caller: you can only revoke your own sessions.
    await prisma.userSession.updateMany({
      where: { id: req.params.id, userId: uid(req) },
      data: { isActive: false, endedAt: new Date() },
    });
    await audit(req, "session_revoked", `Session ${req.params.id} revoked`);
    res.status(204).end();
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
};

// ── Notifications ─────────────────────────────────────────────────────────
// Preferences are persisted per user (defaults apply until first save).
export const getNotificationPreferences = async (req, res) => {
  try {
    const pref = await prisma.notificationPref.findUnique({ where: { userId: uid(req) } });
    res.json(pref ?? { email: true, sms: false, inApp: true, digest: "daily" });
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
};

export const updateNotificationPreferences = async (req, res) => {
  try {
    const { email, sms, inApp, digest } = req.body ?? {};
    const data = {
      ...(typeof email === "boolean" ? { email } : {}),
      ...(typeof sms === "boolean" ? { sms } : {}),
      ...(typeof inApp === "boolean" ? { inApp } : {}),
      ...(["realtime", "daily", "weekly", "off"].includes(digest) ? { digest } : {}),
    };
    const pref = await prisma.notificationPref.upsert({
      where: { userId: uid(req) },
      create: { userId: uid(req), tenantId: tid(req), ...data },
      update: data,
    });
    res.json({ ...pref, updated: true });
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
};

// ── Team ──────────────────────────────────────────────────────────────────
export const listTeamMembers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { tenantId: tid(req) },
      include: { role: true },
    });
    res.json(
      users.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role?.name ?? null,
        status: u.isActive ? "active" : "inactive",
        lastLogin: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "—",
        createdAt: u.createdAt,
      }))
    );
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
};

// Invite/update/remove are handled by the real users-module implementations
// (see account.routes.js) — the old fake responses are gone.

export const listRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({ where: { tenantId: tid(req) } });
    res.json(roles);
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
};

// ── Billing ───────────────────────────────────────────────────────────────
export const getBilling        = handle((req) => billing.getBilling(tid(req)));
export const getPlans          = handle((req) => {
  const country = [req.get("x-vercel-ip-country"), req.get("cf-ipcountry"), req.get("cloudfront-viewer-country")]
    .find((value) => typeof value === "string" && /^[A-Za-z]{2}$/.test(value) && !["XX", "ZZ"].includes(value.toUpperCase()));
  return billing.getPlanCatalog(req.user.tenantId, country?.toUpperCase());
});
export const selectPlan        = handle((req) => billing.selectPlan(tid(req), req.body, uid(req)));
export const getInvoices       = handle((req) => billing.getInvoices(tid(req)));
export const getInvoicePdf    = handle((req) => billing.getInvoicePdf(tid(req), req.params.id));
export const getRefundCenter = handle((req) => refunds.getRefundCenter(tid(req), req.user.role === "system_admin"));
export const submitRefundRequest = handle((req) => refunds.submitRefundRequest(tid(req), uid(req), req.body));
export const updateRefundRequest = handle((req) => refunds.updateRefundRequest(req.params.id, uid(req), req.body));
// Offline invoices the platform issued to this tenant (manual provider only).
export const getPlatformInvoices = handle((req) => billing.listPlatformInvoices(tid(req)));
// Confirming one takes money on the platform's behalf, so it is system_admin
// only at the route — a tenant able to call it would grant itself any plan.
export const confirmInvoice    = handle((req) => billing.confirmPlatformInvoice(req.params.reference, req.body ?? {}, uid(req)));
export const createPortalSession = handle((req) => billing.createPortalSession(tid(req)));
export const billingWebhook = async (req, res) => {
  try {
    const result = await billing.handleWebhook(req.body, req.headers);
    res.json(result);
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
};

// ── Audit logs ────────────────────────────────────────────────────────────
export const listAuditLogs = handle(async (req) => {
  const { limit = 200, userId: filterUserId, action: filterAction } = req.query;
  const where = {
    tenantId: tid(req),
    ...(filterUserId ? { userId: filterUserId } : {}),
    ...(filterAction ? { action: filterAction } : {}),
  };
  const logs = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: Number(limit),
  });
  return logs.map((l) => ({
    id: l.id,
    time: l.createdAt,
    user: l.user ? `${l.user.firstName} ${l.user.lastName}` : "System",
    userEmail: l.user?.email ?? null,
    action: l.action,
    resource: l.resource ?? "—",
    resourceId: l.resourceId,
    detail: l.detail,
    ip: l.ipAddress ?? "—",
    result: l.action?.startsWith("fail") || l.action?.includes("error") ? "failed" : "success",
  }));
});
