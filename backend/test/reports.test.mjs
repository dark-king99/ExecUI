import test from "node:test";
import assert from "node:assert/strict";
import {
  DATASETS, getDataset, datasetsFor, canUseDataset, describeDataset, OPERATORS,
} from "../src/modules/reports/reports.datasets.js";
import {
  validateDefinition, buildWhere, resolveDateRange, aggAlias, MAX_ROWS,
} from "../src/modules/reports/reports.engine.js";
import { toCsv, sanitizeCell, safeFilename, displayValue } from "../src/modules/reports/reports.export.js";
import { computeNextRun, validateSchedule, zonedTimeToUtc, isValidTimezone } from "../src/modules/reports/reports.schedule.js";

const OPPS = getDataset("opportunities");

// ── Registry / access ────────────────────────────────────────────────────────
test("every dataset declares a queryable model and default fields it owns", () => {
  for (const d of Object.values(DATASETS)) {
    assert.ok(d.model, `${d.id} needs a model`);
    assert.ok(d.defaultFields?.length, `${d.id} needs defaultFields`);
    for (const f of d.defaultFields) assert.ok(d.fields[f], `${d.id}.${f} must exist in fields`);
    if (d.defaultSort) assert.ok(d.fields[d.defaultSort.field], `${d.id} defaultSort field must exist`);
    for (const [key, meta] of Object.entries(d.fields)) {
      assert.ok(OPERATORS[meta.type], `${d.id}.${key} has unknown type "${meta.type}"`);
    }
  }
});

test("datasets are gated by section access, and employee data is admin-only", () => {
  const crmOnly = datasetsFor({ sections: ["crm"], isAdmin: false }).map((d) => d.id);
  assert.ok(crmOnly.includes("opportunities"));
  assert.ok(!crmOnly.includes("campaigns"), "marketing dataset must not leak to a CRM-only user");
  assert.ok(!crmOnly.includes("employees"), "employee PII must not leak to a non-admin");

  // Admin still needs the section for module datasets, but gets people data.
  const adminCrm = datasetsFor({ sections: ["crm"], isAdmin: true }).map((d) => d.id);
  assert.ok(adminCrm.includes("employees"));
  assert.ok(!adminCrm.includes("devices"));

  assert.equal(canUseDataset(getDataset("employees"), { sections: [], isAdmin: false }), false);
  assert.equal(canUseDataset(getDataset("employees"), { sections: [], isAdmin: true }), true);
});

test("describeDataset exposes only allowed operators per field type", () => {
  const d = describeDataset(OPPS);
  const value = d.fields.find((f) => f.key === "value");
  assert.equal(value.type, "number");
  assert.deepEqual(value.operators, OPERATORS.number);
  assert.ok(value.aggregatable);
});

// ── Definition validation (the injection boundary) ───────────────────────────
test("unknown fields are rejected everywhere they could be injected", () => {
  const evil = "value; DROP TABLE users";
  assert.throws(() => validateDefinition(OPPS, { fields: [evil] }), /Unknown field/);
  assert.throws(() => validateDefinition(OPPS, { filters: [{ field: evil, op: "eq", value: 1 }] }), /Unknown field/);
  assert.throws(() => validateDefinition(OPPS, { groupBy: evil }), /Unknown field/);
  assert.throws(() => validateDefinition(OPPS, { sort: { field: evil } }), /Unknown field/);
  assert.throws(() => validateDefinition(OPPS, { groupBy: "stage", aggregations: [{ fn: "sum", field: evil }] }), /Unknown field/);
});

test("operators are constrained to the field's type", () => {
  assert.throws(() => validateDefinition(OPPS, { filters: [{ field: "value", op: "contains", value: "x" }] }), /not allowed/);
  assert.throws(() => validateDefinition(OPPS, { filters: [{ field: "stage", op: "gt", value: "x" }] }), /not allowed/);
  const ok = validateDefinition(OPPS, { filters: [{ field: "value", op: "gte", value: "100" }] });
  assert.equal(ok.filters[0].value, 100, "numeric filter values are coerced to numbers");
});

test("aggregations reject non-aggregatable fields and unknown functions", () => {
  assert.throws(() => validateDefinition(OPPS, { groupBy: "stage", aggregations: [{ fn: "median", field: "value" }] }), /Unknown aggregation/);
  assert.throws(() => validateDefinition(OPPS, { groupBy: "stage", aggregations: [{ fn: "sum", field: "name" }] }), /can't be aggregated/);
  assert.throws(() => validateDefinition(OPPS, { groupBy: "name" }), /can't be grouped by/);
});

test("grouping defaults to count and aliases aggregates predictably", () => {
  const def = validateDefinition(OPPS, { groupBy: "stage" });
  assert.deepEqual(def.aggregations, [{ fn: "count", field: null }]);
  assert.equal(aggAlias({ fn: "count", field: null }), "count");
  assert.equal(aggAlias({ fn: "sum", field: "value" }), "sum_value");
});

test("grouped sort must reference the group key or an aggregate", () => {
  assert.throws(
    () => validateDefinition(OPPS, { groupBy: "stage", aggregations: [{ fn: "count" }], sort: { field: "value", dir: "desc" } }),
    /Sort field must be/,
  );
  const ok = validateDefinition(OPPS, { groupBy: "stage", aggregations: [{ fn: "sum", field: "value" }], sort: { field: "sum_value", dir: "desc" } });
  assert.equal(ok.sort.field, "sum_value");
});

test("limit is clamped to the row ceiling and defaults applied", () => {
  assert.equal(validateDefinition(OPPS, { limit: 10_000_000 }).limit, MAX_ROWS);
  assert.equal(validateDefinition(OPPS, { limit: -5 }).limit, 1);
  assert.deepEqual(validateDefinition(OPPS, {}).fields, OPPS.defaultFields);
});

// ── Where building ───────────────────────────────────────────────────────────
test("filters map to parameterized Prisma clauses", () => {
  const def = validateDefinition(OPPS, {
    filters: [
      { field: "stage", op: "eq", value: "proposal" },
      { field: "value", op: "between", value: [10, 20] },
      { field: "name", op: "contains", value: "acme" },
    ],
  });
  const where = buildWhere(OPPS, def);
  assert.equal(where.stage, "proposal");
  assert.deepEqual(where.value, { gte: 10, lte: 20 });
  assert.deepEqual(where.name, { contains: "acme", mode: "insensitive" });
});

test("date presets resolve to bounded UTC ranges", () => {
  const now = new Date("2026-07-29T13:45:00Z");
  const r7 = resolveDateRange("last_7_days", null, null, now);
  assert.equal(r7.gte.toISOString(), "2026-07-23T00:00:00.000Z");
  assert.equal(r7.lt.toISOString(), "2026-07-30T00:00:00.000Z");

  const month = resolveDateRange("this_month", null, null, now);
  assert.equal(month.gte.toISOString(), "2026-07-01T00:00:00.000Z");
  assert.equal(month.lt.toISOString(), "2026-08-01T00:00:00.000Z");

  assert.equal(resolveDateRange("all_time", null, null, now), null);
});

test("datestr fields compare as ISO strings, not Dates", () => {
  const tx = getDataset("transactions");
  const def = validateDefinition(tx, { dateRange: { field: "date", preset: "this_month" } });
  const where = buildWhere(tx, def, new Date("2026-07-29T00:00:00Z"));
  assert.equal(where.date.gte, "2026-07-01");
  assert.equal(where.date.lt, "2026-08-01");
});

// ── Export safety ────────────────────────────────────────────────────────────
test("spreadsheet formula injection is neutralised", () => {
  for (const evil of ["=cmd|' /C calc'!A0", "+1+1", "-2+3", "@SUM(A1)", "\tx", "\rx"]) {
    assert.ok(sanitizeCell(evil).startsWith("'"), `${JSON.stringify(evil)} must be escaped`);
  }
  assert.equal(sanitizeCell("Acme Corp"), "Acme Corp", "ordinary text is untouched");
});

test("CSV quotes separators, newlines and doubles embedded quotes", () => {
  const csv = toCsv({
    columns: [{ key: "a", label: "A" }, { key: "b", label: "B" }],
    rows: [{ a: 'says "hi", loudly', b: "line1\nline2" }],
  }).toString("utf8");
  assert.ok(csv.includes('"says ""hi"", loudly"'));
  assert.ok(csv.includes('"line1\nline2"'));
  assert.ok(csv.startsWith("﻿"), "BOM so Excel reads UTF-8");
});

test("filenames are sanitised against path traversal", () => {
  const f = safeFilename("../../etc/passwd", "csv");
  assert.ok(!f.includes("/") && !f.includes(".."), f);
  assert.ok(f.endsWith(".csv"));
  assert.ok(safeFilename("", "pdf").startsWith("report-"));
});

test("display values are stable for dates, booleans and nulls", () => {
  assert.equal(displayValue(new Date("2026-07-29T10:20:30Z")), "2026-07-29 10:20:30");
  assert.equal(displayValue(true), "Yes");
  assert.equal(displayValue(null), "");
});

// ── Scheduling ───────────────────────────────────────────────────────────────
test("daily schedule lands on the next local occurrence", () => {
  const from = new Date("2026-07-29T10:00:00Z");
  const next = computeNextRun({ frequency: "daily", hour: 7, minute: 30, timezone: "UTC" }, from);
  assert.equal(next.toISOString(), "2026-07-30T07:30:00.000Z", "07:30 already passed today");

  const earlier = computeNextRun({ frequency: "daily", hour: 23, minute: 0, timezone: "UTC" }, from);
  assert.equal(earlier.toISOString(), "2026-07-29T23:00:00.000Z", "later today still counts");
});

test("weekly schedule picks the right weekday", () => {
  // 2026-07-29 is a Wednesday; next Monday is 2026-08-03.
  const next = computeNextRun({ frequency: "weekly", weekday: 1, hour: 7, minute: 0, timezone: "UTC" }, new Date("2026-07-29T10:00:00Z"));
  assert.equal(next.toISOString(), "2026-08-03T07:00:00.000Z");
  assert.equal(next.getUTCDay(), 1);
});

test("monthly schedule rolls into the next month once the day has passed", () => {
  const next = computeNextRun({ frequency: "monthly", dayOfMonth: 1, hour: 6, minute: 0, timezone: "UTC" }, new Date("2026-07-29T10:00:00Z"));
  assert.equal(next.toISOString(), "2026-08-01T06:00:00.000Z");
});

test("cadence honours the organization's timezone across DST", () => {
  // New York is UTC-4 in July (EDT) and UTC-5 in January (EST): 08:00 local
  // must map to different UTC instants, which is the whole point of storing a zone.
  const summer = computeNextRun({ frequency: "daily", hour: 8, minute: 0, timezone: "America/New_York" }, new Date("2026-07-29T00:00:00Z"));
  assert.equal(summer.toISOString(), "2026-07-29T12:00:00.000Z");

  const winter = computeNextRun({ frequency: "daily", hour: 8, minute: 0, timezone: "America/New_York" }, new Date("2026-01-15T00:00:00Z"));
  assert.equal(winter.toISOString(), "2026-01-15T13:00:00.000Z");
});

test("zonedTimeToUtc converts wall-clock time in a zone to the right instant", () => {
  assert.equal(zonedTimeToUtc(2026, 6, 29, 9, 0, "Africa/Monrovia").toISOString(), "2026-07-29T09:00:00.000Z");
  assert.equal(zonedTimeToUtc(2026, 6, 29, 9, 0, "Asia/Tokyo").toISOString(), "2026-07-29T00:00:00.000Z");
  assert.equal(isValidTimezone("Not/AZone"), false);
  assert.equal(isValidTimezone("Europe/Berlin"), true);
});

test("schedule payloads are validated and normalised", () => {
  assert.throws(() => validateSchedule({ recipients: [] }), /at least one recipient/);
  assert.throws(() => validateSchedule({ recipients: ["nope"] }), /not a valid email/);

  const s = validateSchedule({
    frequency: "monthly", format: "pdf", timezone: "Europe/Berlin",
    recipients: ["A@Example.com", "a@example.com", " b@example.com "],
    hour: 99, minute: -3, dayOfMonth: 31,
  });
  assert.deepEqual(s.recipients, ["a@example.com", "b@example.com"], "deduped + normalised");
  assert.equal(s.hour, 23, "hour clamped");
  assert.equal(s.minute, 0, "minute clamped");
  assert.equal(s.dayOfMonth, 28, "day clamped so every month can fire");
  assert.equal(s.weekday, null);

  const bogusTz = validateSchedule({ recipients: ["a@b.co"], timezone: "Mars/Base" });
  assert.equal(bogusTz.timezone, "UTC", "unknown zone falls back to UTC");
  const bogusFmt = validateSchedule({ recipients: ["a@b.co"], format: "exe" });
  assert.equal(bogusFmt.format, "csv", "unknown format falls back to CSV");
});
