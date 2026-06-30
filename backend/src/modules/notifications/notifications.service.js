import prisma from "../../config/database.js";

const shape = (n) => ({
  id: n.id, type: n.type, title: n.title, body: n.body, link: n.link,
  actorName: n.actorName, read: !!n.readAt, time: n.createdAt,
});

/** Create a notification for a single recipient (internal helper). */
export async function notify({ tenantId, userId, type = "message", title, body, link, actorName }) {
  if (!userId) return null;
  return prisma.notification.create({
    data: { tenantId, userId, type, title, body: body || null, link: link || null, actorName: actorName || null },
  });
}

/** Fan a notification out to many recipients. */
export async function notifyMany(userIds, payload) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return;
  await prisma.notification.createMany({
    data: ids.map((userId) => ({
      tenantId: payload.tenantId, userId, type: payload.type || "message",
      title: payload.title, body: payload.body || null, link: payload.link || null, actorName: payload.actorName || null,
    })),
  });
}

export async function list(tenantId, userId, { limit = 30, unreadOnly = false } = {}) {
  const where = { tenantId, userId, ...(unreadOnly ? { readAt: null } : {}) };
  const rows = await prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: Number(limit) });
  return rows.map(shape);
}

export async function unreadCount(tenantId, userId) {
  return prisma.notification.count({ where: { tenantId, userId, readAt: null } });
}

export async function markRead(tenantId, userId, id) {
  await prisma.notification.updateMany({ where: { id, tenantId, userId, readAt: null }, data: { readAt: new Date() } });
  return { ok: true };
}

export async function markAllRead(tenantId, userId) {
  await prisma.notification.updateMany({ where: { tenantId, userId, readAt: null }, data: { readAt: new Date() } });
  return { ok: true };
}
