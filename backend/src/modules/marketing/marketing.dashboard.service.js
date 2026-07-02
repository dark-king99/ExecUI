/**
 * Marketing Dashboard Service
 * Provides real, tenant-scoped data for the Marketing stream dashboard.
 */
import prisma from "../../config/database.js";
import { notify } from "../notifications/notifications.service.js";

// ── Profile ───────────────────────────────────────────────────────────────────
export async function getDashboardProfile(userId, tenantId) {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    include: { role: true },
  });
  if (!user) throw new Error("User not found");
  return {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    role: user.role.name,
    department: user.department ?? "Marketing",
    avatar_url: user.avatarUrl ?? null,
  };
}

// ── Todos ─────────────────────────────────────────────────────────────────────
export async function listTodos(userId, tenantId) {
  return prisma.marketingTodo.findMany({
    where: { userId, tenantId },
    orderBy: [{ completed: "asc" }, { due_date: "asc" }],
  });
}

export async function createTodo(userId, tenantId, data) {
  return prisma.marketingTodo.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      priority: data.priority ?? "medium",
      due_date: data.due_date ? new Date(data.due_date) : null,
      completed: false,
      userId,
      tenantId,
    },
  });
}

export async function updateTodo(id, tenantId, data) {
  return prisma.marketingTodo.update({
    where: { id },
    data: {
      ...(data.completed !== undefined && { completed: data.completed }),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.priority !== undefined && { priority: data.priority }),
    },
  });
}

export async function deleteTodo(id, tenantId) {
  return prisma.marketingTodo.delete({ where: { id } });
}

// ── Schedule ──────────────────────────────────────────────────────────────────
export async function listScheduleEvents(userId, tenantId) {
  const twoWeeksAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAhead = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  return prisma.marketingScheduleEvent.findMany({
    where: {
      userId,
      tenantId,
      start_time: { gte: twoWeeksAgo, lte: twoWeeksAhead },
    },
    orderBy: { start_time: "asc" },
  });
}

export async function createScheduleEvent(userId, tenantId, data) {
  const event = await prisma.marketingScheduleEvent.create({
    data: {
      title: data.title,
      event_type: data.event_type ?? "meeting",
      start_time: new Date(data.start_time),
      end_time: data.end_time ? new Date(data.end_time) : null,
      location: data.location ?? null,
      userId,
      tenantId,
    },
  });
  // Drop a confirmation in the owner's bell so scheduled meetings surface in
  // the in-app notification feed (fire-and-forget).
  notify({
    tenantId,
    userId,
    type: "schedule",
    title: `${event.event_type === "meeting" ? "Meeting" : "Event"} scheduled`,
    body: `${event.title} · ${new Date(event.start_time).toLocaleString()}${event.location ? ` @ ${event.location}` : ""}`,
    link: "/marketing",
  }).catch(() => {});
  return event;
}

export async function deleteScheduleEvent(id, userId, tenantId) {
  return prisma.marketingScheduleEvent.deleteMany({
    where: { id, userId, tenantId },
  });
}

// ── Activities ────────────────────────────────────────────────────────────────
export async function listActivities(userId, tenantId) {
  return prisma.marketingActivity.findMany({
    where: { userId, tenantId },
    orderBy: { timestamp: "desc" },
    take: 20,
  });
}

export async function logActivity(userId, tenantId, data) {
  return prisma.marketingActivity.create({
    data: {
      action: data.action,
      target: data.target,
      service: data.service,
      userId,
      tenantId,
    },
  });
}

// ── Service Stats ─────────────────────────────────────────────────────────────
// Returns aggregated marketing service stats derived from tenant data.
// As more campaign/email infrastructure is wired, these numbers become live.
export async function getServiceStats(tenantId) {
  // Count real data we have
  const [contactCount] = await Promise.all([
    prisma.contact.count({ where: { tenantId } }),
  ]);

  return {
    personalization: {
      active_segments: 0,
      visitors_personalized: 0,
      conversion_lift: "0%",
      tests_running: 0,
    },
    b2b: {
      qualified_leads: contactCount,
      pipeline_value: "$0",
      avg_deal_size: "$0",
      conversion_rate: "0%",
    },
    emma: {
      emails_sent_today: 0,
      open_rate: "0%",
      automations_active: 0,
      subscribers: contactCount,
    },
    creative: {
      assets_generated: 0,
      campaigns_active: 0,
      brand_score: "N/A",
      approval_pending: 0,
    },
  };
}

// ── Dashboard Overview ────────────────────────────────────────────────────────
export async function getDashboardOverview(tenantId) {
  const [todosPending, scheduleUpcoming, recentActivities] = await Promise.all([
    prisma.marketingTodo.count({ where: { tenantId, completed: false } }),
    prisma.marketingScheduleEvent.count({
      where: { tenantId, start_time: { gte: new Date() } },
    }),
    prisma.marketingActivity.count({ where: { tenantId } }),
  ]);

  return {
    campaigns_live: 0,     // Populated when campaign tracking is wired
    active_leads: 0,       // Populated when lead tracking is wired
    emails_sent: 0,        // Populated when email system is wired
    todos_pending: todosPending,
    upcoming_events: scheduleUpcoming,
    total_activities: recentActivities,
  };
}
