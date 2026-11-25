/**
 * Scheduled report delivery.
 *
 * Cadence is expressed in the organization's own timezone ("every Monday at
 * 07:00 in Africa/Monrovia"), not UTC, so deliveries land at the hour the team
 * actually expects — and stay correct across DST. `nextRunAt` (stored in UTC) is
 * the work queue; a ticker claims due rows, renders the report and emails it.
 *
 * Multi-instance safety: a run is claimed with a conditional updateMany, so if
 * two app instances tick at the same moment only one wins the row and a report
 * is never emailed twice. (A dedicated job queue is still the right move at
 * larger scale — noted in docs/REPORTING.md.)
 */
import prisma from "../../config/database.js";
import { runUnscoped, runWithTenant } from "../../lib/tenantContext.js";
import { log } from "../../lib/logger.js";
import { sendEmail } from "../../lib/email.js";
import { getDataset } from "./reports.datasets.js";
import { validateDefinition, runReport } from "./reports.engine.js";
import { renderExport } from "./reports.export.js";

export const FREQUENCIES = ["daily", "weekly", "monthly"];

// ── Timezone-aware scheduling ────────────────────────────────────────────────
/** Offset (ms) of `tz` relative to UTC at the given instant. */
function tzOffsetMs(date, tz) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p = Object.fromEntries(dtf.formatToParts(date).filter((x) => x.type !== "literal").map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, p.hour === "24" ? 0 : +p.hour, +p.minute, +p.second);
  return asUtc - date.getTime();
}

/** The UTC instant for a wall-clock time in `tz` (DST-correct). */
export function zonedTimeToUtc(y, m, d, hour, minute, tz) {
  const wall = Date.UTC(y, m, d, hour, minute, 0);
  let ts = wall;
  for (let i = 0; i < 2; i++) ts = wall - tzOffsetMs(new Date(ts), tz);
  return new Date(ts);
}

/** Calendar Y/M/D of an instant as seen in `tz`. */
function localParts(date, tz) {
  const dtf = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const p = Object.fromEntries(dtf.formatToParts(date).filter((x) => x.type !== "literal").map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month - 1, d: +p.day };
}

export function isValidTimezone(tz) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
}

/**
 * Next delivery instant strictly after `from`.
 * Walks forward day by day in the schedule's own timezone, which keeps DST,
 * month lengths and weekday maths correct without a date library.
 */
export function computeNextRun(schedule, from = new Date()) {
  const tz = isValidTimezone(schedule.timezone) ? schedule.timezone : "UTC";
  const hour = Math.min(23, Math.max(0, Number(schedule.hour) || 0));
  const minute = Math.min(59, Math.max(0, Number(schedule.minute) || 0));
  const { y, m, d } = localParts(from, tz);

  for (let i = 0; i <= 400; i++) {
    const cal = new Date(Date.UTC(y, m, d + i));       // pure calendar date
    const cy = cal.getUTCFullYear(), cm = cal.getUTCMonth(), cd = cal.getUTCDate();

    if (schedule.frequency === "weekly" && cal.getUTCDay() !== (Number(schedule.weekday) || 0)) continue;
    if (schedule.frequency === "monthly" && cd !== Math.min(28, Math.max(1, Number(schedule.dayOfMonth) || 1))) continue;

    const at = zonedTimeToUtc(cy, cm, cd, hour, minute, tz);
    if (at.getTime() > from.getTime()) return at;
  }
  return null;
}

/** Validate + normalize a schedule payload from the API. */
export function validateSchedule(body = {}) {
  const bad = (msg) => { const e = new Error(msg); e.status = 400; throw e; };
  const frequency = FREQUENCIES.includes(body.frequency) ? body.frequency : "weekly";
  const format = ["csv", "xlsx", "pdf"].includes(body.format) ? body.format : "csv";
  const timezone = body.timezone && isValidTimezone(body.timezone) ? body.timezone : "UTC";

  const recipients = [...new Set((Array.isArray(body.recipients) ? body.recipients : String(body.recipients || "").split(","))
    .map((s) => String(s).trim().toLowerCase()).filter(Boolean))];
  if (!recipients.length) bad("Add at least one recipient email address");
  if (recipients.length > 20) bad("A schedule can have at most 20 recipients");
  for (const r of recipients) if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r)) bad(`"${r}" is not a valid email address`);

  const hour = Math.min(23, Math.max(0, Number(body.hour ?? 7)));
  const minute = Math.min(59, Math.max(0, Number(body.minute ?? 0)));
  const weekday = frequency === "weekly" ? Math.min(6, Math.max(0, Number(body.weekday ?? 1))) : null;
  const dayOfMonth = frequency === "monthly" ? Math.min(28, Math.max(1, Number(body.dayOfMonth ?? 1))) : null;

  return {
    frequency, format, timezone, recipients, hour, minute, weekday, dayOfMonth,
    active: body.active === undefined ? true : !!body.active,
  };
}

// ── Delivery ─────────────────────────────────────────────────────────────────
const summarize = (report, result) => `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a">
    <h2 style="margin:0 0 4px">${escapeHtml(report.name)}</h2>
    <p style="margin:0 0 12px;color:#64748b;font-size:13px">
      ${escapeHtml(report.description || "Scheduled report from ExecUI")}
    </p>
    <p style="font-size:13px;margin:0 0 16px">
      <strong>${result.totalRows.toLocaleString()}</strong> row(s) as of ${new Date().toUTCString()}.
      The full data set is attached.
    </p>
    <p style="color:#94a3b8;font-size:11px;margin-top:24px">
      Delivered automatically by ExecUI. Manage this schedule in Analytics → Reports.
    </p>
  </div>`;

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** Render + email one schedule. Runs inside the schedule's tenant context. */
export async function deliverSchedule(schedule, report) {
  const dataset = getDataset(report.dataset);
  if (!dataset) throw new Error(`Report references unknown dataset "${report.dataset}"`);
  const def = validateDefinition(dataset, report.definition || {});
  const result = await runReport(dataset, def);
  const { buffer, mime, filename } = await renderExport(schedule.format, result, {
    name: report.name,
    subtitle: dataset.name,
  });

  const res = await sendEmail({
    tenantId: schedule.tenantId,
    to: schedule.recipients,
    subject: `${report.name} — ${new Date().toISOString().slice(0, 10)}`,
    html: summarize(report, result),
    context: "report_schedule",
    userId: schedule.createdById || undefined,
    attachments: [{ filename, content: buffer, contentType: mime }],
  });

  return { result, email: res, filename };
}

/**
 * Claim and run every schedule that is due. Returns a small run summary.
 * Exported so it can be triggered directly (tests, a "run now" action, or an
 * external cron hitting the app) rather than only by the in-process ticker.
 */
export async function runDueSchedules(now = new Date()) {
  const due = await runUnscoped(async () =>
    prisma.reportSchedule.findMany({
      where: { active: true, nextRunAt: { lte: now } },
      include: { report: true },
      take: 50,
    }),
  );

  let delivered = 0, failed = 0;
  for (const s of due) {
    // Atomic claim: only the instance that moves nextRunAt forward runs it.
    const next = computeNextRun(s, now);
    const claimed = await runUnscoped(async () =>
      prisma.reportSchedule.updateMany({
        where: { id: s.id, nextRunAt: s.nextRunAt },
        data: { nextRunAt: next },
      }),
    );
    if (!claimed.count) continue; // another instance took it

    try {
      const { email } = await runWithTenant({ tenantId: s.tenantId }, () => deliverSchedule(s, s.report));
      const status = email?.sent ? "sent" : email?.skipped ? "skipped" : "failed";
      if (status === "failed") failed++; else delivered++;
      await runUnscoped(async () => prisma.reportSchedule.update({
        where: { id: s.id },
        data: {
          lastRunAt: new Date(), lastStatus: status,
          lastError: email?.sent ? null : email?.message || email?.error || null,
          runCount: { increment: 1 },
        },
      }));
      log.info?.("report_schedule_run", { scheduleId: s.id, status, report: s.report?.name });
    } catch (err) {
      failed++;
      await runUnscoped(async () => prisma.reportSchedule.update({
        where: { id: s.id },
        data: { lastRunAt: new Date(), lastStatus: "failed", lastError: String(err.message).slice(0, 500), runCount: { increment: 1 } },
      }).catch(() => {}));
      log.error?.("report_schedule_failed", { scheduleId: s.id, error: err.message });
    }
  }
  return { due: due.length, delivered, failed };
}

// ── In-process ticker ────────────────────────────────────────────────────────
let timer = null;

/** Start the delivery ticker (no-op if already running or disabled). */
export function startReportScheduler({ intervalMs = 60_000 } = {}) {
  if (timer || process.env.REPORT_SCHEDULER === "off") return;
  timer = setInterval(() => {
    runDueSchedules().catch((err) => log.error?.("report_scheduler_tick_failed", { error: err.message }));
  }, intervalMs);
  timer.unref?.(); // never hold the process open
  log.info?.("report_scheduler_started", { intervalMs });
}

export function stopReportScheduler() {
  if (timer) { clearInterval(timer); timer = null; }
}
