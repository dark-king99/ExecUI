/**
 * Workflow engine — turns domain events into automated actions.
 *
 * Rules listen to the same event stream that drives outbound webhooks, so an
 * automation fires whether the change came from the UI, the public API or a
 * background job.
 *
 * ── Why the cycle guard matters ──────────────────────────────────────────────
 * A workflow action writes a record; that write emits another domain event;
 * that event could re-trigger the same (or another) workflow — forever. Two
 * defences, both required:
 *   1. An execution context tracks depth and which workflows already ran in the
 *      current chain. A workflow never runs twice in one chain, and chains stop
 *      at MAX_DEPTH.
 *   2. `oncePerRecord` lets a rule opt out of re-firing for a record it has
 *      already handled — which also stops an "on update" rule from firing on
 *      every subsequent edit.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import prisma from "../../config/database.js";
import { runWithTenant, runUnscoped } from "../../lib/tenantContext.js";
import { onDomainEvent } from "../../lib/domainEvents.js";
import { log } from "../../lib/logger.js";
import { matchesConditions } from "./workflows.rules.js";
import { executeActions } from "./workflows.actions.js";

export const MAX_DEPTH = 3;

const chain = new AsyncLocalStorage();

/** The active automation chain, if we're running inside one. */
export const currentChain = () => chain.getStore();

/** Run `fn` as part of an automation chain (depth-tracked, workflow-deduped). */
function runInChain(workflowId, fn) {
  const parent = chain.getStore();
  const ctx = {
    depth: (parent?.depth ?? 0) + 1,
    ran: new Set(parent?.ran ?? []),
  };
  ctx.ran.add(workflowId);
  return chain.run(ctx, fn);
}

/** Would running this workflow now create a loop? */
export function wouldLoop(workflowId) {
  const ctx = chain.getStore();
  if (!ctx) return false;                      // top-level event: always fine
  if (ctx.depth >= MAX_DEPTH) return true;     // chain too deep
  return ctx.ran.has(workflowId);              // already ran in this chain
}

/**
 * Handle one domain event: find matching workflows and run them.
 * Best-effort — an automation failure is logged against its run, never thrown
 * back into the write that triggered it.
 */
export async function handleEvent(event) {
  const { tenantId, type, resource, record } = event || {};
  if (!tenantId || !type) return { ran: 0 };

  const workflows = await runWithTenant({ tenantId }, async () =>
    prisma.workflow.findMany({ where: { active: true, triggerEvent: type } }),
  );
  if (!workflows.length) return { ran: 0 };

  let ran = 0;
  for (const wf of workflows) {
    if (wouldLoop(wf.id)) {
      log.warn?.("workflow_cycle_prevented", { workflowId: wf.id, depth: currentChain()?.depth });
      continue;
    }
    const outcome = await runWorkflow(wf, { tenantId, type, resource, record });
    if (outcome.matched) ran++;
  }
  return { ran };
}

/**
 * Evaluate + execute a single workflow for one record, recording the run.
 * Exported so the UI's "test run" can exercise the identical path.
 */
export async function runWorkflow(wf, { tenantId, type, resource, record, dryRun = false } = {}) {
  const started = Date.now();
  const matched = matchesConditions(record, wf.conditions, wf.match);

  if (!matched) {
    if (!dryRun) await logRun(tenantId, wf, { event: type, record, status: "skipped", matched: false, results: [], durationMs: Date.now() - started });
    return { matched: false, results: [] };
  }

  // Already handled this record and the rule says only once.
  if (wf.oncePerRecord && record?.id && !dryRun) {
    const seen = await runWithTenant({ tenantId }, async () =>
      prisma.workflowRun.count({ where: { workflowId: wf.id, recordId: record.id, status: "success", matched: true } }),
    );
    if (seen > 0) {
      await logRun(tenantId, wf, { event: type, record, status: "skipped", matched: true, results: [{ skipped: "already handled (once per record)" }], durationMs: Date.now() - started });
      return { matched: true, skipped: "once_per_record", results: [] };
    }
  }

  const ctx = {
    tenantId,
    resourceId: resource,
    record: record || {},
    event: type,
    userId: wf.createdById || null,
    workflowId: wf.id,
    dryRun,
  };

  if (dryRun) {
    // Report what *would* happen without touching anything.
    return {
      matched: true,
      dryRun: true,
      results: (wf.actions || []).map((a) => ({ ok: true, type: a.type, wouldRun: true })),
    };
  }

  // Actions run inside the chain so any writes they make can't loop back here.
  const results = await runInChain(wf.id, () =>
    runWithTenant({ tenantId }, async () => executeActions(wf.actions || [], ctx)),
  );

  const failed = results.filter((r) => !r.ok);
  const status = failed.length ? "failed" : "success";
  await logRun(tenantId, wf, {
    event: type, record, status, matched: true, results,
    error: failed.length ? failed.map((f) => `${f.type}: ${f.error}`).join("; ").slice(0, 500) : null,
    durationMs: Date.now() - started,
  });

  return { matched: true, status, results };
}

async function logRun(tenantId, wf, { event, record, status, matched, results, error = null, durationMs }) {
  try {
    await runWithTenant({ tenantId }, async () => {
      await prisma.workflowRun.create({
        data: {
          workflowId: wf.id, event, recordId: record?.id || null,
          status, matched, results, error, durationMs,
        },
      });
      await prisma.workflow.update({
        where: { id: wf.id },
        data: {
          runCount: { increment: 1 },
          lastRunAt: new Date(),
          lastStatus: status,
          lastError: error,
        },
      });
    });
  } catch (e) {
    log.warn?.("workflow_run_log_failed", { workflowId: wf.id, error: e.message });
  }
}

/** Recent runs, newest first. */
export async function listRuns({ workflowId, limit = 50 } = {}) {
  const rows = await prisma.workflowRun.findMany({
    where: workflowId ? { workflowId } : {},
    orderBy: { createdAt: "desc" },
    take: Math.min(200, Math.max(1, Number(limit) || 50)),
  });
  return rows.map((r) => ({
    id: r.id, workflowId: r.workflowId, event: r.event, recordId: r.recordId,
    status: r.status, matched: r.matched, results: r.results, error: r.error,
    durationMs: r.durationMs, createdAt: r.createdAt,
  }));
}

// ── Wiring ───────────────────────────────────────────────────────────────────
let unsubscribe = null;

export function startWorkflowEngine() {
  if (unsubscribe || process.env.WORKFLOW_ENGINE === "off") return;
  unsubscribe = onDomainEvent((event) => {
    handleEvent(event).catch((e) => log.error?.("workflow_engine_failed", { error: e.message }));
  });
  log.info?.("workflow_engine_started");
}

export function stopWorkflowEngine() {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
}

/** Used by tests/tooling to run pending work without the event stream. */
export async function triggerForRecord({ tenantId, resource, action, record }) {
  return runUnscoped(async () =>
    handleEvent({ tenantId, resource, action, type: `${resource}.${action}`, record }),
  );
}
