/**
 * HR & payroll registry — the declarative core of People Ops.
 *
 * Employment types, pay frequencies, component kinds and the pay-run lifecycle
 * are declared once here; the services ask this file rather than hand-writing
 * `if (status === …)` checks. As with the CLM module, the transition map is the
 * rule book — it's what stops a draft pay run being marked "paid" without ever
 * being calculated or approved.
 *
 * Pure module: no database, no I/O, fully unit-tested.
 */

// ── Employment ───────────────────────────────────────────────────────────────
export const EMPLOYMENT_TYPES = [
  { id: "full_time",  label: "Full time",  paidLeave: true },
  { id: "part_time",  label: "Part time",  paidLeave: true },
  { id: "contract",   label: "Contractor", paidLeave: false },
  { id: "intern",     label: "Intern",     paidLeave: true },
  { id: "temporary",  label: "Temporary",  paidLeave: false },
];

export const EMPLOYMENT_STATUSES = [
  { id: "active",     label: "Active",      onPayroll: true },
  { id: "probation",  label: "Probation",   onPayroll: true },
  { id: "on_leave",   label: "On leave",    onPayroll: true },
  { id: "notice",     label: "Serving notice", onPayroll: true },
  { id: "terminated", label: "Terminated",  onPayroll: false },
];

/** Statuses whose holders are included in a pay run. */
export const PAYABLE_STATUSES = EMPLOYMENT_STATUSES.filter((s) => s.onPayroll).map((s) => s.id);

export const WORK_LOCATIONS = ["office", "remote", "hybrid"];

// ── Pay ──────────────────────────────────────────────────────────────────────
/**
 * `periodsPerYear` is what turns an annual salary into one period's pay, and
 * what annualizes taxable pay for progressive tax. Semi-monthly is 24 (twice a
 * month), biweekly is 26 (every two weeks) — they are NOT the same thing, and
 * conflating them is a classic payroll bug.
 */
export const PAY_FREQUENCIES = [
  { id: "monthly",      label: "Monthly",       periodsPerYear: 12 },
  { id: "semimonthly",  label: "Twice monthly", periodsPerYear: 24 },
  { id: "biweekly",     label: "Every 2 weeks", periodsPerYear: 26 },
  { id: "weekly",       label: "Weekly",        periodsPerYear: 52 },
];

export const PAY_TYPES = [
  { id: "salary", label: "Salary", note: "A fixed annual amount, divided across the year's pay periods." },
  { id: "hourly", label: "Hourly", note: "Approved hours in the period × the hourly rate." },
];

export const COMPONENT_KINDS = [
  { id: "earning",               label: "Earning",              sign: 1,  note: "Added to gross pay (allowance, bonus, overtime uplift)." },
  { id: "deduction",             label: "Deduction",            sign: -1, note: "Taken from the employee's pay (pension, loan, union dues)." },
  { id: "employer_contribution", label: "Employer contribution", sign: 0, note: "A cost to the employer — never reduces take-home pay." },
];

export const COMPONENT_CALCS = [
  { id: "fixed",            label: "Fixed amount",     note: "The same cash amount every period." },
  { id: "percent_of_base",  label: "% of base pay",    note: "A percentage of the period's base pay, before other earnings." },
  { id: "percent_of_gross", label: "% of gross pay",   note: "A percentage of gross pay, after other earnings are added." },
];

export const COMPONENT_APPLIES_TO = [
  { id: "all",      label: "Everyone" },
  { id: "assigned", label: "Only assigned employees" },
];

// ── Pay-run lifecycle ────────────────────────────────────────────────────────
/**
 * A pay run's states, and the moves each allows.
 *
 * `locked` marks the states where the numbers are the record of what was paid —
 * recalculation and edits are refused there, because a pay run you can still
 * change after sign-off isn't evidence of anything.
 */
export const PAYRUN_STATES = {
  draft: {
    label: "Draft", tone: "slate",
    description: "Being prepared. Recalculate as often as you like.",
    to: ["review", "cancelled"],
  },
  review: {
    label: "In review", tone: "amber",
    description: "Calculated and awaiting sign-off. Still recalculable.",
    to: ["draft", "approved", "cancelled"],
  },
  approved: {
    label: "Approved", tone: "blue", locked: true,
    description: "Signed off. The figures are now fixed.",
    to: ["paid", "cancelled"],
  },
  paid: {
    label: "Paid", tone: "emerald", locked: true, terminal: true,
    description: "Recorded as paid. Payslips are final.",
    to: [],
  },
  cancelled: {
    label: "Cancelled", tone: "rose", terminal: true,
    description: "Abandoned. Nothing was paid.",
    to: [],
  },
};

export const PAYRUN_STATUSES = Object.keys(PAYRUN_STATES);
/** States where the figures may still be recomputed. */
export const EDITABLE_PAYRUN_STATUSES = PAYRUN_STATUSES.filter((s) => !PAYRUN_STATES[s].locked && !PAYRUN_STATES[s].terminal);

export function canTransitionRun(from, to) {
  const state = PAYRUN_STATES[from];
  if (!state || !PAYRUN_STATES[to]) return false;
  return state.to.includes(to);
}

export function runTransitionError(from, to) {
  if (!PAYRUN_STATES[from]) return `"${from}" isn't a pay-run status.`;
  if (!PAYRUN_STATES[to]) return `"${to}" isn't a pay-run status.`;
  if (from === to) return `This pay run is already ${PAYRUN_STATES[to].label.toLowerCase()}.`;
  const allowed = PAYRUN_STATES[from].to;
  if (!allowed.length) return `A ${PAYRUN_STATES[from].label.toLowerCase()} pay run is final — create a new run instead.`;
  return `A ${PAYRUN_STATES[from].label.toLowerCase()} pay run can only move to: ${allowed.map((s) => PAYRUN_STATES[s].label.toLowerCase()).join(", ")}.`;
}

export const nextRunStates = (from) => (PAYRUN_STATES[from]?.to ?? []).slice();
export const isRunLocked = (status) => !!PAYRUN_STATES[status]?.locked || !!PAYRUN_STATES[status]?.terminal;

// ── Leave ────────────────────────────────────────────────────────────────────
export const LEAVE_STATUSES = ["pending", "approved", "rejected", "cancelled"];

/**
 * Starter leave types. Deliberately conservative: entitlements are statutory and
 * vary by country, so these are a *starting point the organization edits*, not a
 * claim about what anyone is owed.
 */
export const DEFAULT_LEAVE_TYPES = [
  { code: "annual",    name: "Annual leave", paid: true,  annualDays: 20, carryOverMax: 5, colour: "emerald" },
  { code: "sick",      name: "Sick leave",   paid: true,  annualDays: 10, carryOverMax: 0, colour: "amber" },
  { code: "unpaid",    name: "Unpaid leave", paid: false, annualDays: 0,  carryOverMax: 0, colour: "slate" },
  { code: "parental",  name: "Parental leave", paid: true, annualDays: 0, carryOverMax: 0, colour: "violet" },
  { code: "bereavement", name: "Compassionate leave", paid: true, annualDays: 5, carryOverMax: 0, colour: "sky" },
];

export const TIME_ENTRY_STATUSES = ["draft", "submitted", "approved", "rejected"];

// ── Lookups ──────────────────────────────────────────────────────────────────
export const employmentType = (id) => EMPLOYMENT_TYPES.find((t) => t.id === id) || null;
export const employmentStatus = (id) => EMPLOYMENT_STATUSES.find((s) => s.id === id) || null;
export const payFrequency = (id) => PAY_FREQUENCIES.find((f) => f.id === id) || null;
export const componentKind = (id) => COMPONENT_KINDS.find((k) => k.id === id) || null;
export const componentCalc = (id) => COMPONENT_CALCS.find((c) => c.id === id) || null;

export const periodsPerYear = (frequency) => payFrequency(frequency)?.periodsPerYear ?? 12;

/** Everything the frontend needs to render the module, with no internals. */
export function catalog() {
  return {
    employmentTypes: EMPLOYMENT_TYPES,
    employmentStatuses: EMPLOYMENT_STATUSES,
    workLocations: WORK_LOCATIONS,
    payTypes: PAY_TYPES,
    payFrequencies: PAY_FREQUENCIES,
    componentKinds: COMPONENT_KINDS,
    componentCalcs: COMPONENT_CALCS,
    componentAppliesTo: COMPONENT_APPLIES_TO,
    payrunStates: Object.entries(PAYRUN_STATES).map(([id, s]) => ({
      id, label: s.label, tone: s.tone, description: s.description,
      to: s.to, locked: !!s.locked, terminal: !!s.terminal,
    })),
    leaveStatuses: LEAVE_STATUSES,
    defaultLeaveTypes: DEFAULT_LEAVE_TYPES,
    timeEntryStatuses: TIME_ENTRY_STATUSES,
  };
}
