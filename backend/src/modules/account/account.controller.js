import prisma from "../../config/database.js";
import * as billing from "./billing.service.js";

const tid = (req) => req.user.tenantId;
const uid = (req) => req.user.userId;

const handle = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (err) { res.status(500).json({ message: err.message }); }
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
      role: user.role?.name ?? null,
      tenantId: user.tenantId,
      tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug },
      createdAt: user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    const user = await prisma.user.update({
      where: { id: uid(req) },
      data: { ...(firstName && { firstName }), ...(lastName && { lastName }) },
    });
    res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const uploadAvatar = (_req, res) =>
  res.json({ avatarUrl: null });

// ── Security ──────────────────────────────────────────────────────────────
export const getSecurity = (_req, res) =>
  res.json({ mfaEnabled: false, lastPasswordChange: null, activeSessions: 1 });

export const changePassword = (_req, res) =>
  res.json({ success: true });

export const enableMfa  = (_req, res) => res.json({ enabled: true, secret: null });
export const disableMfa = (_req, res) => res.json({ disabled: true });
export const verifyMfa  = (_req, res) => res.json({ verified: true });

export const listSessions  = (_req, res) => res.json([]);
export const revokeSession = (_req, res) => res.status(204).end();

// ── API Keys ──────────────────────────────────────────────────────────────
export const listApiKeys   = (_req, res) => res.json([]);
export const createApiKey  = (req, res) =>
  res.status(201).json({ id: `key-${Date.now()}`, name: req.body?.name ?? "New Key", key: null });
export const deleteApiKey  = (_req, res) => res.status(204).end();
export const rotateApiKey  = (_req, res) => res.json({ rotated: true, key: null });

// ── Notifications ─────────────────────────────────────────────────────────
export const getNotificationPreferences = (_req, res) =>
  res.json({ email: true, sms: false, inApp: true, digest: "daily" });

export const updateNotificationPreferences = (req, res) =>
  res.json({ ...req.body, updated: true });

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
    res.status(500).json({ message: err.message });
  }
};

export const inviteTeamMember = (req, res) =>
  res.status(201).json({ invited: true, email: req.body?.email });

export const updateTeamMember = (_req, res) =>
  res.json({ updated: true });

export const removeTeamMember = (_req, res) =>
  res.status(204).end();

export const listRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({ where: { tenantId: tid(req) } });
    res.json(roles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Billing ───────────────────────────────────────────────────────────────
export const getBilling        = handle((req) => billing.getBilling(tid(req)));
export const getPlans          = handle(()    => billing.getPlans());
export const upgradePlan       = handle((req) => billing.upgradePlan(tid(req), req.body));
export const getPaymentMethods = handle((req) => billing.getPaymentMethods(tid(req)));
export const getInvoices       = handle((req) => billing.getInvoices(tid(req)));
export const createPortalSession = handle((req) => billing.createPortalSession(tid(req), req.body?.returnUrl));
export const createSetupSession  = handle((req) => billing.createSetupSession(tid(req), req.body?.returnUrl));

export const stripeWebhook = async (req, res) => {
  try {
    const result = await billing.handleWebhook(req.body, req.headers["stripe-signature"]);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
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
