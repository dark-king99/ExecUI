/**
 * Workflow automation, through ExecAI.
 *
 * Automation used to be a separate page under Account settings. It now lives in
 * the ExecAI workbench: an admin can describe a rule in plain words and ExecAI
 * drafts it, or build one by hand in the workbench's Automation tab. Both go
 * through the same workflow service, so a rule is validated against the same
 * registry whichever way it was written.
 *
 * Two boundaries:
 *   • Admins only. A rule acts on everyone's data automatically, which is why
 *     the workflow routes are admin-only too.
 *   • ExecAI only ever saves a rule PAUSED. It may hold a send_email or an
 *     update_record action, and the agent itself never sends external messages
 *     or makes unrequested writes. Turning a rule on is a deliberate click by a
 *     person in the Automation tab, after they've read it.
 */
import { catalog, createWorkflow, testWorkflow } from "../workflows/workflows.service.js";

export const AUTOMATION_ROLES = new Set(["enterprise_admin", "system_admin"]);
export const canAutomate = (role) => AUTOMATION_ROLES.has(role);

const DRAFT_FIELDS = ["name", "description", "triggerEvent", "match", "conditions", "actions", "oncePerRecord"];

/**
 * Everything the model needs to write a valid rule in one go. Drafting is a
 * write, and write tools are offered on the first turn only, so the model can't
 * look anything up first — the guide has to be in the tool description.
 */
export function automationGuide() {
  const c = catalog();
  const fields = Object.entries(c.resourceFields)
    .map(([id, list]) => `${id}: ${list.map((f) => `${f.key}${f.writable ? "*" : ""}${f.enum ? `(${f.enum.join("|")})` : ""}`).join(", ")}`)
    .join("; ");
  return [
    `triggerEvent is <resource>.created|updated|deleted, one of: ${c.triggers.join(", ")}.`,
    `Fields by resource (* = writable): ${fields}.`,
    `Condition: {field, op, value}; op is one of ${c.operators.map((o) => o.op).join(", ")} (${c.operators.filter((o) => o.valueless).map((o) => o.op).join(", ")} take no value). match is "all" or "any".`,
    "Actions (1–10): {type:\"update_record\", fields:{writable field of the trigger resource: value}} | " +
      "{type:\"create_record\", resource, fields:{...all required fields}} | " +
      "{type:\"notify\", audience, title, body?, link?} | " +
      "{type:\"send_email\", to:[emails], subject, body} | " +
      "{type:\"request_approval\", title, summary?, steps:[{name, approvers:audience, requiredCount?}] (1–5 steps)}.",
    `audience is {type, value?}; type is one of ${c.audiences.join(", ")} (role, department and user need a value).`,
    "Text and field values may use {{record.<field>}}, {{event}} and {{now}} placeholders.",
  ].join(" ");
}

export function automationTools(role) {
  if (!canAutomate(role)) return [];
  return [
    {
      type: "function",
      function: {
        name: "draft_automation_workflow",
        description: "Save ONE automation rule (\"when this happens, do that\") as a PAUSED draft for an administrator to review and turn on " +
          "in the Automation tab. Only draft a rule the user asked for; never enable one. " + automationGuide(),
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 1, maxLength: 120 },
            description: { type: "string", maxLength: 500 },
            triggerEvent: { type: "string" },
            match: { type: "string", enum: ["all", "any"] },
            conditions: { type: "array", maxItems: 20, items: { type: "object" } },
            actions: { type: "array", minItems: 1, maxItems: 10, items: { type: "object" } },
            oncePerRecord: { type: "boolean" },
          },
          required: ["name", "triggerEvent", "actions"],
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: "test_automation_workflow",
        description: "Dry-run one automation rule against a real record and report whether it would fire. Read-only: no action runs and nothing is logged. Get the id from list_automation_workflows.",
        parameters: {
          type: "object",
          properties: {
            id: { type: "string", minLength: 1, maxLength: 200 },
            recordId: { type: "string", minLength: 1, maxLength: 200 },
          },
          required: ["id"],
          additionalProperties: false,
        },
      },
    },
  ];
}

const summaryRow = (w) => ({
  id: w.id, name: w.name, description: w.description, summary: w.summary,
  triggerEvent: w.triggerEvent, active: w.active, runCount: w.runCount,
});

/**
 * Run an automation tool. Returns the agent's step shape, or null when `name`
 * isn't one of ours.
 */
export async function runAutomationTool(name, args, { tenantId, userId, role }) {
  if (name !== "draft_automation_workflow" && name !== "test_automation_workflow") return null;
  if (!canAutomate(role)) throw new Error("Automation is available to administrators only.");

  if (name === "test_automation_workflow") {
    if (Object.keys(args).some((key) => !["id", "recordId"].includes(key)) || typeof args.id !== "string") {
      throw new Error("Test arguments are invalid.");
    }
    const outcome = await testWorkflow(tenantId, args.id, { recordId: args.recordId });
    return {
      action: "read",
      resource: "workflows",
      summary: outcome.message,
      visualization: { kind: "workflow_test", workflowId: args.id, ...outcome },
      modelOutput: outcome,
    };
  }

  const unknown = Object.keys(args).filter((key) => !DRAFT_FIELDS.includes(key));
  if (unknown.length) throw new Error(`Unknown workflow field(s): ${unknown.join(", ")}.`);

  let workflow;
  try {
    // `active` is never taken from the model.
    workflow = await createWorkflow(userId, { ...args, active: false });
  } catch (error) {
    // A rule that doesn't validate isn't a security event: say why, so the
    // model can tell the person what to change instead of a generic refusal.
    if (error.status === 400) {
      return {
        action: "read",
        resource: "workflows",
        summary: `Draft not saved: ${error.message}`,
        modelOutput: { saved: false, error: error.message },
      };
    }
    throw error;
  }
  return {
    action: "create",
    resource: "workflows",
    summary: `Drafted "${workflow.name}" (paused). Review it in the Automation tab and turn it on there.`,
    visualization: { kind: "workflows", rows: [summaryRow(workflow)], drafted: true },
    modelOutput: { saved: true, ...summaryRow(workflow) },
    audit: { action: "ai_agent.workflow_drafted", resource: "workflows", resourceId: workflow.id, detail: `Automation "${workflow.name}" drafted (paused) by ExecAI.` },
  };
}
