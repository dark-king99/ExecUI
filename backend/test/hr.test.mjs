import test from "node:test";
import assert from "node:assert/strict";
import {
  EMPLOYMENT_TYPES, EMPLOYMENT_STATUSES, PAYABLE_STATUSES, PAY_FREQUENCIES,
  COMPONENT_KINDS, COMPONENT_CALCS, PAYRUN_STATES, PAYRUN_STATUSES,
  EDITABLE_PAYRUN_STATUSES, DEFAULT_LEAVE_TYPES,
  canTransitionRun, runTransitionError, nextRunStates, isRunLocked,
  periodsPerYear, payFrequency, employmentType, employmentStatus, catalog,
} from "../src/modules/hr/hr.registry.js";
import {
  round2, calendarDays, workingDays, employmentFactor, validateBands,
  annualTax, periodTax, componentAmount, componentActive, basePayFor,
  computePayslip, runTotals, compensationAt, leaveDaysInPeriod, requestedDays,
  remainingDays,
} from "../src/modules/hr/payroll.engine.js";

// ── Registry ─────────────────────────────────────────────────────────────────
test("employment types and statuses are internally consistent", () => {
  for (const t of EMPLOYMENT_TYPES) {
    assert.ok(t.id && t.label, "needs an id and label");
    assert.equal(typeof t.paidLeave, "boolean");
  }
  for (const s of EMPLOYMENT_STATUSES) {
    assert.ok(s.id && s.label);
    assert.equal(typeof s.onPayroll, "boolean");
  }
  assert.equal(employmentType("nope"), null);
  assert.equal(employmentStatus("nope"), null);
});

test("a terminated employee is never on payroll", () => {
  // If this flips, a leaver keeps being paid — the single worst payroll bug.
  assert.ok(!PAYABLE_STATUSES.includes("terminated"));
  assert.ok(PAYABLE_STATUSES.includes("active"));
  assert.ok(PAYABLE_STATUSES.includes("on_leave"), "someone on leave is still employed and still paid");
  assert.ok(PAYABLE_STATUSES.includes("notice"), "serving notice means still being paid");
});

test("pay frequencies have the right number of periods", () => {
  // Semi-monthly (24) and biweekly (26) are different things; conflating them
  // is a classic payroll error worth locking down.
  assert.equal(periodsPerYear("monthly"), 12);
  assert.equal(periodsPerYear("semimonthly"), 24);
  assert.equal(periodsPerYear("biweekly"), 26);
  assert.equal(periodsPerYear("weekly"), 52);
  assert.equal(periodsPerYear("nonsense"), 12, "an unknown frequency falls back to monthly rather than dividing by zero");
  for (const f of PAY_FREQUENCIES) assert.ok(f.periodsPerYear > 0);
});

test("component kinds declare which direction they move money", () => {
  const byId = Object.fromEntries(COMPONENT_KINDS.map((k) => [k.id, k]));
  assert.equal(byId.earning.sign, 1);
  assert.equal(byId.deduction.sign, -1);
  assert.equal(byId.employer_contribution.sign, 0, "an employer cost never changes take-home pay");
  assert.equal(COMPONENT_CALCS.length, 3);
});

test("the starter leave types are conservative and include an unpaid option", () => {
  const unpaid = DEFAULT_LEAVE_TYPES.find((t) => t.code === "unpaid");
  assert.ok(unpaid && unpaid.paid === false, "there must be a way to record unpaid leave");
  assert.equal(unpaid.annualDays, 0, "unpaid leave has no entitlement to draw down");
  for (const t of DEFAULT_LEAVE_TYPES) {
    assert.ok(t.code && t.name);
    assert.ok(t.annualDays >= 0 && t.annualDays <= 40, `${t.code} default looks implausible`);
  }
});

// ── Pay-run lifecycle ────────────────────────────────────────────────────────
test("every pay-run state is consistent and points at real states", () => {
  for (const [id, s] of Object.entries(PAYRUN_STATES)) {
    assert.ok(s.label && s.description, `${id} needs a label and description`);
    for (const to of s.to) {
      assert.ok(PAYRUN_STATES[to], `${id} points at unknown state "${to}"`);
      assert.notEqual(to, id);
    }
  }
});

test("an approved or paid run is locked against recalculation", () => {
  // This is the guarantee that makes a payslip evidence rather than a draft.
  assert.ok(isRunLocked("approved"));
  assert.ok(isRunLocked("paid"));
  assert.ok(!isRunLocked("draft"));
  assert.ok(!isRunLocked("review"));
  assert.deepEqual(EDITABLE_PAYRUN_STATUSES, ["draft", "review"]);
});

test("a run cannot jump from draft straight to paid", () => {
  assert.ok(!canTransitionRun("draft", "paid"), "paying an uncalculated run must be impossible");
  assert.ok(!canTransitionRun("draft", "approved"), "approval requires a calculated run in review");
  assert.ok(canTransitionRun("draft", "review"));
  assert.ok(canTransitionRun("review", "approved"));
  assert.ok(canTransitionRun("approved", "paid"));
  assert.ok(!canTransitionRun("paid", "draft"), "a paid run is final");
  assert.ok(!canTransitionRun("cancelled", "paid"));
  assert.deepEqual(nextRunStates("paid"), []);
});

test("a refused pay-run transition explains what is allowed", () => {
  assert.match(runTransitionError("draft", "paid"), /can only move to/i);
  assert.match(runTransitionError("paid", "draft"), /final/i);
  assert.match(runTransitionError("draft", "draft"), /already/i);
  assert.match(runTransitionError("draft", "bogus"), /isn't a pay-run status/);
});

test("the catalog exposes the lifecycle the UI needs", () => {
  const c = catalog();
  assert.equal(c.payrunStates.length, PAYRUN_STATUSES.length);
  assert.ok(c.payrunStates.every((s) => "locked" in s && "to" in s));
  assert.ok(c.payFrequencies.every((f) => f.periodsPerYear > 0));
});

// ── Day counting ─────────────────────────────────────────────────────────────
test("working days exclude weekends and are inclusive of both ends", () => {
  // 2026-03-01 is a Sunday; 2026-03-31 a Tuesday. March 2026 has 22 weekdays.
  assert.equal(workingDays("2026-03-01", "2026-03-31"), 22);
  assert.equal(calendarDays("2026-03-01", "2026-03-31"), 31);
  assert.equal(workingDays("2026-03-02", "2026-03-02"), 1, "a single weekday counts as one");
  assert.equal(workingDays("2026-03-07", "2026-03-08"), 0, "a weekend contains no working days");
  assert.equal(workingDays("2026-03-31", "2026-03-01"), 0, "a reversed range is zero, not negative");
});

test("proration uses working days, and a full period is not prorated", () => {
  const full = employmentFactor({ periodStart: "2026-03-01", periodEnd: "2026-03-31" });
  assert.equal(full.factor, 1);
  assert.equal(full.prorated, false);
  assert.equal(full.workingDaysInPeriod, 22);

  // Joined 16 March 2026 (a Monday) ⇒ 12 of 22 working days.
  const joiner = employmentFactor({ periodStart: "2026-03-01", periodEnd: "2026-03-31", hireDate: "2026-03-16" });
  assert.equal(joiner.workedWorkingDays, 12);
  assert.equal(joiner.prorated, true);
  assert.equal(round2(joiner.factor), round2(12 / 22));

  // Left 13 March 2026 (a Friday) ⇒ 10 of 22.
  const leaver = employmentFactor({ periodStart: "2026-03-01", periodEnd: "2026-03-31", endDate: "2026-03-13" });
  assert.equal(leaver.workedWorkingDays, 10);

  // Hired before and leaving after the period ⇒ the whole period.
  const spanning = employmentFactor({ periodStart: "2026-03-01", periodEnd: "2026-03-31", hireDate: "2020-01-01", endDate: "2030-01-01" });
  assert.equal(spanning.factor, 1);
});

// ── Tax ──────────────────────────────────────────────────────────────────────
const TABLE = { name: "Test", allowance: 12000, bands: [{ upTo: 50000, rate: 20 }, { upTo: 125000, rate: 40 }, { upTo: null, rate: 45 }] };

test("bands are validated as cumulative thresholds with an open top", () => {
  const ok = validateBands([{ upTo: "50000", rate: "20" }, { upTo: null, rate: "40" }]);
  assert.deepEqual(ok, [{ upTo: 50000, rate: 20 }, { upTo: null, rate: 40 }]);

  assert.throws(() => validateBands([]), /at least one band/i);
  assert.throws(() => validateBands([{ upTo: 100, rate: 20 }, { upTo: 50, rate: 30 }, { upTo: null, rate: 40 }]), /greater than the previous/i);
  assert.throws(() => validateBands([{ upTo: 100, rate: 20 }, { upTo: 200, rate: 30 }]), /last band must be open-ended/i);
  assert.throws(() => validateBands([{ upTo: null, rate: 120 }]), /between 0 and 100/i);
  assert.throws(() => validateBands([{ upTo: null, rate: -5 }]), /between 0 and 100/i);
});

test("tax is marginal — each rate applies only inside its own band", () => {
  // Below the allowance ⇒ nothing.
  assert.equal(annualTax(10_000, TABLE), 0);
  assert.equal(annualTax(12_000, TABLE), 0);
  // 20% on the first 1,000 above the allowance.
  assert.equal(annualTax(13_000, TABLE), 200);
  // 50,000 taxable ⇒ the whole first band.
  assert.equal(annualTax(62_000, TABLE), 10_000);
  // 60,000 taxable ⇒ 50,000 @ 20% + 10,000 @ 40%.
  assert.equal(annualTax(72_000, TABLE), 10_000 + 4_000);
  // 200,000 taxable ⇒ 50,000@20 + 75,000@40 + 75,000@45.
  assert.equal(annualTax(212_000, TABLE), 10_000 + 30_000 + 33_750);
  assert.equal(annualTax(50_000, null), 0, "no table ⇒ no tax, rather than a crash");
  assert.equal(annualTax(-100, TABLE), 0, "negative income is not a refund");
});

test("period tax annualizes, so frequency doesn't change the annual total", () => {
  const monthly = periodTax(5_000, TABLE, "monthly") * 12;
  const weekly = periodTax((5_000 * 12) / 52, TABLE, "weekly") * 52;
  // Rounding per period means they land within a few cents of each other, not
  // exactly equal — but nowhere near a whole currency unit apart.
  assert.ok(Math.abs(monthly - weekly) < 1, `monthly ${monthly} vs weekly ${weekly}`);
  assert.equal(periodTax(5_000, null, "monthly"), 0);
});

// ── Components ───────────────────────────────────────────────────────────────
test("percentages state what they are a percentage of", () => {
  const base = { amount: 10, capPerPeriod: null };
  assert.equal(componentAmount({ ...base, calc: "percent_of_base" }, { basePay: 1000, grossSoFar: 1500 }), 100);
  assert.equal(componentAmount({ ...base, calc: "percent_of_gross" }, { basePay: 1000, grossSoFar: 1500 }), 150);
  assert.equal(componentAmount({ ...base, calc: "fixed", amount: 250 }, { basePay: 1000, grossSoFar: 1500 }), 250);
});

test("an employee override beats the catalog amount, and caps are honoured", () => {
  const component = { calc: "fixed", amount: 100, capPerPeriod: null };
  assert.equal(componentAmount(component, { basePay: 0, grossSoFar: 0, override: 250 }), 250);
  assert.equal(componentAmount(component, { basePay: 0, grossSoFar: 0, override: null }), 100);
  assert.equal(componentAmount({ calc: "percent_of_base", amount: 50, capPerPeriod: 200 }, { basePay: 1000, grossSoFar: 1000 }), 200,
    "the cap wins over the percentage");
  assert.equal(componentAmount({ calc: "fixed", amount: 0 }, { basePay: 1000, grossSoFar: 1000 }), 0);
});

test("an assignment's effective dates decide whether it applies", () => {
  const period = ["2026-03-01", "2026-03-31"];
  assert.ok(componentActive(null, ...[period[1], period[0]]), "no assignment ⇒ applies to everyone");
  assert.ok(componentActive({ active: true }, period[1], period[0]));
  assert.ok(!componentActive({ active: false }, period[1], period[0]));
  assert.ok(!componentActive({ active: true, effectiveFrom: "2026-04-01" }, period[1], period[0]), "starts after the period");
  assert.ok(!componentActive({ active: true, effectiveTo: "2026-02-01" }, period[1], period[0]), "ended before the period");
  assert.ok(componentActive({ active: true, effectiveFrom: "2026-01-01", effectiveTo: "2026-12-31" }, period[1], period[0]));
});

// ── Base pay ─────────────────────────────────────────────────────────────────
test("salary is the annual amount divided by the year's periods", () => {
  const comp = { payType: "salary", baseAmount: 60_000, payFrequency: "monthly" };
  const full = basePayFor({ compensation: comp, frequency: "monthly", factor: 1, workingDaysInPeriod: 22 });
  assert.equal(full.basePay, 5_000);
  assert.equal(basePayFor({ compensation: comp, frequency: "biweekly", factor: 1, workingDaysInPeriod: 10 }).basePay,
    round2(60_000 / 26));
});

test("a part-period joiner is paid pro rata, on working days", () => {
  const comp = { payType: "salary", baseAmount: 60_000, payFrequency: "monthly" };
  const { basePay } = basePayFor({ compensation: comp, frequency: "monthly", factor: 12 / 22, workingDaysInPeriod: 22 });
  assert.equal(basePay, round2(5_000 * (12 / 22)));
});

test("unpaid leave is valued at the same daily rate as proration", () => {
  const comp = { payType: "salary", baseAmount: 66_000, payFrequency: "monthly" }; // 5,500/month
  const r = basePayFor({ compensation: comp, frequency: "monthly", factor: 1, workingDaysInPeriod: 22, unpaidLeaveDays: 2 });
  assert.equal(r.dailyRate, 250, "5,500 over 22 working days");
  assert.equal(r.unpaidLeaveAmount, 500);
  assert.equal(r.basePay, 5_000);
});

test("unpaid leave can never make base pay negative", () => {
  const comp = { payType: "salary", baseAmount: 12_000, payFrequency: "monthly" }; // 1,000/month
  const r = basePayFor({ compensation: comp, frequency: "monthly", factor: 1, workingDaysInPeriod: 20, unpaidLeaveDays: 60 });
  assert.equal(r.basePay, 0);
  assert.ok(r.unpaidLeaveAmount <= 1_000, "the deduction is capped at what was earned");
});

test("hourly pay is approved hours × rate, with overtime at a multiplier", () => {
  const comp = { payType: "hourly", baseAmount: 25 };
  const r = basePayFor({ compensation: comp, hours: 80, overtimeHours: 4, overtimeMultiplier: 1.5, factor: 1, workingDaysInPeriod: 22 });
  assert.equal(r.overtimeAmount, 150);
  assert.equal(r.basePay, 80 * 25 + 150);
  // Unpaid leave must NOT be deducted from hourly pay: unworked hours were never
  // submitted, so deducting them would charge the person twice.
  const withLeave = basePayFor({ compensation: comp, hours: 80, unpaidLeaveDays: 3, factor: 1, workingDaysInPeriod: 22 });
  assert.equal(withLeave.basePay, 2_000);
  assert.equal(withLeave.unpaidLeaveAmount, 0);
});

// ── Payslips ─────────────────────────────────────────────────────────────────
const employee = { userId: "u1", name: "Ada", hireDate: "2020-01-01" };
const salaried = { payType: "salary", baseAmount: 60_000, currency: "USD", payFrequency: "monthly", effectiveFrom: "2020-01-01" };
const period = { periodStart: "2026-03-01", periodEnd: "2026-03-31", frequency: "monthly" };

const comp = (over) => ({ component: { code: "X", name: "X", kind: "deduction", calc: "fixed", amount: 0, taxable: true, preTax: false, ...over }, assignment: null });

test("a payslip always reconciles: lines sum to the totals", () => {
  const slip = computePayslip({
    employee, compensation: salaried, ...period, taxTable: TABLE,
    components: [
      comp({ code: "TRANSPORT", name: "Transport", kind: "earning", calc: "fixed", amount: 200 }),
      comp({ code: "PENSION", name: "Pension", kind: "deduction", calc: "percent_of_base", amount: 5, preTax: true }),
      comp({ code: "GYM", name: "Gym", kind: "deduction", calc: "fixed", amount: 30 }),
      comp({ code: "ER_SOCIAL", name: "Employer social", kind: "employer_contribution", calc: "percent_of_gross", amount: 10 }),
    ],
  });

  const sum = (kind) => round2(slip.lines.filter((l) => l.kind === kind).reduce((s, l) => s + l.amount, 0));
  assert.equal(sum("earning"), slip.gross, "earning lines must sum to gross");
  assert.equal(sum("deduction"), slip.deductions, "deduction lines must sum to the deductions total");
  assert.equal(sum("tax"), slip.tax);
  assert.equal(slip.net, round2(slip.gross - slip.deductions - slip.tax), "net is derived, so it can never disagree");
  assert.equal(slip.employerCost, round2(slip.gross + sum("employer")));
});

test("the worked example is arithmetically right", () => {
  const slip = computePayslip({
    employee, compensation: salaried, ...period, taxTable: TABLE,
    components: [
      comp({ code: "TRANSPORT", name: "Transport", kind: "earning", calc: "fixed", amount: 200 }),
      comp({ code: "PENSION", name: "Pension", kind: "deduction", calc: "percent_of_base", amount: 5, preTax: true }),
    ],
  });
  assert.equal(slip.gross, 5_200);            // 5,000 base + 200 allowance
  assert.equal(slip.deductions, 250);         // 5% of 5,000 base
  assert.equal(slip.taxableGross, 4_950);     // 5,200 taxable less 250 pre-tax
  assert.equal(slip.tax, 790);                // (4,950×12 − 12,000) × 20% ÷ 12
  assert.equal(slip.net, 4_160);
});

test("pre-tax deductions reduce tax; post-tax ones don't", () => {
  const withPreTax = computePayslip({
    employee, compensation: salaried, ...period, taxTable: TABLE,
    components: [comp({ code: "P", name: "Pension", kind: "deduction", calc: "fixed", amount: 500, preTax: true })],
  });
  const withPostTax = computePayslip({
    employee, compensation: salaried, ...period, taxTable: TABLE,
    components: [comp({ code: "P", name: "Loan", kind: "deduction", calc: "fixed", amount: 500, preTax: false })],
  });

  assert.equal(withPreTax.deductions, withPostTax.deductions, "the same cash leaves the employee either way");
  assert.ok(withPreTax.tax < withPostTax.tax, "but only the pre-tax one lowers taxable pay");
  assert.equal(withPreTax.taxableGross, 4_500);
  assert.equal(withPostTax.taxableGross, 5_000);
  assert.ok(withPreTax.net > withPostTax.net, "so take-home is higher with the pre-tax deduction");
});

test("a non-taxable earning is paid but not taxed", () => {
  const slip = computePayslip({
    employee, compensation: salaried, ...period, taxTable: TABLE,
    components: [comp({ code: "REIMB", name: "Expenses", kind: "earning", calc: "fixed", amount: 300, taxable: false })],
  });
  assert.equal(slip.gross, 5_300);
  assert.equal(slip.taxableGross, 5_000, "the reimbursement is excluded from taxable pay");
});

test("employer contributions never reduce take-home pay", () => {
  const without = computePayslip({ employee, compensation: salaried, ...period, taxTable: TABLE });
  const with_ = computePayslip({
    employee, compensation: salaried, ...period, taxTable: TABLE,
    components: [comp({ code: "ER", name: "Employer social", kind: "employer_contribution", calc: "percent_of_gross", amount: 15 })],
  });
  assert.equal(with_.net, without.net);
  assert.equal(with_.deductions, without.deductions);
  assert.equal(with_.employerCost, round2(without.gross + 750));
});

test("percent_of_gross sees the other earnings; percent_of_base doesn't", () => {
  const slip = computePayslip({
    employee, compensation: salaried, ...period, taxTable: null,
    components: [
      comp({ code: "BONUS", name: "Bonus", kind: "earning", calc: "fixed", amount: 1_000 }),
      comp({ code: "OFBASE", name: "10% of base", kind: "deduction", calc: "percent_of_base", amount: 10 }),
      comp({ code: "OFGROSS", name: "10% of gross", kind: "deduction", calc: "percent_of_gross", amount: 10 }),
    ],
  });
  const line = (code) => slip.lines.find((l) => l.code === code).amount;
  assert.equal(line("OFBASE"), 500, "10% of the 5,000 base");
  assert.equal(line("OFGROSS"), 600, "10% of the 6,000 gross");
});

test("a prorated payslip says so, and shows the days it was based on", () => {
  const slip = computePayslip({
    employee: { ...employee, hireDate: "2026-03-16" },
    compensation: salaried, ...period, taxTable: TABLE,
  });
  assert.equal(slip.prorated, true);
  assert.equal(slip.daysWorked, 12);
  assert.equal(slip.daysInPeriod, 22);
  assert.match(slip.lines[0].label, /12\/22 days/);
  assert.equal(slip.gross, round2(5_000 * (12 / 22)));
});

test("an hourly payslip records the hours it paid for", () => {
  const slip = computePayslip({
    employee, compensation: { ...salaried, payType: "hourly", baseAmount: 30 },
    ...period, taxTable: TABLE, hours: 100, overtimeHours: 5,
  });
  assert.equal(slip.hours, 105);
  assert.equal(slip.gross, round2(100 * 30 + 5 * 30 * 1.5));
});

test("unpaid leave appears on the payslip as an explanation, not a double charge", () => {
  const slip = computePayslip({
    employee, compensation: { ...salaried, baseAmount: 66_000 }, ...period, taxTable: null, unpaidLeaveDays: 2,
  });
  assert.equal(slip.gross, 5_000, "the deduction is already inside the base line");
  const info = slip.lines.find((l) => l.kind === "info");
  assert.ok(info && info.amount === -500, "it's shown for transparency");
  assert.equal(round2(slip.lines.filter((l) => l.kind === "earning").reduce((s, l) => s + l.amount, 0)), slip.gross,
    "and it is not counted again as an earning");
});

test("a payslip carries the snapshot needed to explain it years later", () => {
  const slip = computePayslip({ employee, compensation: salaried, ...period, taxTable: TABLE });
  assert.equal(slip.snapshot.baseAmount, 60_000);
  assert.equal(slip.snapshot.periodsPerYear, 12);
  assert.equal(slip.snapshot.payType, "salary");
  assert.ok(slip.snapshot.taxTable?.bands?.length, "including the bands that were applied");
  assert.ok(slip.snapshot.computedAt);
});

test("payroll refuses to guess when there is no compensation on record", () => {
  assert.throws(
    () => computePayslip({ employee, compensation: null, ...period }),
    /no compensation on record/i,
  );
});

test("run totals add up across payslips", () => {
  const slips = [
    { gross: 100.55, tax: 10.1, deductions: 5.05, net: 85.4, employerCost: 110, taxableGross: 95.5 },
    { gross: 200.45, tax: 20.9, deductions: 10.95, net: 168.6, employerCost: 220, taxableGross: 189.5 },
  ];
  const t = runTotals(slips);
  assert.equal(t.headcount, 2);
  assert.equal(t.gross, 301);
  assert.equal(t.net, 254);
  assert.equal(t.tax, 31);
  assert.equal(runTotals([]).gross, 0, "an empty run totals zero rather than NaN");
});

// ── Compensation resolution ──────────────────────────────────────────────────
test("payroll uses the record in force at the pay date, never the newest", () => {
  const records = [
    { id: "a", effectiveFrom: "2026-01-01", baseAmount: 50_000 },
    { id: "b", effectiveFrom: "2026-04-01", baseAmount: 60_000 }, // a future raise
    { id: "c", effectiveFrom: "2025-01-01", baseAmount: 40_000 },
  ];
  assert.equal(compensationAt(records, "2026-03-31").id, "a", "a future raise must not back-pay this month");
  assert.equal(compensationAt(records, "2026-04-15").id, "b");
  assert.equal(compensationAt(records, "2025-06-01").id, "c");
  assert.equal(compensationAt(records, "2024-01-01"), null, "before the first record there is nothing to pay from");
  assert.equal(compensationAt([], "2026-01-01"), null);
});

// ── Leave maths ──────────────────────────────────────────────────────────────
test("requested days exclude weekends unless the type counts them", () => {
  assert.equal(requestedDays("2026-03-02", "2026-03-06"), 5);
  assert.equal(requestedDays("2026-03-02", "2026-03-08"), 5, "the weekend isn't charged");
  assert.equal(requestedDays("2026-03-02", "2026-03-08", { countsWeekends: true }), 7);
  assert.equal(requestedDays("2026-03-02", "2026-03-02", { halfDay: true }), 0.5);
  assert.throws(() => requestedDays("2026-03-02", "2026-03-03", { halfDay: true }), /single date/i);
});

test("leave spanning two periods is charged to each for its own days", () => {
  // 26 March → 6 April 2026, working days only.
  const request = { startDate: "2026-03-26", endDate: "2026-04-06", halfDay: false };
  const march = leaveDaysInPeriod(request, "2026-03-01", "2026-03-31");
  const april = leaveDaysInPeriod(request, "2026-04-01", "2026-04-30");
  assert.equal(march, 4, "26, 27, 30, 31 March");
  assert.equal(april, 4, "1, 2, 3, 6 April");
  assert.equal(march + april, requestedDays(request.startDate, request.endDate),
    "the split must equal the whole, or one of the two payslips is wrong");
});

test("leave entirely outside a period is not charged to it", () => {
  const request = { startDate: "2026-05-04", endDate: "2026-05-08" };
  assert.equal(leaveDaysInPeriod(request, "2026-03-01", "2026-03-31"), 0);
});

test("a half day inside a period stays a half day", () => {
  const request = { startDate: "2026-03-10", endDate: "2026-03-10", halfDay: true };
  assert.equal(leaveDaysInPeriod(request, "2026-03-01", "2026-03-31"), 0.5);
});

test("the remaining balance accounts for carry-over and adjustments", () => {
  assert.equal(remainingDays({ entitledDays: 20, carriedOver: 5, adjustment: 0, usedDays: 8 }), 17);
  assert.equal(remainingDays({ entitledDays: 20, carriedOver: 0, adjustment: -2, usedDays: 0 }), 18);
  assert.equal(remainingDays(null), 0);
});

// ── Rounding ─────────────────────────────────────────────────────────────────
test("money is rounded to cents, half up, without float artefacts", () => {
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2(2.675), 2.68);
  assert.equal(round2(0.1 + 0.2), 0.3);
  assert.equal(round2(1234.5678), 1234.57);
  assert.equal(round2(-1.005), -1);
});
