/**
 * The journey engine. Runs in the background of every app instance; the
 * database decides who does what, so nothing depends on a browser being open
 * and instances never process the same contact twice.
 *
 * Entering:
 *   - contact_created   a CRM contact is created (domain event)
 *   - event             a marketing event is recorded for a contact
 *   - audience          on a schedule, everyone in an audience who isn't in yet
 *   - manual            someone enrolls contacts by hand
 *   A contact has at most one live trip per journey (unique activeKey); a
 *   journey set to admit each contact once also keeps onceKey forever.
 *
 * Moving: every few seconds, claim enrollments whose wait is over
 * (FOR UPDATE SKIP LOCKED), and walk each one forward until it has to wait or
 * finishes. Before every step the goal and exit rules are checked.
 *
 * Exactly-once steps: each step writes a history row keyed by (enrollment,
 * sequence) *before* acting and marks it done after. If an instance dies after
 * acting but before moving on, the next pass sees "done" and moves on without
 * acting again. Journey emails are additionally de-duplicated by their send key.
 *
 * Failures: temporary ones (a webhook timing out, a channel API down) retry
 * after 1, 5, then 30 minutes; after that, or for permanent errors, the
 * enrollment fails with the reason recorded. Missing consent is not a failure:
 * the email step is skipped and the contact moves on.
 *
 * `MARKETING_JOURNEY_WORKER=off` disables it.
 */
import crypto from "crypto";
import prisma from "../../../config/database.js";
import { runUnscoped, runWithTenant } from "../../../lib/tenantContext.js";
import { onDomainEvent } from "../../../lib/domainEvents.js";
import { log } from "../../../lib/logger.js";
import { compile, audienceWhere } from "../segments.js";
import { onMarketingEvent, recordEvent } from "../foundation.js";
import { notifyMany } from "../../notifications/notifications.service.js";
import { resolveAudience } from "../../workflows/workflows.actions.js";
import { postToRoute } from "../../connections/chat.service.js";
import { postJson } from "../../../lib/safeHttp.js";
import { EVERY, UNITS } from "./definition.js";

export const BACKOFF_MIN = [1, 5, 30];
const STALE_MS = 10 * 60_000;
const BATCH = 100;
const MAX_STEPS_PER_PASS = 25;
const MAX_STEPS_PER_TRIP = 500;
const LIVE = ["active", "waiting"];

/** Swappable for tests (the real one refuses private addresses). */
export const transport = { postJson };

let timer = null;
let busy = false;
let unsubscribers = [];

// ── Enrolling ────────────────────────────────────────────────────────────────
async function liveVersion(journey) {
  if (!journey.currentVersionId) return null;
  return prisma.marketingJourneyVersion.findFirst({ where: { id: journey.currentVersionId, tenantId: journey.tenantId } });
}

function enrollmentRow(journey, version, contactId, trigger) {
  const def = version.definition;
  return {
    tenantId: journey.tenantId, journeyId: journey.id, versionId: version.id, contactId,
    status: "active", nodeId: def.entry, activeKey: contactId,
    onceKey: def.reentry === "never" ? contactId : null, trigger,
  };
}

/**
 * Enroll contacts into an active journey. Duplicates (already in it, or
 * already been through a once-only journey) are skipped, not errors.
 * Returns how many were enrolled.
 */
export async function enroll(journey, contactIds, trigger = {}) {
  if (journey.status !== "active") return 0;
  const version = await liveVersion(journey);
  if (!version || !contactIds.length) return 0;
  let n = 0;
  for (let i = 0; i < contactIds.length; i += 1000) {
    const page = contactIds.slice(i, i + 1000);
    const r = await prisma.marketingJourneyEnrollment.createMany({ data: page.map((id) => enrollmentRow(journey, version, id, trigger)), skipDuplicates: true });
    n += r.count;
  }
  return n;
}

async function enrollByTrigger(tenantId, triggerType, triggerKey, contactId, trigger, match = () => true) {
  return runWithTenant({ tenantId }, async () => {
    const journeys = await prisma.marketingJourney.findMany({ where: { tenantId, status: "active", triggerType, ...(triggerKey ? { triggerKey } : {}) } });
    let n = 0;
    for (const j of journeys) {
      const v = await liveVersion(j);
      if (!v || !match(v.definition.trigger)) continue;
      n += await enroll(j, [contactId], trigger);
    }
    return n;
  });
}

/** A contact was created in the CRM. */
export async function onContactCreated(tenantId, contact) {
  if (!contact?.id) return 0;
  return enrollByTrigger(tenantId, "contact_created", null, contact.id, { type: "contact_created" });
}

/** A marketing event was recorded: enroll by event triggers, and wake anyone waiting for it. */
export async function onEvent(evt) {
  if (!evt?.contactId || !evt.tenantId) return 0;
  await runWithTenant({ tenantId: evt.tenantId }, () => prisma.marketingJourneyEnrollment.updateMany({
    where: { tenantId: evt.tenantId, contactId: evt.contactId, status: "waiting", waitEvent: evt.type },
    data: { waitUntil: new Date() },
  }));
  return enrollByTrigger(evt.tenantId, "event", evt.type, evt.contactId, { type: "event", event: evt.type, eventId: evt.id },
    (t) => !t.campaignId || t.campaignId === evt.campaignId);
}

/** Scheduled audience triggers whose time has come. */
export async function runScheduled(now = new Date()) {
  const due = await runUnscoped(() => prisma.marketingJourney.findMany({ where: { status: "active", triggerType: "audience", nextRunAt: { lte: now } } }));
  let enrolled = 0;
  for (const j of due) {
    await runWithTenant({ tenantId: j.tenantId }, async () => {
      const v = await liveVersion(j);
      const every = EVERY[v?.definition?.trigger?.every] ?? EVERY.day;
      // Claim this run: only the instance that moves nextRunAt does it.
      const claimed = await prisma.marketingJourney.updateMany({ where: { id: j.id, nextRunAt: j.nextRunAt, status: "active" }, data: { nextRunAt: new Date(now.getTime() + every), lastRunAt: now } });
      if (!claimed.count || !v) return;
      try {
        const audience = await prisma.marketingAudience.findFirst({ where: { id: v.definition.trigger.audienceId, tenantId: j.tenantId } });
        if (!audience) throw new Error("The trigger's audience no longer exists");
        const where = { AND: [{ tenantId: j.tenantId }, await audienceWhere(audience, j.tenantId)] };
        let cursor = null, n = 0;
        for (;;) {
          const page = await prisma.contact.findMany({ where, select: { id: true }, orderBy: { id: "asc" }, take: 1000, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}) });
          if (!page.length) break;
          n += await enroll(j, page.map((p) => p.id), { type: "audience", audienceId: audience.id, runAt: now.toISOString() });
          cursor = page.at(-1).id;
        }
        enrolled += n;
        await prisma.marketingJourney.update({ where: { id: j.id }, data: { lastError: null } });
        await recordEvent({ tenantId: j.tenantId, type: "journey.run", source: "engine", properties: { journeyId: j.id, versionId: v.id, enrolled: n }, idempotencyKey: `run:${j.id}:${now.getTime()}` });
      } catch (e) {
        await prisma.marketingJourney.update({ where: { id: j.id }, data: { lastError: String(e.message).slice(0, 300) } });
      }
    });
  }
  return enrolled;
}

// ── Moving ───────────────────────────────────────────────────────────────────
export async function claim(n = BATCH) {
  const rows = await prisma.$queryRaw`
    UPDATE "MarketingJourneyEnrollment" e
       SET "lockedAt" = now(), "updatedAt" = now()
     WHERE e.id IN (
       SELECT e2.id FROM "MarketingJourneyEnrollment" e2
         JOIN "MarketingJourney" j ON j.id = e2."journeyId"
        WHERE e2.status IN ('active', 'waiting') AND j.status = 'active'
          AND (e2."waitUntil" IS NULL OR e2."waitUntil" <= now())
          AND (e2."lockedAt" IS NULL OR e2."lockedAt" < now() - (${STALE_MS} * interval '1 millisecond'))
        ORDER BY e2."waitUntil" NULLS FIRST
        LIMIT ${n}
        FOR UPDATE OF e2 SKIP LOCKED)
    RETURNING e.id`;
  return rows.map((r) => r.id);
}

const matches = async (tenantId, contactId, rules) => {
  if (!rules) return false;
  const where = await compile(rules, tenantId);
  return (await prisma.contact.count({ where: { AND: [{ id: contactId, tenantId }, where] } })) > 0;
};

/** Stable 0–99 bucket for an A/B split. */
export const bucket = (enrollmentId, nodeId) => crypto.createHash("sha256").update(`${enrollmentId}:${nodeId}`).digest().readUInt16BE(0) % 100;

const failure = (message, transient = false) => Object.assign(new Error(message), { transient });

/**
 * Run one node. Returns { next, outcome, detail } to move on, or
 * { wait: { until, event? } } to pause here.
 */
async function execute(e, node, contact) {
  const t = e.tenantId;
  switch (node.type) {
    case "wait": {
      if (e.status !== "waiting") return { wait: { until: new Date(Date.now() + node.amount * UNITS[node.unit]) } };
      return { next: node.next, detail: { waited: `${node.amount} ${node.unit}` } };
    }
    case "wait_for_event": {
      const since = e.stepStartedAt ?? new Date();
      if (e.status !== "waiting") return { wait: { until: new Date(Date.now() + node.days * UNITS.days), event: node.event } };
      const hit = await prisma.marketingEvent.findFirst({ where: { tenantId: t, contactId: e.contactId, type: node.event, occurredAt: { gte: since }, ...(node.campaignId ? { campaignId: node.campaignId } : {}) } });
      if (hit) return { next: node.next, detail: { event: node.event, at: hit.occurredAt } };
      if (e.waitUntil && e.waitUntil <= new Date()) return { next: node.timeout, detail: { timedOut: true } };
      return { wait: { until: e.waitUntil, event: node.event, keep: true } }; // woken for another event
    }
    case "condition": {
      const yes = await matches(t, e.contactId, node.rules);
      return { next: yes ? node.yes : node.no, detail: { branch: yes ? "yes" : "no" } };
    }
    case "split": {
      const a = bucket(e.id, e.nodeId) < node.percent;
      return { next: a ? node.a : node.b, detail: { branch: a ? "a" : "b" } };
    }
    case "send_email": {
      const c = await prisma.marketingCampaign.findFirst({ where: { id: node.campaignId, tenantId: t } });
      if (!c || c.mode !== "triggered" || ["cancelled", "draft"].includes(c.status)) throw failure(`The journey email ${c ? `"${c.name}" is ${c.status}` : "was deleted"}`);
      const consent = await prisma.marketingConsent.findFirst({ where: { tenantId: t, contactId: e.contactId, channel: "email" } });
      if (consent?.status !== "subscribed") return { next: node.next, outcome: "skipped", detail: { reason: `No email consent (${consent?.status ?? "none recorded"})` } };
      const email = String(contact.email ?? "").trim().toLowerCase();
      if (await prisma.marketingSuppression.findFirst({ where: { tenantId: t, email } })) return { next: node.next, outcome: "skipped", detail: { reason: "Address is suppressed" } };
      const sendKey = `${e.id}:${e.steps}`;
      await prisma.marketingEmailDelivery.createMany({ data: [{ tenantId: t, campaignId: c.id, contactId: e.contactId, sendKey, email }], skipDuplicates: true });
      const d = await prisma.marketingEmailDelivery.findFirst({ where: { campaignId: c.id, sendKey } });
      return { next: node.next, detail: { deliveryId: d?.id, campaignId: c.id, ...(c.status === "paused" ? { note: "Queued; the email is paused" } : {}) } };
    }
    case "add_to_audience":
    case "remove_from_audience": {
      const a = await prisma.marketingAudience.findFirst({ where: { id: node.audienceId, tenantId: t } });
      if (!a || a.kind !== "static") throw failure("That audience is gone or no longer static");
      if (node.type === "add_to_audience") await prisma.marketingAudienceMember.createMany({ data: [{ tenantId: t, audienceId: a.id, contactId: e.contactId }], skipDuplicates: true });
      else await prisma.marketingAudienceMember.deleteMany({ where: { tenantId: t, audienceId: a.id, contactId: e.contactId } });
      return { next: node.next, detail: { audienceId: a.id } };
    }
    case "create_task": {
      const u = await prisma.user.findFirst({ where: { id: node.assigneeId, tenantId: t, isActive: true } });
      if (!u) throw failure("The task's assignee isn't an active member any more");
      const task = await prisma.crmTask.create({ data: { tenantId: t, userId: u.id, title: render(node.title, contact), task_type: node.taskType, priority: "medium", relatedCustomerName: contact.name, due_date: new Date(Date.now() + node.dueInDays * UNITS.days) } });
      return { next: node.next, detail: { taskId: task.id } };
    }
    case "notify": {
      const ids = await resolveAudience(node.audience, {});
      if (ids.length) await notifyMany(ids, { tenantId: t, type: "system", title: render(node.title, contact), body: render(node.body, contact), link: "/marketing/engagement/journeys" });
      return { next: node.next, detail: { notified: ids.length } };
    }
    case "post_chat": {
      try {
        await postToRoute(t, node.routeId, { title: "Journey update", text: render(node.text, contact) });
      } catch (err) {
        throw failure(err.message, (err.status ?? 502) >= 500);
      }
      return { next: node.next, detail: { routeId: node.routeId } };
    }
    case "webhook": {
      const r = await transport.postJson(node.url, {
        event: "journey.step", journeyId: e.journeyId, enrollmentId: e.id, step: e.nodeId,
        contact: { id: contact.id, name: contact.name, email: contact.email },
      }, { headers: { "Idempotency-Key": `${e.id}:${e.steps}` } });
      if (r.status < 200 || r.status >= 300) throw failure(`The webhook answered ${r.status}`);
      return { next: node.next, detail: { status: r.status } };
    }
    default:
      throw failure(`Unknown step type "${node.type}"`);
  }
}

/** {{first_name}} / {{name}} / {{email}} in task titles and messages. */
function render(s, contact) {
  const first = String(contact.name ?? "").trim().split(/\s+/)[0] ?? "";
  return String(s ?? "").replace(/\{\{\s*(first_name|name|email)\s*\}\}/g, (_, k) => (k === "first_name" ? first : contact[k] ?? ""));
}

async function finish(e, status, exitReason = null, lastError = null) {
  await prisma.marketingJourneyEnrollment.update({
    where: { id: e.id },
    data: { status, exitReason, lastError, nodeId: status === "failed" ? e.nodeId : null, waitUntil: null, waitEvent: null, lockedAt: null, activeKey: null, finishedAt: new Date() },
  });
  return status;
}

/** Walk one claimed enrollment forward. Returns its resulting status. */
export async function advance(id) {
  const first = await runUnscoped(() => prisma.marketingJourneyEnrollment.findUnique({ where: { id }, include: { version: true, contact: true } }));
  if (!first) return "missing";
  return runWithTenant({ tenantId: first.tenantId }, async () => {
    let e = first;
    const def = e.version.definition;
    for (let i = 0; i < MAX_STEPS_PER_PASS; i++) {
      if (!LIVE.includes(e.status)) return e.status;
      if (!e.nodeId) return finish(e, "completed");
      if (e.steps >= MAX_STEPS_PER_TRIP) return finish(e, "failed", null, "Too many steps");
      if (def.goal && await matches(e.tenantId, e.contactId, def.goal)) return finish(e, "completed", "goal");
      if (def.exit && await matches(e.tenantId, e.contactId, def.exit)) return finish(e, "exited", "exit_rule");
      const node = def.nodes[e.nodeId];
      if (!node) return finish(e, "failed", null, `Step ${e.nodeId} is missing from version ${e.version.version}`);

      // History first: if this step already finished (we crashed after it), move on.
      let prior = await prisma.marketingJourneyStep.findFirst({ where: { tenantId: e.tenantId, enrollmentId: e.id, seq: e.steps } });
      let out;
      if (prior?.outcome === "done" || prior?.outcome === "skipped") {
        out = { next: prior.detail?.__next ?? null, replay: true };
      } else {
        if (!prior) prior = await prisma.marketingJourneyStep.create({ data: { tenantId: e.tenantId, journeyId: e.journeyId, enrollmentId: e.id, seq: e.steps, nodeId: e.nodeId, type: node.type, outcome: "started" } });
        try {
          out = await execute(e, node, e.contact);
        } catch (err) {
          const retry = err.transient && e.attempts < BACKOFF_MIN.length;
          await prisma.marketingJourneyStep.update({ where: { id: prior.id }, data: { outcome: retry ? "retry" : "failed", error: String(err.message).slice(0, 300) } });
          if (retry) {
            await prisma.marketingJourneyEnrollment.update({ where: { id: e.id }, data: { status: "active", attempts: { increment: 1 }, waitUntil: new Date(Date.now() + BACKOFF_MIN[e.attempts] * 60_000), lastError: String(err.message).slice(0, 300), lockedAt: null } });
            return "retry";
          }
          return finish(e, "failed", null, String(err.message).slice(0, 300));
        }
      }

      if (out.wait) {
        const data = { status: "waiting", waitUntil: out.wait.until, waitEvent: out.wait.event ?? null, lockedAt: null };
        if (!out.wait.keep) data.stepStartedAt = new Date();
        await prisma.marketingJourneyEnrollment.update({ where: { id: e.id }, data });
        return "waiting";
      }
      if (!out.replay) {
        await prisma.marketingJourneyStep.update({ where: { id: prior.id }, data: { outcome: out.outcome ?? "done", detail: { ...(out.detail ?? {}), __next: out.next ?? null }, error: null } });
      }
      e = await prisma.marketingJourneyEnrollment.update({
        where: { id: e.id },
        data: { status: "active", nodeId: out.next ?? null, steps: { increment: 1 }, attempts: 0, waitUntil: null, waitEvent: null, stepStartedAt: null, lastError: null },
        include: { version: true, contact: true },
      });
    }
    // Long run of instant steps: let others have a turn; pick up next pass.
    await prisma.marketingJourneyEnrollment.update({ where: { id: e.id }, data: { lockedAt: null } });
    return e.status;
  });
}

export async function runJourneyWorker({ maxBatches = 4 } = {}) {
  if (busy) return { skipped: "already running" };
  busy = true;
  const out = { enrolled: 0, advanced: 0, completed: 0, failed: 0, waiting: 0 };
  try {
    out.enrolled = await runScheduled();
    for (let b = 0; b < maxBatches; b++) {
      const ids = await runUnscoped(() => claim(BATCH));
      if (!ids.length) break;
      for (const id of ids) {
        let r;
        try { r = await advance(id); } catch (err) {
          log.warn?.("journey_advance_failed", { enrollmentId: id, error: err.message });
          await runUnscoped(() => prisma.marketingJourneyEnrollment.update({ where: { id }, data: { lockedAt: null, lastError: String(err.message).slice(0, 300), waitUntil: new Date(Date.now() + 60_000) } })).catch(() => {});
          continue;
        }
        out.advanced += 1;
        if (r === "completed") out.completed += 1; else if (r === "failed") out.failed += 1; else if (r === "waiting") out.waiting += 1;
      }
    }
    if (out.enrolled || out.completed || out.failed) log.info?.("marketing_journey_worker", out);
    return out;
  } finally {
    busy = false;
  }
}

export function startJourneyWorker() {
  if (process.env.MARKETING_JOURNEY_WORKER === "off") { log.info?.("marketing_journey_worker_disabled"); return null; }
  if (timer) return timer;
  unsubscribers = [
    onDomainEvent((evt) => {
      if (evt?.type === "contacts.created") onContactCreated(evt.tenantId, evt.record).catch((e) => log.warn?.("journey_trigger_failed", { error: e.message }));
    }),
    onMarketingEvent((evt) => { onEvent(evt).catch((e) => log.warn?.("journey_trigger_failed", { error: e.message })); }),
  ];
  timer = setInterval(() => { runJourneyWorker().catch((e) => log.warn?.("marketing_journey_worker_failed", { error: e.message })); }, 5_000);
  timer.unref?.();
  log.info?.("marketing_journey_worker_started");
  return timer;
}

export function stopJourneyWorker() {
  if (timer) clearInterval(timer);
  timer = null;
  for (const u of unsubscribers) u();
  unsubscribers = [];
}
