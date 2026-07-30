/**
 * Self-service HR — what every employee sees about themselves.
 *
 * This page is the reason the module is worth having for people who aren't in
 * HR: your own leave balance, booking time off, your hours, and your payslips.
 * Everything here is scoped to the signed-in person by the server, so there is
 * no id in any request that could be pointed at a colleague.
 */
import { useState, useEffect } from "react";
import { Card, CardBody } from "../../components/ui/Card";
import { useApi } from "../../hooks/useApi";
import useRecordParam from "../../hooks/useRecordParam";
import { useToast } from "../../components/ui/Toast";
import { hr } from "../../services/api";
import {
  CalendarDays, Clock, Receipt, Download, Plus, X, Wallet, Users, BadgeCheck, AlertTriangle,
} from "lucide-react";

const cls = (...a) => a.filter(Boolean).join(" ");
const input = "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white";
const day = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const money = (n, cur) => `${cur ?? ""} ${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
const today = () => new Date().toISOString().slice(0, 10);

const STATUS_TONE = {
  approved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  pending:  "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  rejected: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-800",
  submitted: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  draft:    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

function Pill({ children, tone }) {
  return <span className={cls("rounded-full px-2 py-0.5 text-[11px] font-medium", tone ?? STATUS_TONE.draft)}>{children}</span>;
}

function Empty({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <Icon size={20} className="text-slate-300 dark:text-slate-600" />
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>
      {hint && <p className="max-w-sm text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ── Leave ────────────────────────────────────────────────────────────────────
function MyLeave({ types, toast }) {
  const { data, refetch } = useApi(() => hr.me.leave(), [], { cacheKey: "hr:me:leave" });
  const [booking, setBooking] = useState(false);
  const [form, setForm] = useState({ leaveTypeId: "", startDate: today(), endDate: today(), halfDay: false, reason: "" });
  const [busy, setBusy] = useState(false);

  const book = async () => {
    setBusy(true);
    try {
      await hr.me.requestLeave(form);
      toast.success?.("Leave requested — you'll be notified when it's decided.");
      setBooking(false); setForm({ ...form, reason: "" }); refetch();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const cancel = async (id) => {
    try { await hr.me.cancelLeave(id); toast.success?.("Leave cancelled."); refetch(); }
    catch (e) { toast.error?.(e.message); }
  };

  const balances = data?.balances ?? [];
  const requests = data?.requests ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <CalendarDays size={15} className="text-indigo-500" /> My leave balance
            </h3>
            <button onClick={() => setBooking((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
              <Plus size={13} /> Book time off
            </button>
          </div>

          {!balances.length && (
            <Empty icon={CalendarDays} title="No leave allocation yet"
              hint="Your organization hasn't set up leave types, or your record hasn't been created." />
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {balances.map((b) => (
              <div key={b.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs font-medium text-slate-500">{b.leaveTypeName}</p>
                <p className="mt-0.5 text-2xl font-semibold text-slate-900 dark:text-white">{b.remaining}</p>
                <p className="text-[11px] text-slate-400">
                  days left of {b.entitledDays + b.carriedOver + b.adjustment}
                  {b.carriedOver ? ` (incl. ${b.carriedOver} carried over)` : ""}
                </p>
                {!b.paid && <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">Unpaid</p>}
              </div>
            ))}
          </div>

          {booking && (
            <div className="mt-3 space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex flex-wrap gap-2">
                <select className={cls(input, "w-auto min-w-[160px]")} value={form.leaveTypeId}
                  onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}>
                  <option value="">Choose a leave type…</option>
                  {(types ?? []).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}{t.paid ? "" : " (unpaid)"}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-xs text-slate-500">
                  From <input type="date" className={cls(input, "w-auto")} value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value, endDate: form.endDate < e.target.value ? e.target.value : form.endDate })} />
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-500">
                  To <input type="date" className={cls(input, "w-auto")} value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={form.halfDay}
                    onChange={(e) => setForm({ ...form, halfDay: e.target.checked, endDate: e.target.checked ? form.startDate : form.endDate })} />
                  Half day
                </label>
              </div>
              <input className={input} placeholder="Reason (optional)" value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              <div className="flex gap-2">
                <button onClick={book} disabled={busy || !form.leaveTypeId}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                  {busy ? "Requesting…" : "Request leave"}
                </button>
                <button onClick={() => setBooking(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">My requests</h3>
          {!requests.length && <Empty icon={CalendarDays} title="No leave booked" hint="Requests you make will appear here with their status." />}
          <div className="space-y-1.5">
            {requests.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-800/60">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {r.leaveTypeName} · {day(r.startDate)} → {day(r.endDate)} <span className="text-slate-400">({r.days}d)</span>
                  </p>
                  {r.reason && <p className="truncate text-[11px] text-slate-400">{r.reason}</p>}
                  {r.decisionNote && <p className="truncate text-[11px] text-slate-400">Note: {r.decisionNote}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Pill tone={STATUS_TONE[r.status]}>{r.status}</Pill>
                  {["pending", "approved"].includes(r.status) && (
                    <button onClick={() => cancel(r.id)} title="Cancel"
                      className="rounded-lg p-1 text-slate-400 hover:text-red-500"><X size={13} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// ── Timesheet ────────────────────────────────────────────────────────────────
function MyTime({ toast }) {
  const [range, setRange] = useState(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 13 * 86400000);
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
  });
  const { data, refetch } = useApi(() => hr.me.time(range), [range.from, range.to]);
  const [form, setForm] = useState({ date: today(), hours: "", overtimeHours: "", project: "", note: "" });
  const [busy, setBusy] = useState(false);

  const log = async (submit) => {
    setBusy(true);
    try {
      await hr.me.logTime({ ...form, hours: Number(form.hours), overtimeHours: Number(form.overtimeHours) || 0, submit });
      toast.success?.(submit ? "Hours logged and submitted." : "Hours logged as a draft.");
      setForm({ ...form, hours: "", overtimeHours: "", note: "" }); refetch();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const submitRange = async () => {
    setBusy(true);
    try {
      const r = await hr.me.submitTime(range);
      toast.success?.(`${r.submitted} day(s) submitted for approval.`);
      refetch();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const remove = async (id) => {
    try { await hr.me.deleteTime(id); toast.success?.("Entry removed."); refetch(); }
    catch (e) { toast.error?.(e.message); }
  };

  const entries = data?.entries ?? [];
  const summary = data?.summary;

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Clock size={15} className="text-indigo-500" /> Log hours
          </h3>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-slate-500">Date
              <input type="date" className={cls(input, "mt-0.5")} value={form.date} max={today()}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
            <label className="text-xs text-slate-500">Hours
              <input type="number" step="0.25" min="0" className={cls(input, "mt-0.5 w-24")} value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })} />
            </label>
            <label className="text-xs text-slate-500">Overtime
              <input type="number" step="0.25" min="0" className={cls(input, "mt-0.5 w-24")} value={form.overtimeHours}
                onChange={(e) => setForm({ ...form, overtimeHours: e.target.value })} />
            </label>
            <label className="min-w-[140px] flex-1 text-xs text-slate-500">Project
              <input className={cls(input, "mt-0.5")} placeholder="optional" value={form.project}
                onChange={(e) => setForm({ ...form, project: e.target.value })} />
            </label>
          </div>
          <input className={input} placeholder="Note (optional)" value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => log(false)} disabled={busy || !form.hours}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300">Save draft</button>
            <button onClick={() => log(true)} disabled={busy || !form.hours}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">Log &amp; submit</button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">My hours</h3>
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" className={cls(input, "w-auto")} value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
              <input type="date" className={cls(input, "w-auto")} value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
              <button onClick={submitRange} disabled={busy}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300">
                Submit drafts in range
              </button>
            </div>
          </div>

          {summary && (
            <div className="mb-3 flex flex-wrap gap-4 text-xs text-slate-500">
              <span><strong className="text-slate-800 dark:text-slate-200">{summary.hours}</strong> hours</span>
              <span><strong className="text-slate-800 dark:text-slate-200">{summary.overtimeHours}</strong> overtime</span>
              <span><strong className="text-slate-800 dark:text-slate-200">{summary.unpaidApprovedHours}</strong> approved &amp; awaiting payroll</span>
            </div>
          )}

          {!entries.length && <Empty icon={Clock} title="No hours in this range" hint="Log a day above to get started." />}
          <div className="space-y-1">
            {entries.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800/60">
                <p className="min-w-0 truncate text-xs text-slate-700 dark:text-slate-200">
                  {day(e.date)} · <strong>{e.hours}h</strong>{e.overtimeHours ? ` +${e.overtimeHours}h OT` : ""}
                  {e.project ? ` · ${e.project}` : ""}{e.note ? ` · ${e.note}` : ""}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  {e.paid && <Pill tone={STATUS_TONE.approved}>paid</Pill>}
                  <Pill tone={STATUS_TONE[e.status]}>{e.status}</Pill>
                  {e.status === "draft" && (
                    <button onClick={() => remove(e.id)} className="rounded-lg p-1 text-slate-400 hover:text-red-500"><X size={13} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// ── Payslips ─────────────────────────────────────────────────────────────────
function MyPay({ toast }) {
  const { data: slips } = useApi(() => hr.me.payslips(), [], { cacheKey: "hr:me:payslips" });
  const { data: ytd } = useApi(() => hr.me.ytd(), []);
  // "Your payslip for JUL-2026 is available" opens that payslip.
  const [openId, setOpenId] = useRecordParam("payslip");

  useEffect(() => {
    if (!openId || !slips) return;
    document.getElementById(`slip-${openId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [openId, slips]);

  return (
    <div className="space-y-4">
      {ytd && ytd.payslips > 0 && (
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ["Gross so far", ytd.gross], ["Tax", ytd.tax],
            ["Deductions", ytd.deductions], ["Take-home", ytd.net],
          ].map(([label, value]) => (
            <Card key={label}><CardBody>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">{label} · {ytd.year}</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-white">{money(value, ytd.currency)}</p>
            </CardBody></Card>
          ))}
        </div>
      )}

      <Card>
        <CardBody>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Receipt size={15} className="text-indigo-500" /> My payslips
          </h3>
          {slips && !slips.length && (
            <Empty icon={Receipt} title="No payslips yet"
              hint="Payslips appear here once a pay run covering you has been approved." />
          )}
          <div className="space-y-1.5">
            {(slips ?? []).map((p) => (
              <div key={p.id} id={`slip-${p.id}`}
                className={cls("rounded-xl border dark:border-slate-700",
                  openId === p.id ? "border-indigo-300 ring-1 ring-indigo-200 dark:border-indigo-500/50 dark:ring-indigo-500/20" : "border-slate-200")}>
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5">
                  <button className="min-w-0 flex-1 text-left" onClick={() => setOpenId(openId === p.id ? null : p.id)}>
                    <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{p.run?.reference}</p>
                    <p className="text-[11px] text-slate-400">
                      {day(p.run?.periodStart)} → {day(p.run?.periodEnd)} · paid {day(p.run?.payDate)}
                      {p.prorated ? ` · prorated (${p.daysWorked}/${p.daysInPeriod} days)` : ""}
                    </p>
                  </button>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{money(p.net, p.currency)}</span>
                    <button onClick={() => hr.me.payslipPdf(p.id).catch((e) => toast.error?.(e.message))}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
                      <Download size={11} /> PDF
                    </button>
                  </div>
                </div>
                {openId === p.id && (
                  <div className="border-t border-slate-200 p-2.5 dark:border-slate-700">
                    <table className="w-full text-xs">
                      <tbody>
                        {(p.lines ?? []).map((l, i) => (
                          <tr key={i} className={l.kind === "info" ? "text-slate-400" : ""}>
                            <td className="py-0.5 text-slate-600 dark:text-slate-300">{l.label}</td>
                            <td className={cls("py-0.5 text-right tabular-nums",
                              l.kind === "earning" ? "text-slate-800 dark:text-slate-100"
                                : l.kind === "employer" ? "text-slate-400"
                                  : l.kind === "info" ? "text-slate-400" : "text-red-600 dark:text-red-400")}>
                              {money(l.amount, p.currency)}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t border-slate-200 font-semibold dark:border-slate-700">
                          <td className="pt-1 text-slate-700 dark:text-slate-200">Net pay</td>
                          <td className="pt-1 text-right tabular-nums text-emerald-700 dark:text-emerald-400">{money(p.net, p.currency)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// ── Profile ──────────────────────────────────────────────────────────────────
function MyProfile({ toast }) {
  const { data: me, refetch } = useApi(() => hr.me.get(), [], { cacheKey: "hr:me" });
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!me) return <Card><CardBody><p className="text-sm text-slate-400">Loading…</p></CardBody></Card>;

  if (me.needsOnboarding) {
    return (
      <Card><CardBody>
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Your HR record hasn't been set up yet</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Ask an administrator to add your employment details. Until then leave, timesheets and payslips
              won't have anything to work from.
            </p>
          </div>
        </div>
      </CardBody></Card>
    );
  }

  const editing = form !== null;
  const start = () => setForm({
    emergencyName: me.emergencyName ?? "", emergencyPhone: me.emergencyPhone ?? "",
    emergencyRelation: me.emergencyRelation ?? "", bankName: me.bankName ?? "", bankAccount: "",
  });

  const save = async () => {
    setBusy(true);
    try {
      const payload = { ...form };
      if (!payload.bankAccount) delete payload.bankAccount;
      await hr.me.update(payload);
      toast.success?.("Details updated.");
      setForm(null); refetch();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <Card><CardBody>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Role", me.jobTitle || "—"],
            ["Employment", `${me.employmentTypeLabel ?? "—"} · ${me.statusLabel ?? "—"}`],
            ["Started", day(me.hireDate)],
            ["Manager", me.managerName || "—"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
              <p className="text-sm text-slate-800 dark:text-slate-100">{value}</p>
            </div>
          ))}
        </div>
        {me.compensation && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
            <Wallet size={15} className="text-indigo-500" />
            <p className="text-sm text-slate-700 dark:text-slate-200">
              {me.compensation.payType === "hourly"
                ? `${money(me.compensation.baseAmount, me.compensation.currency)} per hour`
                : `${money(me.compensation.baseAmount, me.compensation.currency)} per year`}
              <span className="text-slate-400"> · paid {me.compensation.payFrequencyLabel?.toLowerCase()}</span>
            </p>
          </div>
        )}
        {me.directReports?.length > 0 && (
          <div className="mt-4">
            <p className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-400">
              <Users size={11} /> My team
            </p>
            <div className="flex flex-wrap gap-1.5">
              {me.directReports.map((r) => (
                <span key={r.userId} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {r.name}{r.jobTitle ? ` · ${r.jobTitle}` : ""}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardBody></Card>

      <Card><CardBody className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Emergency contact &amp; payment details</h3>
          {!editing && (
            <button onClick={start} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Edit</button>
          )}
        </div>

        {!editing ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Emergency contact</p>
              <p className="text-sm text-slate-800 dark:text-slate-100">
                {me.emergencyName || "—"}{me.emergencyRelation ? ` (${me.emergencyRelation})` : ""}
                {me.emergencyPhone ? ` · ${me.emergencyPhone}` : ""}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Paid into</p>
              <p className="flex items-center gap-1.5 text-sm text-slate-800 dark:text-slate-100">
                {me.bankAccountLast4
                  ? <>{me.bankName || "Account"} ····{me.bankAccountLast4} <BadgeCheck size={13} className="text-emerald-500" /></>
                  : "Not set"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <input className={cls(input, "flex-1 min-w-[140px]")} placeholder="Contact name" value={form.emergencyName}
                onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} />
              <input className={cls(input, "flex-1 min-w-[120px]")} placeholder="Phone" value={form.emergencyPhone}
                onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} />
              <input className={cls(input, "w-32")} placeholder="Relationship" value={form.emergencyRelation}
                onChange={(e) => setForm({ ...form, emergencyRelation: e.target.value })} />
            </div>
            <div className="flex flex-wrap gap-2">
              <input className={cls(input, "flex-1 min-w-[140px]")} placeholder="Bank name" value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
              <input className={cls(input, "flex-1 min-w-[160px]")} placeholder={me.bankAccountLast4 ? `Account number (····${me.bankAccountLast4}) — leave blank to keep` : "Account number"}
                value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} />
            </div>
            <p className="text-[11px] text-slate-400">
              Your account number is encrypted before it's stored. Nobody sees it in full again — payroll uses
              it to build the bank payment file.
            </p>
            <div className="flex gap-2">
              <button onClick={save} disabled={busy}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">Save</button>
              <button onClick={() => setForm(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
            </div>
          </div>
        )}
      </CardBody></Card>
    </div>
  );
}

// ── Shell ────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "profile", label: "My details", icon: BadgeCheck },
  { id: "leave",   label: "Leave",      icon: CalendarDays },
  { id: "time",    label: "Timesheet",  icon: Clock },
  { id: "pay",     label: "Payslips",   icon: Receipt },
];

export default function MyHr({ initialTab = "profile" }) {
  const toast = useToast();
  const [tab, setTab] = useState(initialTab);
  const { data: types } = useApi(() => hr.leave.types(), [], { cacheKey: "hr:leaveTypes" });

  return (
    <div className="space-y-4">
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

      {tab === "profile" && <MyProfile toast={toast} />}
      {tab === "leave" && <MyLeave types={types} toast={toast} />}
      {tab === "time" && <MyTime toast={toast} />}
      {tab === "pay" && <MyPay toast={toast} />}
    </div>
  );
}
