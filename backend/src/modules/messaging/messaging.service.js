import prisma from "../../config/database.js";
import { accessFor, canonicalDept, DEPT_LABELS } from "../access/access.policy.js";
import * as notifications from "../notifications/notifications.service.js";

const fullName = (u) => `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim() || u?.email || "Unknown";

async function getUser(userId) {
  return prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
}

// ── Directory (who you can message) ───────────────────────────────────────────
export async function directory(tenantId, userId) {
  const users = await prisma.user.findMany({
    where: { tenantId, id: { not: userId }, status: { not: "invited" } },
    include: { role: true },
    orderBy: { firstName: "asc" },
  });
  return users.map((u) => ({
    id: u.id, name: fullName(u), role: u.role?.name ?? null,
    department: u.department ?? null, avatarUrl: u.avatarUrl ?? null,
  }));
}

// ── Conversation list (DMs + department channel) ──────────────────────────────
export async function listConversations(tenantId, userId) {
  const me = await getUser(userId);
  const myDept = accessFor({ role: me?.role?.name, department: me?.department }).dept;

  // Direct messages — group by the other participant.
  const dms = await prisma.directMessage.findMany({
    where: { tenantId, OR: [{ senderId: userId }, { recipientId: userId }] },
    orderBy: { createdAt: "desc" },
    take: 400,
  });
  const byOther = new Map();
  for (const m of dms) {
    const otherId = m.senderId === userId ? m.recipientId : m.senderId;
    if (!byOther.has(otherId)) byOther.set(otherId, { last: m, unread: 0 });
    if (m.recipientId === userId && !m.readAt) byOther.get(otherId).unread += 1;
  }
  const otherIds = [...byOther.keys()];
  const others = otherIds.length
    ? await prisma.user.findMany({ where: { id: { in: otherIds } }, include: { role: true } })
    : [];
  const otherMap = new Map(others.map((u) => [u.id, u]));
  const dmConversations = otherIds.map((id) => {
    const u = otherMap.get(id);
    const { last, unread } = byOther.get(id);
    return {
      kind: "dm", id, name: u ? fullName(u) : "Unknown", avatarUrl: u?.avatarUrl ?? null,
      role: u?.role?.name ?? null, department: u?.department ?? null,
      lastMessage: last.body, lastTime: last.createdAt, unread,
    };
  });

  // Department channel.
  const lastDept = await prisma.deptMessage.findFirst({
    where: { tenantId, OR: [{ toDept: null }, { toDept: myDept }, { fromDept: myDept }] },
    orderBy: { createdAt: "desc" },
  });
  const deptConversation = {
    kind: "dept", id: "dept", name: "Department channel",
    subtitle: DEPT_LABELS[myDept] || "Company-wide",
    lastMessage: lastDept?.body ?? null, lastTime: lastDept?.createdAt ?? null, unread: 0,
  };

  const conversations = [deptConversation, ...dmConversations].sort(
    (a, b) => new Date(b.lastTime || 0) - new Date(a.lastTime || 0)
  );
  return { conversations };
}

// ── Direct message thread ─────────────────────────────────────────────────────
export async function getDmThread(tenantId, userId, otherId) {
  const other = await prisma.user.findFirst({ where: { id: otherId, tenantId }, include: { role: true } });
  if (!other) throw new Error("User not found");
  const msgs = await prisma.directMessage.findMany({
    where: { tenantId, OR: [{ senderId: userId, recipientId: otherId }, { senderId: otherId, recipientId: userId }] },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  // Mark incoming as read.
  await prisma.directMessage.updateMany({ where: { tenantId, senderId: otherId, recipientId: userId, readAt: null }, data: { readAt: new Date() } });
  return {
    peer: { id: other.id, name: fullName(other), role: other.role?.name ?? null, department: other.department ?? null, avatarUrl: other.avatarUrl ?? null },
    messages: msgs.map((m) => ({ id: m.id, mine: m.senderId === userId, senderName: m.senderName, body: m.body, time: m.createdAt })),
  };
}

export async function sendDm(tenantId, userId, { toUserId, body }) {
  if (!toUserId) throw new Error("Recipient is required");
  if (!body || !String(body).trim()) throw new Error("Message is required");
  const recipient = await prisma.user.findFirst({ where: { id: toUserId, tenantId } });
  if (!recipient) throw new Error("Recipient not found");
  const me = await getUser(userId);
  const senderName = fullName(me);
  const msg = await prisma.directMessage.create({
    data: { tenantId, senderId: userId, senderName, recipientId: toUserId, body: String(body).trim() },
  });
  // Notify the recipient (stays in-app — no email).
  await notifications.notify({
    tenantId, userId: toUserId, type: "message",
    title: `New message from ${senderName}`, body: msg.body.slice(0, 120),
    link: `/account/messaging?u=${userId}`, actorName: senderName,
  });
  return { id: msg.id, mine: true, senderName, body: msg.body, time: msg.createdAt };
}

// ── Department channel (shared with Executive Overview) ───────────────────────
export async function getDeptThread(tenantId, userId) {
  const me = await getUser(userId);
  const access = accessFor({ role: me?.role?.name, department: me?.department });
  const where = access.privileged
    ? { tenantId }
    : { tenantId, OR: [{ toDept: null }, { toDept: access.dept }, { fromDept: access.dept }] };
  const rows = await prisma.deptMessage.findMany({ where, orderBy: { createdAt: "asc" }, take: 200 });
  return {
    myDept: access.dept,
    departments: DEPT_LABELS,
    messages: rows.map((r) => ({
      id: r.id, mine: r.authorId === userId, authorName: r.authorName,
      fromDept: r.fromDept, toDept: r.toDept, body: r.body, time: r.createdAt,
    })),
  };
}

/** Post a department message + notify everyone it targets. Shared by overview. */
export async function sendDept(tenantId, userId, { body, toDept }) {
  if (!body || !String(body).trim()) throw new Error("Message body is required");
  const me = await getUser(userId);
  const access = accessFor({ role: me?.role?.name, department: me?.department });
  const authorName = fullName(me);
  const target = toDept && toDept !== "all" ? toDept : null;
  const msg = await prisma.deptMessage.create({
    data: { tenantId, authorId: userId, authorName, fromDept: access.dept, toDept: target, body: String(body).trim() },
  });

  // Resolve recipients: everyone in the target department (or the whole tenant
  // when company-wide), minus the author. Notifications stay in-app.
  const tenantUsers = await prisma.user.findMany({
    where: { tenantId, id: { not: userId }, status: { not: "invited" } },
    select: { id: true, department: true },
  });
  const recipientIds = tenantUsers
    .filter((u) => target == null || canonicalDept(u.department) === target)
    .map((u) => u.id);
  await notifications.notifyMany(recipientIds, {
    tenantId, type: "dept_message",
    title: `${authorName} posted in ${target ? (DEPT_LABELS[target] || target) : "Everyone"}`,
    body: msg.body.slice(0, 120), link: "/account/messaging?c=dept", actorName: authorName,
  });

  return { id: msg.id, mine: true, authorName, fromDept: msg.fromDept, toDept: msg.toDept, body: msg.body, time: msg.createdAt };
}
