import { containsPromptInjection } from "../../lib/aiSafety.js";
import { listResources } from "../api/api.resources.js";
import { hasSolutionAccess, solutionCatalog } from "./assistant.solutions.js";
import { actionCatalog, describeAction } from "./assistant.actions.js";
import { automationTools } from "./assistant.automation.js";
import { mailboxTools } from "./assistant.mailbox.js";

/**
 * Tools that change data. After the first turn these are withdrawn, so a model
 * reacting to its own tool output can't chain one write into another — any
 * further write needs a fresh request from the person.
 */
export const WRITE_TOOL_NAMES = ["create_record", "update_record", "run_action", "draft_automation_workflow"];

const RESOURCE_SOLUTIONS = {
  contacts: "accounts", opportunities: "opportunities", tasks: "activities", tickets: "service",
  campaigns: "engagement", projects: "team", "team-tasks": "team",
};

export function overviewCatalog(access = {}) {
  const allowedSections = new Set(Array.isArray(access.sections) ? access.sections : []);
  return listResources().filter((resource) =>
    allowedSections.has(resource.module) &&
    ["crm", "marketing", "services", "network"].includes(resource.module) &&
    (resource.module === "network"
      ? hasSolutionAccess(access, "network")
      : hasSolutionAccess(access, resource.module, RESOURCE_SOLUTIONS[resource.id])),
  );
}

const WRITE_PERMISSIONS = {
  contacts: {
    create: ["crm.contact.write"],
    update: ["crm.contact.write"],
  },
  campaigns: {
    create: ["marketing.campaign.create"],
    update: [],
  },
};

export function writableResources(access = {}, { role, permissions = [] } = {}) {
  const resources = overviewCatalog(access);
  const isAdmin = role === "enterprise_admin" || role === "system_admin";
  const granted = new Set(permissions);
  return resources.filter((resource) => {
    if (resource.readOnly || resource.id === "transactions") return false;
    if (isAdmin) return true;
    const policy = WRITE_PERMISSIONS[resource.id];
    return policy && Object.values(policy).some((keys) => keys.some((key) => granted.has(key)));
  }).map((resource) => ({
    id: resource.id,
    create: isAdmin || (WRITE_PERMISSIONS[resource.id]?.create || []).some((key) => granted.has(key)),
    update: isAdmin || (WRITE_PERMISSIONS[resource.id]?.update || []).some((key) => granted.has(key)),
  }));
}

export function assistantTools(access = {}, { pythonEnabled = false, writable = [], role, permissions = new Set(), mailbox = null } = {}) {
  const resources = overviewCatalog(access);
  const ids = resources.map(({ id }) => id);
  const searchFilters = resources.map((resource) => {
    const fields = (resource.filterable || []).map((field) => {
      const values = resource.fields[field]?.enum;
      return values ? `${field} (${values.join(", ")})` : field;
    });
    return `${resource.id}: ${fields.join(", ") || "none"}`;
  }).join("; ");
  const createIds = writable.filter(({ create }) => create).map(({ id }) => id);
  const updateIds = writable.filter(({ update }) => update).map(({ id }) => id);
  const tools = [
    {
      type: "function",
      function: {
        name: "search_execui_policy",
        description: "Retrieve relevant excerpts from ExecUI's current public Terms, Acceptable Use, Refund, Privacy, and Security policies. Use this for policy questions and ground the answer in the returned excerpts.",
        parameters: {
          type: "object",
          properties: { query: { type: "string", minLength: 2, maxLength: 500 } },
          required: ["query"],
          additionalProperties: false,
        },
      },
    },
  ];
  const solutions = solutionCatalog(access);
  if (solutions.length) tools.push({
    type: "function",
    function: {
      name: "read_solution",
      description: `Read one of these authorized, read-only solution views: ${solutions.map(({ id, description }) => `${id}: ${description}`).join(" ")}`,
      parameters: {
        type: "object",
        properties: {
          solution: { type: "string", enum: solutions.map(({ id }) => id) },
          // Only some views take one; they say so in their description.
          id: { type: "string", minLength: 1, maxLength: 200 },
        },
        required: ["solution"],
        additionalProperties: false,
      },
    },
  });
  if (access?.plan?.industry && access?.sections?.some((section) => ["crm", "marketing"].includes(section))) tools.push({
    type: "function",
    function: {
      name: "read_industry_records",
      description: "List the current tenant industry's available CRM or marketing object types, or read up to 10 records of an available object type. Never infer telecommunications records from generic contacts.",
      parameters: {
        type: "object",
        properties: {
          surface: { type: "string", enum: access.sections.filter((section) => ["crm", "marketing"].includes(section)) },
          objectType: { type: "string", maxLength: 80 },
        },
        required: ["surface"],
        additionalProperties: false,
      },
    },
  });
  if (resources.length) tools.push(
    {
      type: "function",
      function: {
        name: "get_workspace_overview",
        description: "Read aggregate counts for every module authorized for the signed-in user.",
        parameters: { type: "object", properties: {}, additionalProperties: false },
      },
    },
    {
      type: "function",
      function: {
        name: "search_records",
        description: `Search authorized workspace records using exact-match filters. Return at most 10 records. Supported filters and enum values by resource: ${searchFilters}. For several enum values use a comma-separated string. For open CRM work, tasks have pending or in_progress status; tickets have open, pending, or in_progress status.`,
        parameters: {
          type: "object",
          properties: {
            resource: { type: "string", enum: ids },
            filters: { type: "object", properties: { status: { type: "string" }, priority: { type: "string" }, category: { type: "string" }, stage: { type: "string" }, severity: { type: "string" }, sla_status: { type: "string" }, channel: { type: "string" }, objective: { type: "string" }, task_type: { type: "string" }, assignee: { type: "string" }, project_id: { type: "string" }, userId: { type: "string" }, ownerId: { type: "string" }, deviceId: { type: "string" }, device_type: { type: "string" }, region: { type: "string" }, cloud_provider: { type: "string" }, source: { type: "string" }, type: { type: "string" } }, additionalProperties: false },
            limit: { type: "integer", minimum: 1, maximum: 10 },
          },
          required: ["resource"],
          additionalProperties: false,
        },
      },
    },
  );
  if (role === "enterprise_admin" || role === "system_admin") {
    tools.push({
      type: "function",
      function: {
        name: "list_automation_workflows",
        description: "List a bounded summary of automation workflows in the signed-in administrator's tenant. This tool is read-only and never runs a workflow.",
        parameters: {
          type: "object",
          properties: { limit: { type: "integer", minimum: 1, maximum: 10 } },
          additionalProperties: false,
        },
      },
    });
    tools.push(...automationTools(role));
  }
  if (createIds.length) {
    tools.push(
      {
        type: "function",
        function: {
          name: "create_record",
          description: "Create a record in an authorized module. Only fields permitted by the resource registry are accepted.",
          parameters: {
            type: "object",
            properties: {
              resource: { type: "string", enum: createIds },
              fields: { type: "object", additionalProperties: true },
            },
            required: ["resource", "fields"],
            additionalProperties: false,
          },
        },
      },
    );
  }
  if (updateIds.length) {
    tools.push(
      {
        type: "function",
        function: {
          name: "update_record",
          description: "Update writable fields on one record in an authorized module. Deletion and lifecycle transitions are not available.",
          parameters: {
            type: "object",
            properties: {
              resource: { type: "string", enum: updateIds },
              id: { type: "string", minLength: 1, maxLength: 200 },
              fields: { type: "object", additionalProperties: true },
            },
            required: ["resource", "id", "fields"],
            additionalProperties: false,
          },
        },
      },
    );
  }
  // Domain actions. The enum is this caller's permitted actions and nothing
  // else, so a model can't even name an action the user isn't allowed to take.
  const actions = actionCatalog(access, { role, permissions });
  if (actions.length) {
    tools.push({
      type: "function",
      function: {
        name: "run_action",
        description: "Perform ONE permitted workspace action. Fields marked * are required; send no other fields. " +
          "Only act when the user asked for this change. Available actions: " +
          actions.map(({ name, ...action }) => describeAction(name, action)).join(" | "),
        parameters: {
          type: "object",
          properties: {
            action: { type: "string", enum: actions.map(({ name }) => name) },
            input: { type: "object", additionalProperties: true },
          },
          required: ["action", "input"],
          additionalProperties: false,
        },
      },
    });
  }
  // The signed-in person's own mailbox and calendar, when they've connected one.
  tools.push(...mailboxTools(mailbox));
  if (pythonEnabled) {
    tools.push({
      type: "function",
      function: {
        name: "run_python_analysis",
        description: "Run bounded Python analysis on explicitly provided JSON inputs in the separately configured isolated sandbox. Do not use network, filesystem, or secrets.",
        parameters: {
          type: "object",
          properties: {
            code: { type: "string", minLength: 1, maxLength: 16000 },
            inputs: { type: "object", additionalProperties: true },
          },
          required: ["code", "inputs"],
          additionalProperties: false,
        },
      },
    });
  }
  return tools;
}

export function validateAgentMessage(message) {
  if (typeof message !== "string" || !message.trim()) {
    const error = new Error("Enter a message for ExecAI.");
    error.status = 400;
    throw error;
  }
  if (message.length > 1_200) {
    const error = new Error("ExecAI messages must be 1,200 characters or fewer.");
    error.status = 400;
    throw error;
  }
  if (containsPromptInjection(message)) {
    const error = new Error("That request conflicts with ExecAI's security rules. Ask about information or tasks you are authorized to access.");
    error.status = 400;
    error.code = "AI_REQUEST_BLOCKED";
    throw error;
  }
  return message.trim();
}

export function safeHistory(history = []) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((message) =>
      message &&
      ["user", "assistant"].includes(message.role) &&
      typeof message.content === "string",
    )
    .slice(-8)
    .map(({ role, content }) => ({ role, content: content.slice(0, 1_200) }));
}

export function modelRouteForMessage(message) {
  const complex = message.length > 250 ||
    /\b(compare|analy[sz]e|forecast|recommend|trend|across|summari[sz]e|investigate|multi-step)\b/i.test(message);
  return complex ? "agent" : "fast";
}

export function providerFallbackIntent(message) {
  const text = message.trim().toLowerCase().replace(/[?.!]+$/, "");
  if (/^(?:give me |show me |provide |give |show )?(?:an? |the |my )?(?:authorized )?(?:workspace|module) overview(?: of my authorized workspace modules)?$/.test(text) ||
      /^give me an overview of my authorized workspace modules$/.test(text)) return "overview";
  if (/^(?:(?:what is|what's|explain|describe|summari[sz]e|tell me about) (?:execui's |the |your )?(?:refund|privacy|security|acceptable use|cancellation|trial|data protection) policy|(?:what are|explain|describe) (?:execui's |the |your )?terms of service)$/.test(text)) return "policy";
  if (/^when does (?:my |the )?refund request window (?:end|start)(?: after (?:the |my )?free trial)?$/.test(text)) return "policy";
  return null;
}
