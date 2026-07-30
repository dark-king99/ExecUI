/**
 * Payroll console — the Payroll tab of HR (`/people?tab=payroll`).
 *
 * It renders `embedded` inside the HR page, which is why the page header is
 * conditional: payroll is a section of people operations, not a separate product,
 * and two stacked titles would say so twice. It still works standalone.
 *
 * The section is organised around the run: create a period, calculate it, get it
 * approved, record it paid, export the bank file. Two things the UI states
 * plainly rather than glossing over:
 *
 *  • **Who was skipped and why.** A payroll where somebody silently didn't get
 *    paid is the worst failure this module could have, so every exclusion is
 *    listed with its reason.
 *  • **ExecUI doesn't move money.** The bank file is a payment instruction you
 *    give your bank. Nothing here claims to have paid anyone.
 */
import { useState, useEffect } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import { useApi } from "../../hooks/useApi";
import useRecordParam from "../../hooks/useRecordParam";
import { useToast } from "../../components/ui/Toast";
import { hr, payroll } from "../../services/api";
import {
  Wallet, Calculator, Plus, Download, CheckCircle2, AlertTriangle, Percent,
  Landmark, Receipt, ArrowRight, Trash2, X, Info, FileText,
} from "lucide-react";

const cls = (...a) => a.filter(Boolean).join(" ");
const input = "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white";
const day = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const money = (n, cur) => `${cur ?? ""} ${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
const iso = (d) => new Date(d).toISOString().slice(0, 10);

const TONE = {
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
};

function Pill({ children, tone }) {
  return <span className={cls("rounded-full px-2 py-0.5 text-[11px] font-medium", tone ?? TONE.slate)}>{children}</span>;
}

function Empty({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <Icon size={20} className="text-slate-300 dark:text-slate-600" />
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>
      {hint && <p className="max-w-md text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ── Run detail ───────────────────────────────────────────────────────────────
function RunDetail({ id, catalog, toast, refetch }) {
  const { data: run, refetch: reload } = useApi(() => payroll.runs.get(id), [id]);
  const [busy, setBusy] = useState(false);
  const [skipped, setSkipped] = useState(null);
  const [bank, setBank] = useState(null);
  const [openSlip, setOpenSlip] = useState(null);
  const [paymentRef, setPaymentRef] = useState("");

  if (!run) return <div className="border-t border-slate-200 p-3 text-xs text-slate-400 dark:border-slate-700">Loading…</div>;

  const act = async (fn, message) => {
    setBusy(true);
    try { const r = await fn(); toast.success?.(message); reload(); refetch(); return r; }
    catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const calculate = async () => {
    const r = await act(() => payroll.runs.calculate(id), "Run calculated.");
    if (r?.skipped) setSkipped(r.skipped);
  };

  const loadBank = async () => {
    setBusy(true);
    try { setBank(await payroll.runs.bankFile(id)); }
    catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const labelFor = (s) => catalog?.payrunStates?.find((x) => x.id === s)?.label ?? s;
  const totals = run.totals ?? {};

  return (
    <div className="space-y-3 border-t border-slate-200 p-3 dark:border-slate-700">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Headcount", totals.headcount ?? 0],
          ["Gross", money(totals.gross, run.currency)],
          ["Tax", money(totals.tax, run.currency)],
          ["Deductions", money(totals.deductions, run.currency)],
          ["Net pay", money(totals.net, run.currency)],
          ["Employer cost", money(totals.employerCost, run.currency)],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {!run.locked && (
          <button onClick={calculate} disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            <Calculator size={13} /> {run.calculatedAt ? "Recalculate" : "Calculate"}
          </button>
        )}
        {run.status === "review" && (
          <button onClick={() => act(() => payroll.runs.approval(id), "Sent for approval.")} disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300">
            <CheckCircle2 size={13} /> Send for approval
          </button>
        )}
        {(run.nextStates ?? []).map((s) => (
          <button key={s} disabled={busy}
            onClick={() => act(() => payroll.runs.setStatus(id, s, s === "paid" ? { paymentRef } : undefined), `Moved to ${labelFor(s)}.`)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300">
            <ArrowRight size={11} /> {labelFor(s)}
          </button>
        ))}
        {["approved", "paid"].includes(run.status) && (
          <button onClick={loadBank} disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300">
            <Landmark size={13} /> Bank payment file
          </button>
        )}
      </div>

      {run.nextStates?.includes("paid") && (
        <input className={cls(input, "max-w-xs")} placeholder="Bank reference (optional)" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} />
      )}

      {skipped?.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 dark:border-amber-500/40 dark:bg-amber-500/10">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200">
            <AlertTriangle size={13} /> {skipped.length} person(s) were not included
          </p>
          {skipped.map((s) => (
            <p key={s.userId} className="text-[11px] text-amber-700 dark:text-amber-300">{s.name}: {s.reason}</p>
          ))}
        </div>
      )}

      {bank && (
        <div className="space-y-1.5 rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
            {bank.rows} payment(s) · {money(bank.total, bank.currency)}
          </p>
          <p className="flex items-start gap-1.5 text-[11px] text-slate-500">
            <Info size={12} className="mt-0.5 shrink-0" /> {bank.note}
          </p>
          {bank.missing?.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 dark:border-amber-500/40 dark:bg-amber-500/10">
              <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-200">Excluded — no payable account:</p>
              {bank.missing.map((m) => (
                <p key={m.userId} className="text-[11px] text-amber-700 dark:text-amber-300">{m.name}: {m.reason}</p>
              ))}
            </div>
          )}
          <button onClick={() => payroll.runs.downloadBankFile(id).catch((e) => toast.error?.(e.message))}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">
            <Download size={13} /> Download CSV
          </button>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Payslips</p>
        {!run.payslips?.length && (
          <p className="text-xs text-slate-400">
            {run.calculatedAt ? "No payslips — check the exclusions above." : "Calculate the run to generate payslips."}
          </p>
        )}
        <div className="space-y-1">
          {(run.payslips ?? []).map((p) => (
            <div key={p.id} className="rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5">
                <button className="min-w-0 flex-1 text-left" onClick={() => setOpenSlip(openSlip === p.id ? null : p.id)}>
                  <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">
                    {p.userName}
                    {p.prorated && <span className="ml-1 text-[11px] text-amber-600 dark:text-amber-400">prorated {p.daysWorked}/{p.daysInPeriod}d</span>}
                    {p.hours != null && <span className="ml-1 text-[11px] text-slate-400">{p.hours}h</span>}
                    {p.unpaidLeaveDays > 0 && <span className="ml-1 text-[11px] text-slate-400">· {p.unpaidLeaveDays}d unpaid</span>}
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-3 text-xs tabular-nums">
                  <span className="text-slate-400">{money(p.gross, p.currency)} gross</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">{money(p.net, p.currency)}</span>
                  <button onClick={() => payroll.payslips.pdf(p.id).catch((e) => toast.error?.(e.message))}
                    className="rounded-lg border border-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">PDF</button>
                </div>
              </div>
              {openSlip === p.id && (
                <table className="w-full border-t border-slate-200 px-2.5 text-xs dark:border-slate-700">
                  <tbody>
                    {(p.lines ?? []).map((l, i) => (
                      <tr key={i}>
                        <td className="py-0.5 pl-2.5 text-slate-600 dark:text-slate-300">{l.label}</td>
                        <td className={cls("py-0.5 pr-2.5 text-right tabular-nums",
                          l.kind === "earning" ? "text-slate-800 dark:text-slate-100"
                            : l.kind === "employer" || l.kind === "info" ? "text-slate-400"
                              : "text-red-600 dark:text-red-400")}>
                          {money(l.amount, p.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Runs tab ─────────────────────────────────────────────────────────────────
function Runs({ catalog, toast }) {
  const { data: runs, refetch } = useApi(() => payroll.runs.list({ limit: 50 }), []);
  const { data: tables } = useApi(() => payroll.taxTables.list(), [], { cacheKey: "payroll:taxTables" });
  const [creating, setCreating] = useState(false);
  // "Your pay run was approved" should open that run, not the list of runs.
  const [openId, setOpenId] = useRecordParam("run");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!openId || !runs) return;
    document.getElementById(`run-${openId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [openId, runs]);

  const [form, setForm] = useState(() => {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    return {
      reference: "", periodStart: iso(start), periodEnd: iso(end), payDate: iso(end),
      frequency: "monthly", currency: "USD", taxTableId: "",
    };
  });

  const create = async () => {
    setBusy(true);
    try {
      const r = await payroll.runs.create({ ...form, taxTableId: form.taxTableId || undefined });
      toast.success?.("Pay run created — calculate it when you're ready.");
      setCreating(false); setOpenId(r.id); refetch();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const remove = async (id) => {
    try { await payroll.runs.remove(id); toast.success?.("Pay run deleted."); refetch(); }
    catch (e) { toast.error?.(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
          <Plus size={13} /> New pay run
        </button>
      </div>

      {creating && (
        <Card><CardBody className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <input className={cls(input, "flex-1 min-w-[160px]")} placeholder="Reference (optional)" value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            <select className={cls(input, "w-auto")} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
              {(catalog?.payFrequencies ?? []).map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            <input className={cls(input, "w-20")} maxLength={3} value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="text-xs text-slate-500">Period start
              <input type="date" className={cls(input, "mt-0.5")} value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} />
            </label>
            <label className="text-xs text-slate-500">Period end
              <input type="date" className={cls(input, "mt-0.5")} value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} />
            </label>
            <label className="text-xs text-slate-500">Pay date
              <input type="date" className={cls(input, "mt-0.5")} value={form.payDate} onChange={(e) => setForm({ ...form, payDate: e.target.value })} />
            </label>
            <label className="text-xs text-slate-500">Tax table
              <select className={cls(input, "mt-0.5 w-auto")} value={form.taxTableId} onChange={(e) => setForm({ ...form, taxTableId: e.target.value })}>
                <option value="">Default</option>
                {(tables ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          </div>
          {!tables?.length && (
            <p className="flex items-start gap-1.5 rounded-lg border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              No tax table configured yet — this run will calculate with no income tax. Set your bands on the Tax tab first.
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={create} disabled={busy}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">Create run</button>
            <button onClick={() => setCreating(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
          </div>
        </CardBody></Card>
      )}

      <Card><CardBody className="space-y-2">
        {runs && !runs.length && (
          <Empty icon={Wallet} title="No pay runs yet"
            hint="Create one for a period, calculate it, get it approved, then export the bank file." />
        )}
        {(runs ?? []).map((r) => (
          <div key={r.id} id={`run-${r.id}`}
            className={cls("rounded-xl border dark:border-slate-700",
              openId === r.id ? "border-indigo-300 ring-1 ring-indigo-200 dark:border-indigo-500/50 dark:ring-indigo-500/20" : "border-slate-200")}>
            <div className="flex flex-wrap items-start justify-between gap-2 p-3">
              <button className="min-w-0 flex-1 text-left" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{r.reference}</p>
                  <Pill tone={TONE[r.statusTone]}>{r.statusLabel}</Pill>
                  <Pill>{r.frequencyLabel}</Pill>
                  {r.totals?.skipped > 0 && <Pill tone={TONE.amber}>{r.totals.skipped} skipped</Pill>}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {day(r.periodStart)} → {day(r.periodEnd)} · pay {day(r.payDate)}
                  {r.totals?.headcount ? ` · ${r.totals.headcount} people · net ${money(r.totals.net, r.currency)}` : " · not calculated"}
                </p>
              </button>
              {["draft", "review", "cancelled"].includes(r.status) && (
                <button onClick={() => remove(r.id)} title="Delete run"
                  className="rounded-lg p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>
              )}
            </div>
            {openId === r.id && <RunDetail id={r.id} catalog={catalog} toast={toast} refetch={refetch} />}
          </div>
        ))}
      </CardBody></Card>
    </div>
  );
}

// ── Components tab ───────────────────────────────────────────────────────────
function Components({ catalog, toast }) {
  const { data: list, refetch } = useApi(() => payroll.components.list(true), []);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const blank = { code: "", name: "", kind: "deduction", calc: "fixed", amount: "", taxable: true, preTax: false, appliesTo: "all", capPerPeriod: "" };

  const save = async () => {
    setBusy(true);
    try {
      if (form.id) await payroll.components.update(form.id, form);
      else await payroll.components.create(form);
      toast.success?.("Component saved.");
      setForm(null); refetch();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const remove = async (id) => {
    try { await payroll.components.remove(id); toast.success?.("Component deleted."); refetch(); }
    catch (e) { toast.error?.(e.message); }
  };

  return (
    <div className="space-y-4">
      <Card><CardBody>
        <div className="flex items-start gap-2 text-xs text-slate-500">
          <Info size={14} className="mt-0.5 shrink-0 text-indigo-500" />
          <p>
            Components are your organization's recurring earnings, deductions and employer costs. Percentages
            state what they're a percentage of, and <strong>pre-tax</strong> deductions reduce taxable pay
            before income tax is worked out.
          </p>
        </div>
      </CardBody></Card>

      <div className="flex justify-end">
        <button onClick={() => setForm(form ? null : blank)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
          <Plus size={13} /> New component
        </button>
      </div>

      {form && (
        <Card><CardBody className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <input className={cls(input, "w-32")} placeholder="CODE" value={form.code} disabled={!!form.id}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            <input className={cls(input, "flex-1 min-w-[160px]")} placeholder="Name shown on the payslip" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select className={cls(input, "w-auto")} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              {(catalog?.componentKinds ?? []).map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <select className={cls(input, "w-auto")} value={form.calc} onChange={(e) => setForm({ ...form, calc: e.target.value })}>
              {(catalog?.componentCalcs ?? []).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <label className="text-xs text-slate-500">{form.calc === "fixed" ? "Amount" : "Percent"}
              <input type="number" min="0" step="0.01" className={cls(input, "mt-0.5 w-28")} value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </label>
            <label className="text-xs text-slate-500">Cap per period
              <input type="number" min="0" step="0.01" className={cls(input, "mt-0.5 w-28")} placeholder="none" value={form.capPerPeriod ?? ""}
                onChange={(e) => setForm({ ...form, capPerPeriod: e.target.value })} />
            </label>
            <select className={cls(input, "w-auto")} value={form.appliesTo} onChange={(e) => setForm({ ...form, appliesTo: e.target.value })}>
              {(catalog?.componentAppliesTo ?? []).map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-4">
            {form.kind === "earning" && (
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={form.taxable} onChange={(e) => setForm({ ...form, taxable: e.target.checked })} /> Taxable
              </label>
            )}
            {form.kind === "deduction" && (
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={form.preTax} onChange={(e) => setForm({ ...form, preTax: e.target.checked })} /> Pre-tax (reduces taxable pay)
              </label>
            )}
            {form.id && (
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={form.active !== false} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active
              </label>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={busy || !form.code || !form.name}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">Save</button>
            <button onClick={() => setForm(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
          </div>
        </CardBody></Card>
      )}

      <Card><CardBody className="space-y-1.5">
        {list && !list.length && (
          <Empty icon={Percent} title="No pay components yet"
            hint="Add pension, allowances, employer contributions — anything that recurs on a payslip." />
        )}
        {(list ?? []).map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-800/60">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                {c.name} <span className="font-normal text-slate-400">({c.code})</span>
              </p>
              <p className="text-[11px] text-slate-400">
                {c.kindLabel} · {c.calc === "fixed" ? money(c.amount, c.currency) : `${c.amount}% ${c.calc === "percent_of_base" ? "of base" : "of gross"}`}
                {c.capPerPeriod ? ` · capped at ${money(c.capPerPeriod, c.currency)}` : ""}
                {c.preTax ? " · pre-tax" : ""}
                {c.appliesTo === "assigned" ? ` · ${c.assignedCount ?? 0} assigned` : " · everyone"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!c.active && <Pill>inactive</Pill>}
              <button onClick={() => setForm({ ...c, capPerPeriod: c.capPerPeriod ?? "" })}
                className="rounded-lg border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Edit</button>
              <button onClick={() => remove(c.id)} className="rounded-lg p-1 text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
      </CardBody></Card>
    </div>
  );
}

// ── Tax tab ──────────────────────────────────────────────────────────────────
function TaxTables({ toast }) {
  const { data: tables, refetch } = useApi(() => payroll.taxTables.list(), []);
  const [form, setForm] = useState(null);
  const [preview, setPreview] = useState(null);
  const [testIncome, setTestIncome] = useState("60000");
  const [busy, setBusy] = useState(false);

  const blank = {
    name: "", jurisdiction: "", currency: "USD", allowance: 0, isDefault: true,
    bands: [{ upTo: "", rate: "" }, { upTo: "", rate: "" }],
  };

  const save = async () => {
    setBusy(true);
    try {
      await payroll.taxTables.save({
        ...form,
        bands: form.bands.map((b, i) => ({ upTo: i === form.bands.length - 1 ? null : Number(b.upTo), rate: Number(b.rate) })),
      });
      toast.success?.("Tax table saved.");
      setForm(null); refetch();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const test = async (id) => {
    try { setPreview(await payroll.taxTables.preview(id, Number(testIncome))); }
    catch (e) { toast.error?.(e.message); }
  };

  const remove = async (id) => {
    try { await payroll.taxTables.remove(id); toast.success?.("Tax table deleted."); refetch(); }
    catch (e) { toast.error?.(e.message); }
  };

  return (
    <div className="space-y-4">
      <Card><CardBody>
        <div className="flex items-start gap-2 text-xs text-slate-500">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
          <p>
            ExecUI ships no tax rates for any country — a wrong default would be worse than none. Enter your
            own jurisdiction's bands here, then test them against a salary you already know the answer for.
            <strong className="text-slate-600 dark:text-slate-300"> This is not tax advice.</strong>
          </p>
        </div>
      </CardBody></Card>

      <div className="flex justify-end">
        <button onClick={() => setForm(form ? null : blank)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
          <Plus size={13} /> New tax table
        </button>
      </div>

      {form && (
        <Card><CardBody className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <input className={cls(input, "flex-1 min-w-[160px]")} placeholder="Name, e.g. PAYE 2026" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={cls(input, "w-40")} placeholder="Jurisdiction" value={form.jurisdiction}
              onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })} />
            <input className={cls(input, "w-20")} maxLength={3} value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
            <label className="text-xs text-slate-500">Tax-free allowance
              <input type="number" min="0" className={cls(input, "mt-0.5 w-32")} value={form.allowance}
                onChange={(e) => setForm({ ...form, allowance: e.target.value })} />
            </label>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Annual bands (cumulative)</p>
            {form.bands.map((b, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <span className="w-16 text-[11px] text-slate-400">Band {i + 1}</span>
                <input type="number" min="0" className={cls(input, "w-36")}
                  placeholder={i === form.bands.length - 1 ? "no upper limit" : "up to…"}
                  disabled={i === form.bands.length - 1}
                  value={i === form.bands.length - 1 ? "" : b.upTo}
                  onChange={(e) => setForm({ ...form, bands: form.bands.map((x, j) => (j === i ? { ...x, upTo: e.target.value } : x)) })} />
                <input type="number" min="0" max="100" step="0.1" className={cls(input, "w-24")} placeholder="rate %"
                  value={b.rate}
                  onChange={(e) => setForm({ ...form, bands: form.bands.map((x, j) => (j === i ? { ...x, rate: e.target.value } : x)) })} />
                <span className="text-[11px] text-slate-400">%</span>
                {form.bands.length > 1 && (
                  <button onClick={() => setForm({ ...form, bands: form.bands.filter((_, j) => j !== i) })}
                    className="rounded-lg p-1 text-slate-400 hover:text-red-500"><X size={12} /></button>
                )}
              </div>
            ))}
            <button onClick={() => setForm({ ...form, bands: [...form.bands, { upTo: "", rate: "" }] })}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500">
              <Plus size={12} /> Add band
            </button>
            <p className="text-[11px] text-slate-400">
              Each rate applies only to the income inside its band. The last band has no upper limit.
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
            Use as the default for new pay runs
          </label>

          <div className="flex gap-2">
            <button onClick={save} disabled={busy || !form.name}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">Save table</button>
            <button onClick={() => setForm(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
          </div>
        </CardBody></Card>
      )}

      <Card><CardBody className="space-y-2">
        {tables && !tables.length && (
          <Empty icon={Percent} title="No tax tables configured"
            hint="Until you add one, pay runs will calculate with no income tax deducted." />
        )}
        {(tables ?? []).map((t) => (
          <div key={t.id} className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {t.name} {t.isDefault && <Pill tone={TONE.blue}>default</Pill>} {!t.active && <Pill>inactive</Pill>}
                </p>
                <p className="text-[11px] text-slate-400">
                  {t.jurisdiction ? `${t.jurisdiction} · ` : ""}{t.currency} · allowance {money(t.allowance, t.currency)} ·{" "}
                  {(t.bands ?? []).map((b) => `${b.rate}%${b.upTo ? ` to ${b.upTo.toLocaleString()}` : "+"}`).join(", ")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <input className={cls(input, "w-28")} value={testIncome} onChange={(e) => setTestIncome(e.target.value)} />
                <button onClick={() => test(t.id)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Test</button>
                <button onClick={() => setForm({ ...t, bands: [...(t.bands ?? []).map((b) => ({ upTo: b.upTo ?? "", rate: b.rate }))] })}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Edit</button>
                <button onClick={() => remove(t.id)} className="rounded-lg p-1 text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
              </div>
            </div>
            {preview?.table?.id === t.id && (
              <div className="mt-2 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                On {money(preview.annualIncome, t.currency)} a year: <strong>{money(preview.annualTax, t.currency)}</strong> tax
                ({preview.effectiveRate}% effective) · {money(preview.monthly, t.currency)} a month. {preview.note}
              </div>
            )}
          </div>
        ))}
      </CardBody></Card>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "runs", label: "Pay runs", icon: Wallet },
  { id: "components", label: "Components", icon: Percent },
  { id: "tax", label: "Tax", icon: FileText },
];

export default function Payroll({ embedded = false }) {
  const toast = useToast();
  const [tab, setTab] = useState("runs");
  const { data: catalog } = useApi(() => hr.catalog(), [], { cacheKey: "hr:catalog" });
  const { data: stats } = useApi(() => payroll.stats(), []);

  const subNav = (
    <div className="flex flex-wrap gap-1">
      {TABS.map((t) => (
        <button key={t.id} onClick={() => setTab(t.id)}
          className={cls("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
            tab === t.id
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800")}>
          <t.icon size={13} /> {t.label}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      {embedded ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {subNav}
          <p className="text-[11px] text-slate-400">
            ExecUI records payroll — it doesn&apos;t move money.
            {stats?.lastPaidRun ? ` Last paid: ${stats.lastPaidRun.reference} · ${day(stats.lastPaidRun.paidAt)}` : ""}
          </p>
        </div>
      ) : (
        <PageHeader
          title="Payroll"
          subtitle="Calculate pay, get it approved, and export the payment file. ExecUI records payroll — it doesn't move money."
          actions={stats?.lastPaidRun && (
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Last paid</p>
              <p className="text-[11px] text-slate-400">{stats.lastPaidRun.reference} · {day(stats.lastPaidRun.paidAt)}</p>
            </div>
          )}
        >
          {subNav}
        </PageHeader>
      )}

      {stats && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Draft runs", stats.byStatus?.draft ?? 0, Calculator],
            ["In review", stats.byStatus?.review ?? 0, Receipt],
            ["Paid runs", stats.byStatus?.paid ?? 0, CheckCircle2],
            ["Active components", stats.activeComponents, Percent],
          ].map(([label, value, Icon]) => (
            <Card key={label}><CardBody className="flex items-center gap-3">
              <Icon size={17} className="text-indigo-500" />
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
                <p className="text-[11px] text-slate-400">{label}</p>
              </div>
            </CardBody></Card>
          ))}
        </div>
      )}

      {tab === "runs" && <Runs catalog={catalog} toast={toast} />}
      {tab === "components" && <Components catalog={catalog} toast={toast} />}
      {tab === "tax" && <TaxTables toast={toast} />}
    </div>
  );
}
