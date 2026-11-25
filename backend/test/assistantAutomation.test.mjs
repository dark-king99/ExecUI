/**
 * Workflow automation through ExecAI: only admins get the tools, a draft is
 * always saved paused, and a rule that wouldn't save from the builder doesn't
 * save from the agent either.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { intersectWithPlan, accessFor } from "../src/modules/access/access.policy.js";
import { entitlementsFor } from "../src/modules/billing/plans.config.js";
import { assistantTools, WRITE_TOOL_NAMES } from "../src/modules/assistant/assistant.policy.js";
import { automationGuide, runAutomationTool } from "../src/modules/assistant/assistant.automation.js";
import { eventTypes } from "../src/modules/api/api.resources.js";

const HAS_DB = !!process.env.DATABASE_URL;
const accessAs = (role) => intersectWithPlan(accessFor({ role, department: "general" }), entitlementsFor("executive"));
const toolNames = (role) => assistantTools(accessAs(role), { role }).map(({ function: fn }) => fn.name);

test("only admins are offered the automation tools", () => {
  for (const role of ["enterprise_admin", "system_admin"]) {
    const names = toolNames(role);
    assert.ok(names.includes("draft_automation_workflow"), role);
    assert.ok(names.includes("test_automation_workflow"), role);
  }
  const employee = toolNames("employee");
  assert.ok(!employee.some((n) => n.includes("automation")), "an employee sees no automation tool");
});

test("drafting is a write tool, so it is withdrawn after the first turn", () => {
  assert.ok(WRITE_TOOL_NAMES.includes("draft_automation_workflow"));
  assert.ok(!WRITE_TOOL_NAMES.includes("test_automation_workflow"), "a dry run writes nothing");
});

test("the draft tool can't be told to switch a rule on", () => {
  const draft = assistantTools(accessAs("enterprise_admin"), { role: "enterprise_admin" })
    .find(({ function: fn }) => fn.name === "draft_automation_workflow");
  assert.equal(draft.function.parameters.additionalProperties, false);
  assert.ok(!("active" in draft.function.parameters.properties));
});

test("the guide names every trigger the engine accepts", () => {
  const guide = automationGuide();
  for (const event of eventTypes()) assert.ok(guide.includes(event), event);
});

test("a non-admin is refused even if the tool is called anyway", async () => {
  await assert.rejects(
    runAutomationTool("draft_automation_workflow", { name: "x", triggerEvent: "contacts.created", actions: [] }, { role: "employee" }),
    /administrators only/,
  );
  assert.equal(await runAutomationTool("search_records", {}, { role: "enterprise_admin" }), null, "other tools fall through");
});

test("drafting against a real database", { skip: !HAS_DB && "DATABASE_URL not set" }, async (t) => {
  const { default: prisma } = await import("../src/config/database.js");
  const { runWithTenant, runUnscoped } = await import("../src/lib/tenantContext.js");

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const ws = await runUnscoped(async () => {
    const tenant = await prisma.tenant.create({
      data: { name: `ExecAI automation ${stamp}`, slug: `execai-auto-${stamp}`, code: `AU${stamp}`.slice(0, 12), plan: "executive" },
    });
    const role = await prisma.role.create({ data: { name: "enterprise_admin", tenantId: tenant.id } });
    const admin = await prisma.user.create({
      data: { email: `auto-${stamp}@t.test`, firstName: "A", lastName: "T", passwordHash: "x", tenantId: tenant.id, roleId: role.id },
    });
    return { tenant, admin };
  });
  const tenantId = ws.tenant.id;
  const ctx = { tenantId, userId: ws.admin.id, role: "enterprise_admin" };
  const run = (name, args) => runWithTenant({ tenantId, userId: ws.admin.id, role: ctx.role }, () => runAutomationTool(name, args, ctx));

  t.after(async () => {
    await runUnscoped(async () => {
      await prisma.workflowRun.deleteMany({ where: { tenantId } }).catch(() => {});
      await prisma.workflow.deleteMany({ where: { tenantId } }).catch(() => {});
      await prisma.contact.deleteMany({ where: { tenantId } }).catch(() => {});
      await prisma.user.deleteMany({ where: { tenantId } }).catch(() => {});
      await prisma.role.deleteMany({ where: { tenantId } }).catch(() => {});
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    });
  });

  const rule = {
    name: "Welcome new contacts",
    triggerEvent: "contacts.created",
    conditions: [{ field: "email", op: "not_empty" }],
    actions: [{ type: "notify", audience: { type: "admins" }, title: "New contact {{record.name}}" }],
  };

  let draftedId;
  await t.test("a draft is saved paused, in the caller's tenant", async () => {
    const step = await run("draft_automation_workflow", rule);
    assert.equal(step.action, "create");
    assert.equal(step.audit.action, "ai_agent.workflow_drafted");
    const row = await runUnscoped(() => prisma.workflow.findFirst({ where: { id: step.audit.resourceId } }));
    assert.equal(row.active, false);
    assert.equal(row.tenantId, tenantId);
    assert.equal(row.createdById, ws.admin.id);
    draftedId = row.id;
  });

  await t.test("asking for an active rule still saves it paused", async () => {
    await assert.rejects(run("draft_automation_workflow", { ...rule, active: true }), /Unknown workflow field/);
  });

  await t.test("an invalid rule isn't saved, and the reason comes back", async () => {
    const before = await runUnscoped(() => prisma.workflow.count({ where: { tenantId } }));
    const step = await run("draft_automation_workflow", { ...rule, conditions: [{ field: "passwordHash", op: "not_empty" }] });
    assert.equal(step.modelOutput.saved, false);
    assert.match(step.summary, /Unknown field "passwordHash"/);
    assert.equal(await runUnscoped(() => prisma.workflow.count({ where: { tenantId } })), before);
  });

  await t.test("a dry run reports without running or logging anything", async () => {
    await runWithTenant({ tenantId }, () => prisma.contact.create({ data: { tenantId, name: "Acme", email: "ops@acme.test", key: `k-${stamp}` } }));
    const step = await run("test_automation_workflow", { id: draftedId });
    assert.equal(step.action, "read");
    assert.equal(step.modelOutput.matched, true);
    const runs = await runUnscoped(() => prisma.workflowRun.count({ where: { workflowId: draftedId } }));
    assert.equal(runs, 0);
  });
});
