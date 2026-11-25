/**
 * ExecAI's domain tools: who is offered what, what input is accepted, and what
 * the actions refuse to do even when asked.
 *
 * The first half is pure policy and runs anywhere. The second half needs a real
 * database because the refusals that matter most — someone else's task, a
 * closed deal, a resolved alert, a forged status — are decided by reading the
 * record. Those tests build a throwaway workspace, run every call inside the
 * tenant context a request would have, and delete everything they made.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { intersectWithPlan, accessFor } from "../src/modules/access/access.policy.js";
import { entitlementsFor } from "../src/modules/billing/plans.config.js";
import {
  ACTIONS, ACTION_PERMISSIONS, actionCatalog, canPerform, validateInput, performAction, describeAction,
} from "../src/modules/assistant/assistant.actions.js";
import { solutionCatalog, hasSolutionAccess } from "../src/modules/assistant/assistant.solutions.js";
import { assistantTools, WRITE_TOOL_NAMES } from "../src/modules/assistant/assistant.policy.js";

const HAS_DB = !!process.env.DATABASE_URL;

/** Access as production builds it: department ∩ plan, with the plan attached. */
const accessAs = ({ role = "employee", department = "general", plan = "executive" } = {}) =>
  intersectWithPlan(accessFor({ role, department }), entitlementsFor(plan));
const ADMIN = { role: "enterprise_admin" };
const names = (catalog) => catalog.map(({ name, id }) => name ?? id).sort();

// ── Who is offered what ──────────────────────────────────────────────────────
test("every action declares a section, a known effect, and input it validates", () => {
  for (const [name, action] of Object.entries(ACTIONS)) {
    assert.ok(["crm", "marketing", "network", "services"].includes(action.section), `${name} section`);
    assert.ok(["create", "update"].includes(action.effect), `${name} effect`);
    assert.ok(action.title && action.description, `${name} needs a title and description for the model`);
    assert.ok(Object.keys(action.input).length > 0, `${name} accepts nothing`);
    assert.equal(typeof action.run, "function", `${name} has no run`);
  }
});

// The whole point of the list in assistant.actions.js: these never exist.
test("no action deletes, approves, closes, starts, resolves, converts or executes", () => {
  for (const name of Object.keys(ACTIONS)) {
    assert.doesNotMatch(name, /delete|remove|approve|reject|close|start|pause|resolve|convert|restart|restore|run_|execute/, name);
  }
});

test("an admin is offered every action their plan includes", () => {
  const all = actionCatalog(accessAs(ADMIN), ADMIN);
  assert.deepEqual(names(all), Object.keys(ACTIONS).sort());
});

test("a plan without a solution offers none of its actions, even to an admin", () => {
  // Starter has no Services, no Network, and only the CRM basics.
  const starter = names(actionCatalog(accessAs({ ...ADMIN, plan: "starter" }), ADMIN));
  assert.ok(!starter.some((n) => n.startsWith("services_")), "no services on starter");
  assert.ok(!starter.some((n) => n.startsWith("network_")), "no network on starter");
  assert.ok(!starter.includes("marketing_create_experiment"), "intelligence is not on starter");
  assert.ok(starter.includes("crm_create_task"), "activities is on starter");
});

test("a department without a section is offered none of its actions", () => {
  // Sales sees CRM; it must not be offered marketing or network actions.
  const sales = names(actionCatalog(accessAs({ department: "sales" }), {
    role: "employee", permissions: new Set(ACTION_PERMISSIONS),
  }));
  assert.ok(sales.every((n) => n.startsWith("crm_")), sales.join(", "));
});

test("Business Services actions are never offered to a non-admin, whatever they hold", () => {
  const everything = new Set(ACTION_PERMISSIONS);
  for (const department of ["executive", "general", "operations", "finance"]) {
    const catalog = names(actionCatalog(accessAs({ department }), { role: "employee", permissions: everything }));
    assert.ok(!catalog.some((n) => n.startsWith("services_")), `${department}: ${catalog.join(", ")}`);
  }
});

test("without permissions a member gets only self-service actions", () => {
  const offered = names(actionCatalog(accessAs({ department: "general" }), { role: "employee" }));
  assert.deepEqual(offered, ["crm_complete_task", "crm_create_task", "crm_schedule_meeting"]);
});

test("each permission unlocks exactly its own actions", () => {
  const access = accessAs({ department: "general" });
  const base = new Set(names(actionCatalog(access, { role: "employee" })));
  for (const key of ACTION_PERMISSIONS) {
    const unlocked = names(actionCatalog(access, { role: "employee", permissions: new Set([key]) }))
      .filter((n) => !base.has(n));
    const expected = Object.entries(ACTIONS)
      .filter(([, a]) => a.permission === key && a.section !== "services")
      .map(([n]) => n).sort();
    assert.deepEqual(unlocked, expected, key);
  }
});

test("an unknown action, or a name off the object prototype, is refused before anything runs", async () => {
  const ctx = { access: accessAs(ADMIN), ...ADMIN, permissions: new Set() };
  assert.equal(canPerform(undefined, ctx), false);
  for (const name of ["no_such_action", "constructor", "__proto__", "toString", "hasOwnProperty"]) {
    await assert.rejects(performAction(name, {}, ctx), /not available to you/, name);
  }
});

test("run_action is offered only with the caller's actions, and counts as a write tool", () => {
  assert.ok(WRITE_TOOL_NAMES.includes("run_action"));
  const memberTools = assistantTools(accessAs({ department: "general" }), { role: "employee" });
  const run = memberTools.find(({ function: fn }) => fn.name === "run_action");
  assert.deepEqual(run.function.parameters.properties.action.enum.sort(),
    ["crm_complete_task", "crm_create_task", "crm_schedule_meeting"]);
  // Nothing in the description may advertise an action the enum doesn't hold.
  assert.doesNotMatch(run.function.description, /network_|marketing_create|services_/);
  // No module access at all → no actions tool.
  const none = assistantTools(intersectWithPlan({ sections: [], slices: [] }, entitlementsFor("executive")), { role: "employee" });
  assert.ok(!none.some(({ function: fn }) => fn.name === "run_action"));
});

// ── Read views ───────────────────────────────────────────────────────────────
test("read views follow the same section and plan gates", () => {
  const member = solutionCatalog(accessAs({ department: "general" })).map(({ id }) => id);
  assert.ok(!member.some((id) => id.startsWith("services_")), "services views are admin-only");
  assert.ok(member.includes("crm_my_tasks"));
  const admin = solutionCatalog(accessAs(ADMIN)).map(({ id }) => id);
  assert.ok(admin.includes("services_dashboard") && admin.includes("network_capacity"));
  const starter = solutionCatalog(accessAs({ ...ADMIN, plan: "starter" })).map(({ id }) => id);
  assert.ok(!starter.some((id) => id.startsWith("network_") || id.startsWith("services_")));
});

test("no read view is backed by a placeholder service", () => {
  const ids = solutionCatalog(accessAs(ADMIN)).map(({ id }) => id);
  for (const stub of ["attribution", "channel", "trend", "traffic", "service_health"]) {
    assert.ok(!ids.some((id) => id.includes(stub)), `${stub} returns hard-coded data and must not be exposed`);
  }
});

test("the services dashboard needs some services solution, not a specific one", () => {
  const access = accessAs(ADMIN);
  assert.equal(hasSolutionAccess(access, "services", "*"), true);
  const noServices = { ...access, plan: { ...access.plan, solutions: { ...access.plan.solutions, services: [] } } };
  assert.equal(hasSolutionAccess(noServices, "services", "*"), false);
});

// ── Input validation ─────────────────────────────────────────────────────────
test("unknown fields are refused rather than ignored", () => {
  // The case that motivated this: a change request created already-approved.
  assert.throws(
    () => validateInput(ACTIONS.network_request_change, { title: "Upgrade core switch", status: "approved" }),
    /Not accepted for this action: status/,
  );
  assert.throws(() => validateInput(ACTIONS.crm_create_lead, { name: "Acme", tenantId: "other" }), /tenantId/);
});

test("required fields, enums and ranges are enforced", () => {
  assert.throws(() => validateInput(ACTIONS.crm_create_lead, {}), /name is required/);
  assert.throws(() => validateInput(ACTIONS.crm_create_lead, { name: "  " }), /cannot be empty/);
  assert.throws(() => validateInput(ACTIONS.crm_create_lead, { name: "A", probability: 101 }), /between 0 and 100/);
  assert.throws(() => validateInput(ACTIONS.crm_create_lead, { name: "A", probability: 1.5 }), /whole number/);
  assert.throws(() => validateInput(ACTIONS.crm_create_lead, { name: "A", source: "Cold call" }), /one of/);
  assert.throws(() => validateInput(ACTIONS.crm_create_task, { title: "x".repeat(201) }), /200 characters/);
  assert.throws(() => validateInput(ACTIONS.crm_schedule_meeting, { title: "Sync", scheduledAt: "next tuesday" }), /ISO date/);
  assert.throws(() => validateInput(ACTIONS.crm_schedule_meeting, { title: "Sync", scheduledAt: "1999-01-01" }), /out of range/);
  assert.throws(() => validateInput(ACTIONS.services_assign_task, { title: "Prep board deck" }), /assigneeId is required/);
  assert.throws(() => validateInput(ACTIONS.services_update_task_status, { id: "x", status: "archived" }), /one of/);
  assert.throws(() => validateInput(ACTIONS.services_draft_sop, { title: "T", department: "Ops", steps: "do it" }), /list/);
  assert.throws(() => validateInput(ACTIONS.crm_update_lead, { id: "x" }), /at least one of/);
});

test("a lead can only be moved between OPEN stages", () => {
  for (const stage of ["closed_won", "closed_lost", "Closed Won", "won"]) {
    assert.throws(() => validateInput(ACTIONS.crm_update_lead, { id: "x", stage }), /one of/, stage);
  }
  assert.deepEqual(validateInput(ACTIONS.crm_update_lead, { id: "x", stage: "proposal" }), { id: "x", stage: "proposal" });
});

test("valid input is normalized", () => {
  assert.deepEqual(
    validateInput(ACTIONS.crm_create_lead, { name: "  Acme  ", value: "2500", probability: 40 }),
    { name: "Acme", value: 2500, probability: 40 },
  );
  assert.deepEqual(
    validateInput(ACTIONS.services_create_project, { name: "  Q3 rollout ", budget: "5000" }),
    { name: "Q3 rollout", budget: 5000 },
  );
});

test("an action's description lists its fields and marks the required ones", () => {
  const line = describeAction("network_open_incident", ACTIONS.network_open_incident);
  assert.match(line, /title\*:string/);
  assert.match(line, /severity:low\|medium\|high\|critical/);
});

// ── Against a real database ──────────────────────────────────────────────────
test("actions against real records", { skip: !HAS_DB && "DATABASE_URL not set" }, async (t) => {
  const { default: prisma } = await import("../src/config/database.js");
  const { runWithTenant, runUnscoped } = await import("../src/lib/tenantContext.js");

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const ws = await runUnscoped(async () => {
    const tenant = await prisma.tenant.create({
      data: { name: `ExecAI actions ${stamp}`, slug: `execai-${stamp}`, code: `EA${stamp}`.slice(0, 12), plan: "executive" },
    });
    const role = await prisma.role.create({ data: { name: "employee", tenantId: tenant.id } });
    const mk = (n, extra = {}) => prisma.user.create({
      data: { email: `execai-${n}-${stamp}@t.test`, firstName: n, lastName: "T", passwordHash: "x", tenantId: tenant.id, roleId: role.id, ...extra },
    });
    return { tenant, me: await mk("me"), colleague: await mk("colleague"), leaver: await mk("leaver", { isActive: false }) };
  });
  const tenantId = ws.tenant.id;

  t.after(async () => {
    await runUnscoped(async () => {
      for (const model of ["auditLog", "crmTask", "crmFollowUp", "crmOpportunity", "contact", "networkAlert",
        "networkIncident", "networkChange", "marketingAudience", "marketingExperiment", "bizGoal", "bizSOP", "bizProject", "bizTask"]) {
        await prisma[model].deleteMany({ where: { tenantId } }).catch(() => {});
      }
      await prisma.user.deleteMany({ where: { tenantId } }).catch(() => {});
      await prisma.role.deleteMany({ where: { tenantId } }).catch(() => {});
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    });
  });

  /** Run one action as `who`, inside the tenant context a request would have. */
  const act = (name, input, { who = ws.me, role = "employee", permissions = [], department = "general" } = {}) =>
    runWithTenant({ tenantId, userId: who.id, role }, () => performAction(name, input, {
      tenantId, userId: who.id, role,
      access: accessAs({ role, department }),
      permissions: new Set(permissions),
    }));
  const seed = (fn) => runWithTenant({ tenantId }, fn);

  await t.test("a self-service task is assigned to the person who asked", async () => {
    const { result } = await act("crm_create_task", { title: "Call Acme", priority: "high" });
    assert.equal(result.userId, ws.me.id);
    assert.equal(result.task_type, "follow_up");
  });

  await t.test("assigning a colleague needs crm.activity.write", async () => {
    await assert.rejects(act("crm_create_task", { title: "For you", assigneeId: ws.colleague.id }), /crm\.activity\.write/);
    const { result } = await act("crm_create_task", { title: "For you", assigneeId: ws.colleague.id },
      { permissions: ["crm.activity.write"] });
    assert.equal(result.userId, ws.colleague.id);
  });

  await t.test("a task can't be assigned to someone who has left", async () => {
    await assert.rejects(
      act("crm_create_task", { title: "Ghost", assigneeId: ws.leaver.id }, { permissions: ["crm.activity.write"] }),
      /active member/,
    );
  });

  await t.test("you can complete your own task but not a colleague's", async () => {
    const mine = await seed(() => prisma.crmTask.create({ data: { title: "Mine", tenantId, userId: ws.me.id } }));
    const theirs = await seed(() => prisma.crmTask.create({ data: { title: "Theirs", tenantId, userId: ws.colleague.id } }));
    await act("crm_complete_task", { id: mine.id });
    assert.equal((await seed(() => prisma.crmTask.findFirst({ where: { id: mine.id } }))).status, "completed");
    await assert.rejects(act("crm_complete_task", { id: theirs.id }), /belongs to someone else/);
    await assert.rejects(act("crm_complete_task", { id: mine.id }), /already completed/);
  });

  await t.test("a meeting lands on the organiser's calendar", async () => {
    const { result } = await act("crm_schedule_meeting", { title: "QBR", scheduledAt: "2030-03-04T10:00:00Z" });
    assert.equal(result.userId, ws.me.id);
    assert.equal(result.follow_up_type, "meeting");
  });

  await t.test("a lead is owned by its creator; a closed deal can't be touched", async () => {
    const perms = { permissions: ["crm.pipeline.manage"] };
    await assert.rejects(act("crm_create_lead", { name: "No permission" }), /not available to you/);
    const { result: lead } = await act("crm_create_lead", { name: "Acme", value: 5000 }, perms);
    const row = await seed(() => prisma.crmOpportunity.findFirst({ where: { id: lead.id } }));
    assert.equal(row.ownerId, ws.me.id);
    assert.equal(row.stage, "prospecting");

    await act("crm_update_lead", { id: lead.id, stage: "proposal" }, perms);
    assert.equal((await seed(() => prisma.crmOpportunity.findFirst({ where: { id: lead.id } }))).stage, "proposal");

    await seed(() => prisma.crmOpportunity.update({ where: { id: lead.id }, data: { stage: "closed_won" } }));
    await assert.rejects(act("crm_update_lead", { id: lead.id, value: 1 }, perms), /deal is closed/);
  });

  await t.test("an account note is attributed to its author", async () => {
    const contact = await seed(() => prisma.contact.create({
      data: { tenantId, key: `k-${stamp}`, name: "Acme", email: `acme-${stamp}@t.test` },
    }));
    await act("crm_add_account_note", { accountId: contact.id, note: "Renewal call went well" },
      { permissions: ["crm.contact.write"] });
    const note = await seed(() => prisma.auditLog.findFirst({ where: { resourceId: contact.id, action: "note" } }));
    assert.equal(note.userId, ws.me.id, "the note must not be credited to the tenant's first user");
  });

  await t.test("a resolved alert is not reopened by acknowledging it", async () => {
    const perms = { permissions: ["network.alerts.manage"], department: "it" };
    const open = await seed(() => prisma.networkAlert.create({ data: { tenantId, title: "Link down", status: "open" } }));
    const resolved = await seed(() => prisma.networkAlert.create({ data: { tenantId, title: "Old", status: "resolved" } }));
    await act("network_acknowledge_alert", { id: open.id }, perms);
    assert.equal((await seed(() => prisma.networkAlert.findFirst({ where: { id: open.id } }))).status, "acknowledged");
    await assert.rejects(act("network_acknowledge_alert", { id: resolved.id }, perms), /already resolved/);
    assert.equal((await seed(() => prisma.networkAlert.findFirst({ where: { id: resolved.id } }))).status, "resolved");
  });

  await t.test("a change request is always pending, whatever the model sends", async () => {
    const perms = { permissions: ["network.changes.request"], department: "it" };
    await assert.rejects(act("network_request_change", { title: "Swap core", status: "approved" }, perms), /status/);
    const { result } = await act("network_request_change", { title: "Swap core", priority: "high" }, perms);
    assert.equal(result.status, "pending");
  });

  await t.test("an incident opens as open", async () => {
    const { result } = await act("network_open_incident", { title: "Packet loss", severity: "high" },
      { permissions: ["network.incidents.manage"], department: "it" });
    assert.equal(result.status, "open");
    assert.equal(result.severity, "high");
  });

  await t.test("marketing drafts stay drafts", async () => {
    const perms = { department: "marketing" };
    const { result: audience } = await act("marketing_create_audience", { name: "Churn risk", type: "intent" },
      { ...perms, permissions: ["marketing.audience.write"] });
    assert.equal(audience.status, "draft");
    const { result: exp } = await act("marketing_create_experiment", { name: "CTA colour" },
      { ...perms, permissions: ["marketing.experiment.write"] });
    assert.equal(exp.status, "draft");
  });

  await t.test("services actions are admin-only, and an SOP is a draft", async () => {
    await assert.rejects(act("services_draft_sop", { title: "Onboarding", department: "Ops" }), /not available to you/);
    const { result: sop } = await act("services_draft_sop",
      { title: "Onboarding", department: "Ops", steps: ["Create account", "Send welcome pack"] },
      { role: "enterprise_admin" });
    assert.equal(sop.status, "draft");
    const { result: goal } = await act("services_create_goal", { title: "Expand to Ghana" }, { role: "enterprise_admin" });
    assert.equal(goal.status, "planning");
    assert.equal(goal.progress, 0);
    const { result: moved } = await act("services_update_goal_progress", { id: goal.id, progress: 40, status: "in_progress" },
      { role: "enterprise_admin" });
    assert.equal(moved.progress, 40);
  });

  await t.test("a manager assigns work to real members, and only to them", async () => {
    const admin = { role: "enterprise_admin" };
    const { result: project } = await act("services_create_project", { name: "Office move", budget: 12000 }, admin);
    assert.equal(project.status, "planning");
    assert.equal(project.progress, 0);

    const { result: task } = await act("services_assign_task",
      { title: "Book movers", assigneeId: ws.colleague.id, projectId: project.id, dueDate: "2020-01-01" }, admin);
    assert.equal(task.assignee, ws.colleague.id);
    assert.equal(task.assigned_to, ws.colleague.id, "the page reads assigned_to");
    assert.equal(task.status, "todo");

    // Someone outside this workspace can't be handed work.
    const outsider = await runUnscoped(async () => {
      const other = await prisma.tenant.create({ data: { name: `Other ${stamp}`, slug: `other-${stamp}`, code: `OT${stamp}`.slice(0, 12), plan: "executive" } });
      const role = await prisma.role.create({ data: { name: "employee", tenantId: other.id } });
      const user = await prisma.user.create({ data: { email: `outsider-${stamp}@t.test`, firstName: "O", lastName: "T", passwordHash: "x", tenantId: other.id, roleId: role.id } });
      return { other, user };
    });
    t.after(() => runUnscoped(async () => {
      await prisma.user.deleteMany({ where: { tenantId: outsider.other.id } });
      await prisma.role.deleteMany({ where: { tenantId: outsider.other.id } });
      await prisma.tenant.delete({ where: { id: outsider.other.id } }).catch(() => {});
    }));
    await assert.rejects(act("services_assign_task", { title: "Leak", assigneeId: outsider.user.id }, admin), /member of this workspace/);

    // The workload view counts it as open and overdue for that person.
    const { listMembers } = await import("../src/modules/services/services.service.js");
    const workload = await seed(() => listMembers(tenantId));
    const row = workload.find((m) => m.id === ws.colleague.id);
    assert.equal(row.open_tasks, 1);
    assert.equal(row.overdue_tasks, 1);

    const { result: done } = await act("services_update_task_status", { id: task.id, status: "done" }, admin);
    assert.equal(done.status, "done");
    const { result: moved } = await act("services_update_project_progress", { id: project.id, progress: 60, status: "in_progress" }, admin);
    assert.equal(moved.progress, 60);
  });

  await t.test("records in another workspace are invisible", async () => {
    // An id from outside the tenant reads as "no such record", not as a leak.
    await assert.rejects(act("crm_complete_task", { id: "00000000-0000-0000-0000-000000000000" }), /No task with that id/);
  });
});
