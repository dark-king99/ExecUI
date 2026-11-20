import test from "node:test";
import assert from "node:assert/strict";

process.env.AI_API_KEY = "test-only-key";
process.env.POSTHOG_KEY = "";
process.env.NODE_ENV = "production";
const { complete, completeWithTools } = await import("../src/lib/ai.js");
const prisma = (await import("../src/config/database.js")).default;
const { consume, release } = await import("../src/lib/aiQuota.js");
const { aiLimitFor } = await import("../src/modules/billing/plans.config.js");
const { chat } = await import("../src/modules/assistant/assistant.service.js");
const controller = await import("../src/modules/assistant/assistant.controller.js");

const originalFetch = globalThis.fetch;
const delegates = [
  [prisma, "$transaction"],
  [prisma.tenant, "findUnique"],
  [prisma.aiUsage, "upsert"],
  [prisma.aiUsage, "updateMany"],
  [prisma.assistantRun, "create"],
  [prisma.assistantRun, "update"],
  [prisma.contact, "count"],
  [prisma.crmOpportunity, "count"],
  [prisma.crmTask, "count"],
  [prisma.crmTicket, "count"],
];
const originalMethods = delegates.map(([delegate, name]) => delegate[name]);

function fakeDatabase(initialCount = 0) {
  let count = initialCount;
  const updates = [];
  prisma.tenant.findUnique = async () => ({ plan: "starter" });
  prisma.aiUsage.upsert = async () => ({});
  prisma.aiUsage.updateMany = async ({ where, data }) => {
    if (where.count.lt !== undefined && count >= where.count.lt) return { count: 0 };
    if (where.count.gt !== undefined && count <= where.count.gt) return { count: 0 };
    count += data.count.increment ?? -(data.count.decrement ?? 0);
    return { count: 1 };
  };
  prisma.assistantRun.create = async ({ data }) => data;
  prisma.assistantRun.update = async ({ data }) => { updates.push(data); return data; };
  for (const model of [prisma.contact, prisma.crmOpportunity, prisma.crmTask, prisma.crmTicket]) {
    model.count = async () => 0;
  }
  return { updates, count: () => count };
}

function restore() {
  globalThis.fetch = originalFetch;
  delegates.forEach(([delegate, name], index) => { delegate[name] = originalMethods[index]; });
}

const modelMissing = () => ({
  ok: false,
  status: 404,
  json: async () => ({ error: { code: "model_not_found", message: "private provider detail" } }),
});
const request = {
  userId: "test-user",
  tenantId: "test-tenant",
  role: "enterprise_admin",
  access: { sections: ["crm"] },
  message: "What is the refund policy?",
};

test("both clients classify model and network errors without returning provider details", async () => {
  try {
    globalThis.fetch = async () => modelMissing();
    for (const run of [
      () => complete({ system: "test", user: "hello" }),
      () => completeWithTools({ system: "test", messages: [{ role: "user", content: "hello" }] }),
    ]) await assert.rejects(run, (error) =>
      error.code === "AI_MODEL_UNAVAILABLE" && error.status === 503 &&
      error.refundable && !error.message.includes("private provider detail"));
    globalThis.fetch = async () => { throw new TypeError("fetch failed", { cause: Object.assign(new Error("network"), { code: "ENOTFOUND" }) }); };
    await assert.rejects(() => completeWithTools({ messages: [] }), { code: "AI_PROVIDER_CONNECTION", refundable: true });
    globalThis.fetch = async () => { throw Object.assign(new Error("timeout"), { name: "AbortError" }); };
    await assert.rejects(() => completeWithTools({ messages: [] }), { code: "AI_PROVIDER_TIMEOUT", refundable: false });
  } finally { restore(); }
});

test("reservations enforce limits atomically and release in the original month", async () => {
  const limit = aiLimitFor("starter");
  const db = fakeDatabase(limit - 1);
  const periods = [];
  const update = prisma.aiUsage.updateMany;
  prisma.aiUsage.updateMany = async (args) => { periods.push(args.where.period); return update(args); };
  try {
    const results = await Promise.allSettled([consume("test-tenant"), consume("test-tenant")]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(results.find((result) => result.status === "rejected").reason.code, "AI_QUOTA_EXCEEDED");
    const reservation = results.find((result) => result.status === "fulfilled").value;
    await release("test-tenant", { ...reservation, period: "2020-12" });
    assert.equal(periods.at(-1), "2020-12");
    assert.equal(db.count(), limit - 1);
  } finally { restore(); }
});

test("provider rejection yields labeled overview fallback and releases quota", async () => {
  const db = fakeDatabase();
  globalThis.fetch = async () => modelMissing();
  const events = [];
  try {
    const result = await chat({
      ...request, message: "Give me an overview of my authorized workspace modules.",
      onEvent: async (event) => events.push(event),
    });
    assert.equal(db.count(), 0);
    assert.equal(result.task.status, "needs_attention");
    assert.match(result.reply, /Local read-only mode:.*model is unavailable/);
    assert.equal(result.task.visualization[0].kind, "overview");
    assert.equal(db.updates.at(-1).status, "needs_attention");
    assert.equal(events.at(-1).type, "completed");
  } finally { restore(); }
});

test("ambiguous timeouts retain quota even when a read-only fallback is available", async () => {
  const db = fakeDatabase();
  globalThis.fetch = async () => { throw Object.assign(new Error("timeout"), { name: "AbortError" }); };
  try {
    const result = await chat({ ...request, message: "Give me an overview of my authorized workspace modules." });
    assert.equal(result.task.status, "needs_attention");
    assert.match(result.reply, /Local read-only mode:.*did not respond in time/);
    assert.equal(db.count(), 1);
  } finally { restore(); }
});

test("mutating requests fail instead of falling back and preserve safe error in history", async () => {
  const db = fakeDatabase();
  globalThis.fetch = async () => modelMissing();
  const events = [];
  try {
    await assert.rejects(() => chat({
      ...request, message: "Create a contact and show the workspace overview",
      onEvent: async (event) => events.push(event),
    }), { code: "AI_MODEL_UNAVAILABLE" });
    assert.equal(db.count(), 0);
    assert.equal(db.updates.at(-1).status, "failed");
    assert.match(db.updates.at(-1).response, /model is unavailable/);
    assert.equal(events.at(-1).type, "failed");
  } finally { restore(); }
});

test("a failure after a tool call is not replayed or refunded", async () => {
  const db = fakeDatabase();
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls > 1) return modelMissing();
    return {
      ok: true, status: 200,
      json: async () => ({ choices: [{ message: {
        content: null,
        tool_calls: [{ id: "call-1", function: { name: "search_execui_policy", arguments: '{"query":"refund policy"}' } }],
      } }] }),
    };
  };
  try {
    await assert.rejects(() => chat({ ...request, message: "Find open work and explain the refund policy" }), (error) =>
      error.code === "AI_MODEL_UNAVAILABLE" && /review the saved run/i.test(error.message));
    assert.equal(calls, 2);
    assert.equal(db.count(), 1);
    assert.equal(db.updates.at(-1).status, "failed");
    assert.ok(db.updates.some((entry) => entry.steps?.some((step) => step.name === "search_execui_policy")));
  } finally { restore(); }
});

test("simple policy questions return the retrieved text without a model paraphrase", async () => {
  const db = fakeDatabase();
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return {
      ok: true, status: 200,
      json: async () => ({ choices: [{ message: {
        content: "The refund window starts 30 days after payment.",
        tool_calls: [{ id: "call-1", function: { name: "search_execui_policy", arguments: '{"query":"refund policy"}' } }],
      } }] }),
    };
  };
  try {
    const result = await chat(request);
    assert.equal(calls, 0);
    assert.equal(db.count(), 0);
    assert.match(result.reply, /within 30 days after the first subscription payment/);
    assert.doesNotMatch(result.reply, /starts 30 days after payment/);
    assert.equal(result.task.status, "completed");
  } finally { restore(); }
});

test("subsequent tool turn retains read tools but does not reoffer writes", async () => {
  fakeDatabase();
  const offered = [];
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    offered.push((body.tools || []).map((tool) => tool.function.name));
    if (!body.tools) assert.equal(body.tool_choice, undefined);
    const turn = offered.length;
    return {
      ok: true, status: 200,
      json: async () => ({ choices: [{ message: turn < 3 ? {
        content: null,
        tool_calls: [{ id: `call-${turn}`, function: { name: "search_execui_policy", arguments: '{"query":"refund policy"}' } }],
      } : { content: "Completed the read-only review." } }] }),
    };
  };
  try {
    const result = await chat({ ...request, message: "Find open work and explain the refund policy" });
    assert.equal(result.task.steps.length, 2);
    assert.ok(offered[0].includes("create_record"));
    assert.ok(offered[1].includes("search_records"));
    assert.ok(!offered[1].includes("create_record"));
    assert.deepEqual(offered[2], []);
  } finally { restore(); }
});

test("task creation defaults to the signed-in user and preserves tool names in saved runs", async () => {
  const db = fakeDatabase();
  let created;
  let audit;
  prisma.$transaction = async (fn) => fn({
    crmTask: { create: async ({ data }) => { created = data; return { id: "task-id", ...data }; } },
    auditLog: { create: async ({ data }) => { audit = data; } },
  });
  let calls = 0;
  globalThis.fetch = async () => ({
    ok: true, status: 200,
    json: async () => ({ choices: [{ message: ++calls === 1 ? {
      content: null,
      tool_calls: [{ id: "create-1", function: { name: "create_record", arguments: JSON.stringify({
        resource: "tasks", fields: { title: "Test task", status: "pending", priority: "medium", task_type: "review" },
      }) } }],
    } : { content: "I could not create the task." } }] }),
  });
  try {
    const result = await chat({ ...request, message: "Create a test task" });
    assert.equal(result.task.status, "completed");
    assert.equal(created.userId, request.userId);
    assert.equal(audit.resourceId, "task-id");
    assert.equal(audit.action, "ai_agent.record_created");
    assert.match(result.reply, /Created a crmtask record/);
    assert.doesNotMatch(result.reply, /could not create/i);
    assert.equal(result.task.visualization[0].action, "create");
    assert.equal(db.updates.at(-1).steps[0].name, "create_record");
    assert.equal(db.updates.at(-1).result.task.steps[0].name, "create_record");
  } finally { restore(); }
});

test("JSON and SSE report the same safe provider error", async () => {
  fakeDatabase();
  globalThis.fetch = async () => modelMissing();
  const req = {
    user: { userId: request.userId, tenantId: request.tenantId, role: request.role },
    access: request.access,
    body: { message: "Create a contact" },
  };
  let status;
  let json;
  let stream = "";
  const res = {
    status(value) { status = value; return this; },
    json(value) { json = value; },
    set() {}, flushHeaders() {}, on() {},
    write(value) { stream += value; },
    end() {},
  };
  try {
    await controller.chat(req, res);
    assert.equal(status, 503);
    await controller.streamChat(req, res);
    const failed = stream.split("\n").filter((line) => line.startsWith("data: "))
      .map((line) => JSON.parse(line.slice(6))).find((event) => event.type === "failed");
    assert.equal(failed.message, json.message);
    assert.doesNotMatch(stream, /private provider detail/);
  } finally { restore(); }
});
