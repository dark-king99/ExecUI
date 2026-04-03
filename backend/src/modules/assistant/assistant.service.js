import prisma from "../../config/database.js";

const GREETINGS = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"];

function isGreeting(text) {
  return GREETINGS.some((g) => text.toLowerCase().trim().startsWith(g));
}

export async function chat(userId, tenantId, message, history = []) {
  const lower = message.toLowerCase();

  if (isGreeting(lower)) {
    return {
      reply:
        "Hello! How can I help you today? I can answer questions about your CRM contacts, tasks, tickets, opportunities, or marketing todos.",
    };
  }

  // ── CRM: contacts / leads ─────────────────────────────────────────────────
  if (lower.includes("lead") || lower.includes("contact")) {
    const total = await prisma.contact.count({ where: { tenantId } }).catch(() => null);
    if (total !== null) {
      return {
        reply: `Your CRM has **${total}** contacts/leads on record. Want to see them filtered by owner or run a search?`,
      };
    }
  }

  // ── CRM: opportunities / deals ────────────────────────────────────────────
  if (lower.includes("deal") || lower.includes("opportunit")) {
    const [total, won] = await Promise.all([
      prisma.crmOpportunity.count({ where: { tenantId } }).catch(() => null),
      prisma.crmOpportunity.count({ where: { tenantId, stage: "closed_won" } }).catch(() => 0),
    ]);
    if (total !== null) {
      const pipeline = await prisma.crmOpportunity.aggregate({
        where: { tenantId, stage: { not: "closed_won" } },
        _sum: { value: true },
      }).catch(() => ({ _sum: { value: 0 } }));
      const pipeVal = pipeline._sum.value ?? 0;
      return {
        reply: `You have **${total}** opportunities — **${won}** won. Open pipeline value: **$${Number(pipeVal).toLocaleString()}**. Want a stage-by-stage breakdown?`,
      };
    }
  }

  // ── CRM: tasks ────────────────────────────────────────────────────────────
  if (lower.includes("task") && !lower.includes("marketing")) {
    const [pending, overdue] = await Promise.all([
      prisma.crmTask.count({ where: { tenantId, status: "pending" } }).catch(() => null),
      prisma.crmTask.count({
        where: { tenantId, status: "pending", due_date: { lt: new Date() } },
      }).catch(() => 0),
    ]);
    if (pending !== null) {
      return {
        reply: `There are **${pending}** pending CRM tasks, **${overdue}** of which are overdue. Want to see them by owner or priority?`,
      };
    }
  }

  // ── CRM: tickets / support ───────────────────────────────────────────────
  if (lower.includes("ticket") || lower.includes("support")) {
    const [open, breached] = await Promise.all([
      prisma.crmTicket.count({ where: { tenantId, status: { not: "closed" } } }).catch(() => null),
      prisma.crmTicket.count({ where: { tenantId, sla_status: "breached" } }).catch(() => 0),
    ]);
    if (open !== null) {
      return {
        reply: `There are **${open}** open support tickets, **${breached}** with breached SLAs. Want to see the critical ones?`,
      };
    }
  }

  // ── CRM: follow-ups ───────────────────────────────────────────────────────
  if (lower.includes("follow")) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCount = await prisma.crmFollowUp.count({
      where: { tenantId, scheduled_date: { gte: today, lt: tomorrow } },
    }).catch(() => null);
    if (todayCount !== null) {
      return {
        reply: `You have **${todayCount}** follow-up${todayCount !== 1 ? "s" : ""} scheduled for today. Want to see the full list?`,
      };
    }
  }

  // ── Marketing: todos ─────────────────────────────────────────────────────
  if (lower.includes("todo") || lower.includes("to-do") || lower.includes("marketing task")) {
    const [pending, total] = await Promise.all([
      prisma.marketingTodo.count({ where: { tenantId, completed: false } }).catch(() => null),
      prisma.marketingTodo.count({ where: { tenantId } }).catch(() => 0),
    ]);
    if (pending !== null) {
      return {
        reply: `You have **${pending}** pending marketing to-dos out of **${total}** total. Would you like to create a new one or see the list?`,
      };
    }
  }

  // ── Marketing: schedule events ───────────────────────────────────────────
  if (lower.includes("event") || lower.includes("schedule") || lower.includes("calendar")) {
    const now = new Date();
    const weekAhead = new Date();
    weekAhead.setDate(weekAhead.getDate() + 7);
    const upcoming = await prisma.marketingScheduleEvent.count({
      where: { tenantId, start_time: { gte: now, lte: weekAhead } },
    }).catch(() => null);
    if (upcoming !== null) {
      return {
        reply: `You have **${upcoming}** marketing event${upcoming !== 1 ? "s" : ""} scheduled in the next 7 days. Want to see the full schedule?`,
      };
    }
  }

  // ── Marketing: activities ─────────────────────────────────────────────────
  if (lower.includes("activit") || lower.includes("recent")) {
    const count = await prisma.marketingActivity.count({ where: { tenantId } }).catch(() => null);
    if (count !== null) {
      return {
        reply: `Your marketing log has **${count}** activities recorded. The dashboard shows the most recent 20 — want a summary by type?`,
      };
    }
  }

  // ── Help ──────────────────────────────────────────────────────────────────
  if (lower.includes("help") || lower.includes("what can you")) {
    return {
      reply:
        "I can help you with:\n\n**CRM** — contacts, opportunities, tasks, tickets, follow-ups\n**Marketing** — todos, schedule events, activity log\n\nJust ask a natural question like *\"How many open tickets do we have?\"* or *\"What follow-ups are due today?\"*",
    };
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  return {
    reply:
      "I'm not sure how to answer that yet. Try asking about contacts, deals, tasks, tickets, marketing todos, or schedule events — or type **help** to see what I can do.",
  };
}
