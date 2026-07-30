/**
 * Payroll calculation engine — pure functions, no database, no I/O.
 *
 * Payroll is the one part of a business system where being *approximately*
 * right is worthless, so this file is deliberately small, explicit and heavily
 * unit-tested. Three principles:
 *
 * 1. **One denominator.** Partial employment (a mid-month joiner) and unpaid
 *    leave are both prorated on **working days in the period**. Mixing calendar
 *    days for one and working days for the other is a classic payroll bug that
 *    produces numbers nobody can reconcile.
 *
 * 2. **A declared order of operations.** Base → earnings → pre-tax deductions →
 *    tax → post-tax deductions → net. Percentages state what they're a
 *    percentage *of*, so "5% pension" is never ambiguous.
 *
 * 3. **It must add up.** Every line is rounded to cents, and `net` is derived as
 *    `gross − deductions − tax` from those rounded figures. A payslip whose
 *    lines don't sum to its total is a payslip someone will refuse to accept.
 *
 * We do not ship tax rates for any jurisdiction. The organization enters its own
 * bands (see `TaxTable`); a wrong rate shipped as a default would be worse than
 * no default at all.
 */
import { periodsPerYear } from "./hr.registry.js";

const err = (message, status = 400) => { const e = new Error(message); e.status = status; return e; };

const DAY_MS = 86_400_000;

/** Round to cents. Payroll money is never carried at full float precision. */
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const clampDate = (d) => {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
};

/** Inclusive count of calendar days between two dates. */
export function calendarDays(start, end) {
  const a = clampDate(start), b = clampDate(end);
  if (b < a) return 0;
  return Math.round((b - a) / DAY_MS) + 1;
}

/**
 * Inclusive count of Mon–Fri days. The proration denominator for everything, so
 * a joiner mid-month and a day of unpaid leave are valued the same way.
 */
export function workingDays(start, end) {
  const a = clampDate(start), b = clampDate(end);
  if (b < a) return 0;
  let count = 0;
  for (const d = new Date(a); d <= b; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

/**
 * The part of the period this person was actually employed for.
 * Returns { workingDaysInPeriod, workedWorkingDays, factor, prorated }.
 */
export function employmentFactor({ periodStart, periodEnd, hireDate, endDate }) {
  const total = workingDays(periodStart, periodEnd);
  if (!total) return { workingDaysInPeriod: 0, workedWorkingDays: 0, factor: 0, prorated: false };

  const from = hireDate && clampDate(hireDate) > clampDate(periodStart) ? hireDate : periodStart;
  const to = endDate && clampDate(endDate) < clampDate(periodEnd) ? endDate : periodEnd;
  const worked = workingDays(from, to);

  return {
    workingDaysInPeriod: total,
    workedWorkingDays: worked,
    factor: worked / total,
    prorated: worked !== total,
  };
}

// ── Tax ──────────────────────────────────────────────────────────────────────
/**
 * Validate a band list. `upTo` is a cumulative **annual** threshold; the final
 * band must be open-ended (`upTo: null`). `rate` is a percentage (20 ⇒ 20%).
 */
export function validateBands(bands) {
  if (!Array.isArray(bands) || !bands.length) throw err("A tax table needs at least one band");
  let previous = 0;
  bands.forEach((b, i) => {
    const rate = Number(b.rate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw err(`Band ${i + 1}: rate must be a percentage between 0 and 100`);
    const last = i === bands.length - 1;
    if (last) {
      if (b.upTo !== null && b.upTo !== undefined && b.upTo !== "") {
        throw err("The last band must be open-ended — leave its upper limit empty");
      }
      return;
    }
    const upTo = Number(b.upTo);
    if (!Number.isFinite(upTo) || upTo <= previous) {
      throw err(`Band ${i + 1}: the upper limit must be greater than the previous band's (${previous})`);
    }
    previous = upTo;
  });
  return bands.map((b, i) => ({
    upTo: i === bands.length - 1 ? null : Number(b.upTo),
    rate: Number(b.rate),
  }));
}

/**
 * Annual tax on an annual taxable income, using progressive bands.
 * Each band's rate applies only to the slice of income inside it — the standard
 * marginal model, not a single rate on the whole amount.
 */
export function annualTax(annualTaxable, taxTable) {
  if (!taxTable) return 0;
  const bands = taxTable.bands ?? [];
  if (!bands.length) return 0;

  const taxable = Math.max(0, Number(annualTaxable) - Number(taxTable.allowance ?? 0));
  if (taxable <= 0) return 0;

  let tax = 0, floor = 0;
  for (const band of bands) {
    const ceiling = band.upTo == null ? Infinity : Number(band.upTo);
    const slice = Math.min(taxable, ceiling) - floor;
    if (slice > 0) tax += slice * (Number(band.rate) / 100);
    floor = ceiling;
    if (taxable <= ceiling) break;
  }
  return round2(tax);
}

/**
 * Tax for one pay period: annualize the period's taxable pay, tax it, then
 * divide back. This is how cumulative PAYE-style systems behave and it means a
 * monthly and a weekly payroll on the same salary reach the same annual tax.
 */
export function periodTax(periodTaxable, taxTable, frequency) {
  if (!taxTable) return 0;
  const periods = periodsPerYear(frequency);
  return round2(annualTax(Number(periodTaxable) * periods, taxTable) / periods);
}

// ── Components ───────────────────────────────────────────────────────────────
/**
 * Resolve one component to a cash amount for this period.
 * `basePay` is the period's base pay; `grossSoFar` is base + earnings already
 * applied — which is what makes `percent_of_gross` well-defined.
 */
export function componentAmount(component, { basePay, grossSoFar, override }) {
  const value = override != null && override !== "" ? Number(override) : Number(component.amount ?? 0);
  if (!Number.isFinite(value) || value === 0) return 0;

  let amount;
  switch (component.calc) {
    case "percent_of_base":  amount = (Number(basePay) * value) / 100; break;
    case "percent_of_gross": amount = (Number(grossSoFar) * value) / 100; break;
    default:                 amount = value; break; // fixed
  }
  amount = Math.abs(amount);
  const cap = component.capPerPeriod;
  if (cap != null && cap !== "" && Number.isFinite(Number(cap))) amount = Math.min(amount, Number(cap));
  return round2(amount);
}

/** Is this component in force during the period? */
export function componentActive(assignment, periodEnd, periodStart) {
  if (!assignment) return true;
  if (assignment.active === false) return false;
  if (assignment.effectiveFrom && clampDate(assignment.effectiveFrom) > clampDate(periodEnd)) return false;
  if (assignment.effectiveTo && clampDate(assignment.effectiveTo) < clampDate(periodStart)) return false;
  return true;
}

// ── Base pay ─────────────────────────────────────────────────────────────────
/**
 * The period's base pay, before any components.
 *
 * Salary: the annual amount divided by the year's pay periods, prorated for
 * partial employment, less any unpaid leave valued at the same daily rate.
 * Hourly: approved hours × rate, with overtime at `overtimeMultiplier`. Unpaid
 * leave is not deducted from hourly pay — unworked hours were simply never
 * submitted, and deducting them again would charge the person twice.
 */
export function basePayFor({
  compensation, frequency, factor, workingDaysInPeriod, unpaidLeaveDays = 0,
  hours = 0, overtimeHours = 0, overtimeMultiplier = 1.5,
}) {
  if (!compensation) return { basePay: 0, dailyRate: 0, unpaidLeaveAmount: 0, overtimeAmount: 0 };

  if (compensation.payType === "hourly") {
    const rate = Number(compensation.baseAmount ?? 0);
    const regular = round2(Number(hours) * rate);
    const overtimeAmount = round2(Number(overtimeHours) * rate * Number(overtimeMultiplier));
    return { basePay: round2(regular + overtimeAmount), dailyRate: 0, unpaidLeaveAmount: 0, overtimeAmount };
  }

  const periods = periodsPerYear(frequency ?? compensation.payFrequency);
  const fullPeriod = Number(compensation.baseAmount ?? 0) / periods;
  const earned = fullPeriod * (Number.isFinite(factor) ? factor : 1);

  const dailyRate = workingDaysInPeriod > 0 ? fullPeriod / workingDaysInPeriod : 0;
  const unpaidLeaveAmount = round2(Math.min(earned, dailyRate * Number(unpaidLeaveDays || 0)));

  return {
    basePay: round2(Math.max(0, earned - unpaidLeaveAmount)),
    dailyRate: round2(dailyRate),
    unpaidLeaveAmount,
    overtimeAmount: 0,
  };
}

// ── Payslip ──────────────────────────────────────────────────────────────────
/**
 * Build one payslip.
 *
 * Inputs are plain data (the caller loads them), so the whole calculation is
 * reproducible from a stored snapshot years later.
 */
export function computePayslip({
  employee,            // { userId, name, employmentType, status, hireDate, endDate }
  compensation,        // the Compensation row in force at the pay date
  periodStart, periodEnd,
  frequency,
  components = [],     // [{ component, assignment }]
  taxTable = null,
  hours = 0, overtimeHours = 0, overtimeMultiplier = 1.5,
  unpaidLeaveDays = 0,
  currency,
}) {
  if (!compensation) throw err(`${employee?.name || "This employee"} has no compensation on record for this period — add a salary or hourly rate first.`);

  const freq = frequency || compensation.payFrequency || "monthly";
  const { workingDaysInPeriod, workedWorkingDays, factor, prorated } =
    employmentFactor({ periodStart, periodEnd, hireDate: employee?.hireDate, endDate: employee?.endDate });

  const { basePay, dailyRate, unpaidLeaveAmount, overtimeAmount } = basePayFor({
    compensation, frequency: freq, factor, workingDaysInPeriod,
    unpaidLeaveDays, hours, overtimeHours, overtimeMultiplier,
  });

  const lines = [];
  const push = (line) => { if (line.amount !== 0) lines.push(line); };

  // The base line is always shown, even at zero — a payslip with no base line
  // reads as a formatting failure rather than as "this person earned nothing
  // this period", which is a real and important thing to be able to state.
  lines.push({
    code: compensation.payType === "hourly" ? "HOURLY" : "BASE",
    label: compensation.payType === "hourly"
      ? `Hourly pay${overtimeAmount ? " (incl. overtime)" : ""}`
      : prorated ? `Base salary (${workedWorkingDays}/${workingDaysInPeriod} days)` : "Base salary",
    kind: "earning", taxable: true, amount: basePay,
  });

  if (unpaidLeaveAmount > 0) {
    lines.push({
      code: "UNPAID_LEAVE",
      label: `Unpaid leave (${unpaidLeaveDays} day${unpaidLeaveDays === 1 ? "" : "s"})`,
      kind: "info", taxable: false, amount: -unpaidLeaveAmount,
      note: "Already reflected in the base pay above.",
    });
  }

  // ── Earnings ──
  // percent_of_base first (they depend only on base), then fixed, then
  // percent_of_gross — which therefore sees every other earning.
  const ordered = [...components].sort((a, b) => {
    const rank = (c) => (c.component.calc === "percent_of_gross" ? 2 : c.component.calc === "fixed" ? 1 : 0);
    return rank(a) - rank(b) || (a.component.sortOrder ?? 0) - (b.component.sortOrder ?? 0);
  });

  let grossSoFar = basePay;
  const earnings = [];
  for (const entry of ordered) {
    const { component, assignment } = entry;
    if (component.kind !== "earning") continue;
    if (!componentActive(assignment, periodEnd, periodStart)) continue;
    const amount = componentAmount(component, { basePay, grossSoFar, override: assignment?.amount });
    if (!amount) continue;
    grossSoFar = round2(grossSoFar + amount);
    earnings.push({ code: component.code, label: component.name, kind: "earning", taxable: component.taxable !== false, amount });
  }
  earnings.forEach(push);

  const gross = round2(basePay + earnings.reduce((s, e) => s + e.amount, 0));

  // ── Deductions ──
  const preTax = [], postTax = [], employer = [];
  for (const entry of ordered) {
    const { component, assignment } = entry;
    if (component.kind === "earning") continue;
    if (!componentActive(assignment, periodEnd, periodStart)) continue;
    const amount = componentAmount(component, { basePay, grossSoFar: gross, override: assignment?.amount });
    if (!amount) continue;
    const line = { code: component.code, label: component.name, amount };
    if (component.kind === "employer_contribution") employer.push({ ...line, kind: "employer" });
    else if (component.preTax) preTax.push({ ...line, kind: "deduction", preTax: true });
    else postTax.push({ ...line, kind: "deduction", preTax: false });
  }

  // Taxable pay: taxable earnings (base is always taxable) less pre-tax deductions.
  const taxableEarnings = round2(basePay + earnings.filter((e) => e.taxable).reduce((s, e) => s + e.amount, 0));
  const preTaxTotal = round2(preTax.reduce((s, d) => s + d.amount, 0));
  const taxableGross = round2(Math.max(0, taxableEarnings - preTaxTotal));

  const tax = periodTax(taxableGross, taxTable, freq);

  [...preTax, ...postTax].forEach((d) => push({ ...d, amount: d.amount }));
  if (tax > 0) push({ code: "TAX", label: taxTable?.name ? `Income tax (${taxTable.name})` : "Income tax", kind: "tax", amount: tax });
  employer.forEach(push);

  const deductions = round2(preTaxTotal + postTax.reduce((s, d) => s + d.amount, 0));
  const employerContrib = round2(employer.reduce((s, e) => s + e.amount, 0));

  // Derived from the rounded figures, so the payslip always reconciles.
  const net = round2(gross - deductions - tax);

  return {
    userId: employee?.userId,
    currency: currency || compensation.currency || "USD",
    gross, taxableGross, tax, deductions, net,
    employerCost: round2(gross + employerContrib),
    hours: compensation.payType === "hourly" ? round2(Number(hours) + Number(overtimeHours)) : null,
    daysInPeriod: workingDaysInPeriod,
    daysWorked: workedWorkingDays,
    unpaidLeaveDays: Number(unpaidLeaveDays) || 0,
    prorated,
    lines,
    snapshot: {
      payType: compensation.payType,
      baseAmount: compensation.baseAmount,
      currency: compensation.currency,
      payFrequency: freq,
      effectiveFrom: compensation.effectiveFrom,
      dailyRate,
      periodsPerYear: periodsPerYear(freq),
      taxTable: taxTable ? { name: taxTable.name, allowance: taxTable.allowance, bands: taxTable.bands } : null,
      employmentType: employee?.employmentType ?? null,
      computedAt: new Date().toISOString(),
    },
  };
}

/** Totals across a run's payslips. */
export function runTotals(payslips = []) {
  const sum = (key) => round2(payslips.reduce((s, p) => s + Number(p[key] ?? 0), 0));
  return {
    headcount: payslips.length,
    gross: sum("gross"),
    taxableGross: sum("taxableGross"),
    tax: sum("tax"),
    deductions: sum("deductions"),
    net: sum("net"),
    employerCost: sum("employerCost"),
  };
}

/**
 * The compensation record in force at a date — the latest one effective on or
 * before it. Payroll must never use "the newest row": a raise dated next month
 * would silently back-pay this month's run.
 */
export function compensationAt(records = [], date) {
  const at = clampDate(date);
  return records
    .filter((r) => clampDate(r.effectiveFrom) <= at)
    .sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom))[0] ?? null;
}

/**
 * Leave days that fall inside a period, counting only the overlap. A holiday
 * spanning two months must be charged to each month for the days it covers,
 * or the two payslips together will be wrong.
 */
export function leaveDaysInPeriod(request, periodStart, periodEnd, { countsWeekends = false } = {}) {
  const from = clampDate(request.startDate) < clampDate(periodStart) ? periodStart : request.startDate;
  const to = clampDate(request.endDate) > clampDate(periodEnd) ? periodEnd : request.endDate;
  if (clampDate(to) < clampDate(from)) return 0;
  const days = countsWeekends ? calendarDays(from, to) : workingDays(from, to);
  // A half day only ever applies to a single-day request.
  if (request.halfDay && days === 1) return 0.5;
  return days;
}

/** Days a leave request covers, for balance accounting. */
export function requestedDays(startDate, endDate, { halfDay = false, countsWeekends = false } = {}) {
  const days = countsWeekends ? calendarDays(startDate, endDate) : workingDays(startDate, endDate);
  if (halfDay) {
    if (days !== 1) throw err("A half day can only be taken on a single date");
    return 0.5;
  }
  return days;
}

/** Remaining balance for a leave allocation. */
export function remainingDays(balance) {
  if (!balance) return 0;
  return round2(
    Number(balance.entitledDays ?? 0) + Number(balance.carriedOver ?? 0)
    + Number(balance.adjustment ?? 0) - Number(balance.usedDays ?? 0),
  );
}
