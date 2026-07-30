/**
 * HR console — **administrators only**.
 *
 * People operations: the directory, employment records, compensation history,
 * leave administration, timesheet approvals and payroll. All of it administers
 * *other people*, which is why it is not in an employee's sidebar and not
 * reachable by URL for them. Their own record is `/account/my-hr`, beside their
 * profile, where it belongs.
 *
 * Payroll is a tab here rather than a page of its own. Pay is part of running
 * people — the run reads the employment records, the compensation history and the
 * approved timesheets that live on the other tabs — and as a separate top-level
 * nav item it advertised the most sensitive screen in the product to every
 * employee who couldn't open it. It is gated on the **effective** role, so a
 * system admin previewing the product as another role loses it too.
 *
 * Three further deliberate choices:
 *  • People with no employment record are shown as **Not onboarded** rather than
 *    hidden, because a missing HR record is exactly the thing a People console
 *    should surface.
 *  • Salary is only ever shown on the person's own detail panel, and government
 *    ids and bank details need an explicit, audited reveal.
 *  • Which tab you are on is in the URL, so a notification about a payslip or a
 *    pay run opens the tab that shows it.
 */
import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import { useApi } from "../../hooks/useApi";
import useRecordParam from "../../hooks/useRecordParam";
import { useToast } from "../../components/ui/Toast";
import { useUser } from "../../context/UserContext";
import { hr } from "../../services/api";
import MyHr from "./MyHr";
import Payroll from "./Payroll";
import {
  Users, Search, CalendarDays, Clock, Plus, Eye, Wallet, UserCog, AlertTriangle,
  CheckCircle2, XCircle, Sparkles, History, X, ShieldAlert,
} from "lucide-react";

const cls = (...a) => a.filter(Boolean).join(" ");
const input = "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white";
const day = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const when = (d) => (d ? new Date(d).toLocaleString() : "—");
const money = (n, cur) => `${cur ?? ""} ${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
const today = () => new Date().toISOString().slice(0, 10);

const TONE = {
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  probation: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  on_leave: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  notice: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
  terminated: "bg-slate-100 text-slate-500 dark:bg-slate-800",
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  approved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  rejected: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  submitted: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
};

function Pill({ children, tone }) {
  return <span className={cls("rounded-full px-2 py-0.5 text-[11px] font-medium", tone ?? TONE.terminated)}>{children}</span>;
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

// ── Person detail ────────────────────────────────────────────────────────────
function PersonDetail({ userId, catalog, people, toast, refetch }) {
  const { data: person, refetch: reload } = useApi(() => hr.people.get(userId), [userId]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [comp, setComp] = useState(null);
  const [revealed, setRevealed] = useState({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (!person) return <div className="border-t border-slate-200 p-3 text-xs text-slate-400 dark:border-slate-700">Loading…</div>;

  const startEdit = () => {
    setForm({
      employmentType: person.employmentType ?? "full_time",
      status: person.status ?? "active",
      hireDate: person.hireDate ? new Date(person.hireDate).toISOString().slice(0, 10) : "",
      endDate: person.endDate ? new Date(person.endDate).toISOString().slice(0, 10) : "",
      workLocation: person.workLocation ?? "",
      managerId: person.managerId ?? "",
      costCenter: person.costCenter ?? "",
      weeklyHours: person.weeklyHours ?? "",
      dateOfBirth: person.dateOfBirth ? new Date(person.dateOfBirth).toISOString().slice(0, 10) : "",
      emergencyName: person.emergencyName ?? "",
      emergencyPhone: person.emergencyPhone ?? "",
      emergencyRelation: person.emergencyRelation ?? "",
      bankName: person.bankName ?? "",
      taxId: "", nationalId: "", bankAccount: "",
      terminationReason: person.terminationReason ?? "",
      notes: person.notes ?? "",
    });
    setEditing(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      const payload = { ...form };
      for (const k of ["taxId", "nationalId", "bankAccount"]) if (!payload[k]) delete payload[k];
      await hr.people.save(userId, payload);
      toast.success?.("Employment record saved.");
      setEditing(false); reload(); refetch();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const reveal = async (field) => {
    try {
      const r = await hr.people.reveal(userId, field);
      setRevealed({ ...revealed, [field]: r.value ?? "not set" });
      toast.info?.("This view has been recorded on their timeline.");
    } catch (e) { toast.error?.(e.message); }
  };

  const addComp = async () => {
    setBusy(true);
    try {
      await hr.people.compensation.add(userId, comp);
      toast.success?.("Compensation recorded.");
      setComp(null); reload(); refetch();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const addNote = async () => {
    setBusy(true);
    try { await hr.people.note(userId, note); setNote(""); reload(); }
    catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3 border-t border-slate-200 p-3 dark:border-slate-700">
      {person.needsOnboarding && !editing && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <p>No employment record yet. Add one so this person can be included in payroll, leave and timesheets.</p>
        </div>
      )}

      {editing ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <select className={cls(input, "w-auto")} value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>
              {(catalog?.employmentTypes ?? []).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <select className={cls(input, "w-auto")} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {(catalog?.employmentStatuses ?? []).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <select className={cls(input, "w-auto")} value={form.workLocation} onChange={(e) => setForm({ ...form, workLocation: e.target.value })}>
              <option value="">Location…</option>
              {(catalog?.workLocations ?? []).map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <select className={cls(input, "w-auto min-w-[150px]")} value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
              <option value="">No manager</option>
              {(people ?? []).filter((p) => p.userId !== userId).map((p) => (
                <option key={p.userId} value={p.userId}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <label className="text-xs text-slate-500">Hired
              <input type="date" className={cls(input, "mt-0.5")} value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
            </label>
            <label className="text-xs text-slate-500">Last day
              <input type="date" className={cls(input, "mt-0.5")} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </label>
            <label className="text-xs text-slate-500">Weekly hours
              <input type="number" min="0" max="168" step="0.5" className={cls(input, "mt-0.5 w-24")} value={form.weeklyHours} onChange={(e) => setForm({ ...form, weeklyHours: e.target.value })} />
            </label>
            <label className="text-xs text-slate-500">Cost centre
              <input className={cls(input, "mt-0.5")} value={form.costCenter} onChange={(e) => setForm({ ...form, costCenter: e.target.value })} />
            </label>
            <label className="text-xs text-slate-500">Date of birth
              <input type="date" className={cls(input, "mt-0.5")} value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <input className={cls(input, "flex-1 min-w-[140px]")} placeholder="Emergency contact name" value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} />
            <input className={cls(input, "flex-1 min-w-[120px]")} placeholder="Emergency phone" value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} />
            <input className={cls(input, "w-32")} placeholder="Relationship" value={form.emergencyRelation} onChange={(e) => setForm({ ...form, emergencyRelation: e.target.value })} />
          </div>

          <div className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Encrypted at rest</p>
            <div className="flex flex-wrap gap-2">
              <input className={cls(input, "flex-1 min-w-[130px]")} placeholder={person.taxIdLast4 ? `Tax id (····${person.taxIdLast4})` : "Tax id"} value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
              <input className={cls(input, "flex-1 min-w-[130px]")} placeholder={person.nationalIdLast4 ? `National id (····${person.nationalIdLast4})` : "National id"} value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
              <input className={cls(input, "w-32")} placeholder="Bank name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
              <input className={cls(input, "flex-1 min-w-[140px]")} placeholder={person.bankAccountLast4 ? `Account (····${person.bankAccountLast4})` : "Bank account"} value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Leave blank to keep what's already stored. Values are encrypted and only the last 4 digits are shown afterwards.</p>
          </div>

          {form.status === "terminated" && (
            <input className={input} placeholder="Reason for leaving" value={form.terminationReason} onChange={(e) => setForm({ ...form, terminationReason: e.target.value })} />
          )}
          <textarea className={cls(input, "h-16")} placeholder="HR notes (internal)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

          <div className="flex gap-2">
            <button onClick={save} disabled={busy} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">Save record</button>
            <button onClick={() => setEditing(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Employment", `${person.employmentTypeLabel ?? "—"}`],
              ["Started", day(person.hireDate)],
              ["Manager", person.managerName || "—"],
              ["Location", person.workLocation || "—"],
              ["Weekly hours", person.weeklyHours ?? "—"],
              ["Cost centre", person.costCenter || "—"],
              ["Emergency contact", person.emergencyName ? `${person.emergencyName}${person.emergencyPhone ? ` · ${person.emergencyPhone}` : ""}` : "—"],
              ["Paid into", person.bankAccountLast4 ? `${person.bankName || "Account"} ····${person.bankAccountLast4}` : "Not set"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
                <p className="text-sm text-slate-800 dark:text-slate-100">{value}</p>
              </div>
            ))}
          </div>

          {person.notes && <p className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">{person.notes}</p>}

          <div className="flex flex-wrap gap-1.5">
            <button onClick={startEdit} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
              {person.needsOnboarding ? "Create employment record" : "Edit record"}
            </button>
            <button onClick={() => setComp({ effectiveFrom: today(), payType: "salary", baseAmount: "", currency: person.compensation?.currency ?? "USD", payFrequency: "monthly", reason: "raise" })}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
              <Wallet size={11} /> Record compensation
            </button>
            {["taxId", "nationalId", "bankAccount"].map((f) => (
              person[`${f}Last4`] || (f === "bankAccount" && person.hasBankDetails) ? (
                <button key={f} onClick={() => reveal(f)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-amber-300 hover:text-amber-600 dark:border-slate-700 dark:text-slate-300">
                  <Eye size={11} /> Reveal {f === "bankAccount" ? "account" : f === "taxId" ? "tax id" : "national id"}
                </button>
              ) : null
            ))}
          </div>

          {Object.entries(revealed).length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 dark:border-amber-500/40 dark:bg-amber-500/10">
              {Object.entries(revealed).map(([field, value]) => (
                <p key={field} className="font-mono text-xs text-amber-900 dark:text-amber-200">{field}: {value}</p>
              ))}
              <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">Recorded on this person's timeline.</p>
            </div>
          )}

          {comp && (
            <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">New compensation record</p>
              <div className="flex flex-wrap gap-2">
                <label className="text-xs text-slate-500">Effective
                  <input type="date" className={cls(input, "mt-0.5")} value={comp.effectiveFrom} onChange={(e) => setComp({ ...comp, effectiveFrom: e.target.value })} />
                </label>
                <select className={cls(input, "w-auto self-end")} value={comp.payType} onChange={(e) => setComp({ ...comp, payType: e.target.value })}>
                  {(catalog?.payTypes ?? []).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <label className="text-xs text-slate-500">{comp.payType === "hourly" ? "Hourly rate" : "Annual amount"}
                  <input type="number" min="0" step="0.01" className={cls(input, "mt-0.5 w-32")} value={comp.baseAmount} onChange={(e) => setComp({ ...comp, baseAmount: e.target.value })} />
                </label>
                <input className={cls(input, "w-20 self-end")} maxLength={3} value={comp.currency} onChange={(e) => setComp({ ...comp, currency: e.target.value.toUpperCase() })} />
                <select className={cls(input, "w-auto self-end")} value={comp.payFrequency} onChange={(e) => setComp({ ...comp, payFrequency: e.target.value })}>
                  {(catalog?.payFrequencies ?? []).map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
                <input className={cls(input, "w-28 self-end")} placeholder="reason" value={comp.reason} onChange={(e) => setComp({ ...comp, reason: e.target.value })} />
              </div>
              <p className="text-[11px] text-slate-400">
                This adds a dated record — it never overwrites the current one, so payroll can always say what applied when.
              </p>
              <div className="flex gap-2">
                <button onClick={addComp} disabled={busy || !comp.baseAmount}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">Save</button>
                <button onClick={() => setComp(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <Wallet size={11} /> Compensation history
              </p>
              {!person.compensationHistory?.length && <p className="text-xs text-slate-400">Nothing recorded yet.</p>}
              <div className="space-y-1">
                {(person.compensationHistory ?? []).map((c) => (
                  <div key={c.id} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs dark:bg-slate-800/60">
                    <p className="font-medium text-slate-700 dark:text-slate-200">
                      {money(c.baseAmount, c.currency)} {c.payType === "hourly" ? "per hour" : "per year"}
                      <span className="font-normal text-slate-400"> · {c.payFrequencyLabel?.toLowerCase()}</span>
                    </p>
                    <p className="text-[11px] text-slate-400">from {day(c.effectiveFrom)}{c.reason ? ` · ${c.reason}` : ""}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <History size={11} /> Timeline
              </p>
              <div className="mb-2 flex gap-2">
                <input className={input} placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && note.trim() && addNote()} />
                <button onClick={addNote} disabled={busy || !note.trim()}
                  className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300">Add</button>
              </div>
              <div className="max-h-56 space-y-1 overflow-auto">
                {(person.events ?? []).map((e) => (
                  <div key={e.id} className="text-[11px] text-slate-500">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{e.type}</span>
                    {e.detail ? ` — ${e.detail}` : ""}
                    {e.fromValue && e.toValue ? ` (${e.fromValue} → ${e.toValue})` : ""}
                    {e.actorName ? ` · ${e.actorName}` : ""}
                    <span className="text-slate-400"> · {when(e.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Directory ────────────────────────────────────────────────────────────────
function Directory({ catalog, toast }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const { data: people, refetch } = useApi(
    () => hr.people.list({ search: search || undefined, status: status || undefined, includeInactive: "false" }),
    [search, status],
  );
  // Global search has always linked people as `/people?user=<id>`. Until now
  // nothing here read that parameter, so every one of those results landed on an
  // unfiltered directory — the link looked right and did nothing.
  const [openId, setOpenId] = useRecordParam("user");

  useEffect(() => {
    if (!openId || !people) return;
    document.getElementById(`person-${openId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [openId, people]);

  // A linked-to person who isn't in the current page of results would otherwise
  // open nothing at all, which reads as a broken link rather than a filter.
  const missing = openId && people && !people.some((p) => p.userId === openId);

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={cls(input, "pl-8")} placeholder="Search name, email or role…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className={cls(input, "w-auto")} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {(catalog?.employmentStatuses ?? []).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-2">
          {people && !people.length && <Empty icon={Users} title="Nobody matches that" hint="Try a different search, or clear the status filter." />}
          {missing && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-[11px] text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              <span>The person you followed a link to isn&apos;t in the current filter.</span>
              <button onClick={() => { setSearch(""); setStatus(""); }}
                className="rounded-lg border border-amber-400 px-2 py-1 font-medium hover:bg-amber-100 dark:border-amber-500/50 dark:hover:bg-amber-500/20">
                Clear filters
              </button>
            </div>
          )}
          {(people ?? []).map((p) => (
            <div key={p.userId} id={`person-${p.userId}`}
              className={cls("rounded-xl border dark:border-slate-700",
                openId === p.userId ? "border-indigo-300 ring-1 ring-indigo-200 dark:border-indigo-500/50 dark:ring-indigo-500/20" : "border-slate-200")}>
              <button className="w-full p-3 text-left" onClick={() => setOpenId(openId === p.userId ? null : p.userId)}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{p.name}</p>
                  {p.needsOnboarding
                    ? <Pill tone={TONE.on_leave}>Not onboarded</Pill>
                    : <Pill tone={TONE[p.status]}>{p.statusLabel}</Pill>}
                  {p.employmentTypeLabel && <Pill>{p.employmentTypeLabel}</Pill>}
                  {p.employeeId && <Pill>#{p.employeeId}</Pill>}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {[p.jobTitle, p.department, p.email].filter(Boolean).join(" · ")}
                  {p.hireDate ? ` · since ${day(p.hireDate)}` : ""}
                  {p.compensation ? ` · ${money(p.compensation.baseAmount, p.compensation.currency)}${p.compensation.payType === "hourly" ? "/hr" : "/yr"}` : " · no pay set"}
                </p>
              </button>
              {openId === p.userId && (
                <PersonDetail userId={p.userId} catalog={catalog} people={people} toast={toast} refetch={refetch} />
              )}
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

// ── Leave administration ─────────────────────────────────────────────────────
function LeaveAdmin({ toast }) {
  const { data: types, refetch: reloadTypes } = useApi(() => hr.leave.types(true), []);
  const { data: requests, refetch } = useApi(() => hr.leave.requests({ status: "pending" }), []);
  const { data: upcoming } = useApi(() => hr.leave.calendar(), []);
  const [newType, setNewType] = useState(null);
  const [busy, setBusy] = useState(false);

  const decide = async (id, decision) => {
    setBusy(true);
    try { await hr.leave.decide(id, { decision }); toast.success?.(`Leave ${decision}.`); refetch(); }
    catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const seed = async () => {
    setBusy(true);
    try {
      const r = await hr.leave.seedTypes();
      toast.success?.(r.created ? `Added ${r.created} starter leave type(s) — edit the entitlements to match your policy.` : "Your catalog already covers the starter types.");
      reloadTypes();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const saveType = async () => {
    setBusy(true);
    try {
      await hr.leave.createType(newType);
      toast.success?.("Leave type added.");
      setNewType(null); reloadTypes();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const toggleType = async (t) => {
    try { await hr.leave.updateType(t.id, { active: !t.active }); reloadTypes(); }
    catch (e) { toast.error?.(e.message); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <CalendarDays size={15} className="text-indigo-500" /> Awaiting decision
          </h3>
          {requests && !requests.length && <Empty icon={CheckCircle2} title="Nothing waiting" hint="Requests needing a decision appear here." />}
          <div className="space-y-1.5">
            {(requests ?? []).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-800/60">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {r.userName} · {r.leaveTypeName} · {day(r.startDate)} → {day(r.endDate)} <span className="text-slate-400">({r.days}d)</span>
                    {r.paid === false && <span className="ml-1 text-amber-600 dark:text-amber-400">unpaid</span>}
                  </p>
                  {r.reason && <p className="truncate text-[11px] text-slate-400">{r.reason}</p>}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button onClick={() => decide(r.id, "approved")} disabled={busy}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-500/40 dark:text-emerald-400">
                    <CheckCircle2 size={11} /> Approve
                  </button>
                  <button onClick={() => decide(r.id, "rejected")} disabled={busy}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/40">
                    <XCircle size={11} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Leave types</h3>
            <div className="flex gap-1.5">
              {!types?.length && (
                <button onClick={seed} disabled={busy}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  <Sparkles size={11} /> Add starter types
                </button>
              )}
              <button onClick={() => setNewType({ code: "", name: "", paid: true, annualDays: 0, carryOverMax: 0 })}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-500">
                <Plus size={11} /> New type
              </button>
            </div>
          </div>

          {!types?.length && (
            <Empty icon={CalendarDays} title="No leave types yet"
              hint="Add the starter set and edit the entitlements — statutory allowances differ by country, so the numbers are yours to set." />
          )}

          {newType && (
            <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
              <input className={cls(input, "w-28")} placeholder="code" value={newType.code} onChange={(e) => setNewType({ ...newType, code: e.target.value })} />
              <input className={cls(input, "flex-1 min-w-[140px]")} placeholder="Name" value={newType.name} onChange={(e) => setNewType({ ...newType, name: e.target.value })} />
              <label className="text-xs text-slate-500">Days/year
                <input type="number" min="0" step="0.5" className={cls(input, "mt-0.5 w-20")} value={newType.annualDays} onChange={(e) => setNewType({ ...newType, annualDays: e.target.value })} />
              </label>
              <label className="text-xs text-slate-500">Carry over
                <input type="number" min="0" step="0.5" className={cls(input, "mt-0.5 w-20")} value={newType.carryOverMax} onChange={(e) => setNewType({ ...newType, carryOverMax: e.target.value })} />
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={newType.paid} onChange={(e) => setNewType({ ...newType, paid: e.target.checked })} /> Paid
              </label>
              <button onClick={saveType} disabled={busy || !newType.code || !newType.name}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Add</button>
              <button onClick={() => setNewType(null)} className="rounded-lg p-1.5 text-slate-400 hover:text-red-500"><X size={14} /></button>
            </div>
          )}

          <div className="space-y-1">
            {(types ?? []).map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800/60">
                <p className="text-xs text-slate-700 dark:text-slate-200">
                  <strong>{t.name}</strong> <span className="text-slate-400">({t.code})</span> · {t.annualDays} days/year
                  {t.carryOverMax ? ` · up to ${t.carryOverMax} carried over` : ""}
                  {t.paid ? "" : " · unpaid"}
                </p>
                <div className="flex items-center gap-2">
                  {!t.active && <Pill>inactive</Pill>}
                  <button onClick={() => toggleType(t)}
                    className="rounded-lg border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    {t.active ? "Deactivate" : "Reactivate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Who's away next</h3>
          {upcoming && !upcoming.length && <Empty icon={CalendarDays} title="Nobody booked off" hint="Approved and pending leave for the next 60 days shows here." />}
          <div className="space-y-1">
            {(upcoming ?? []).map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-700 dark:text-slate-200">{r.userName} <span className="text-slate-400">· {r.leaveTypeName}</span></span>
                <span className="text-slate-400">{day(r.startDate)} → {day(r.endDate)} · <Pill tone={TONE[r.status]}>{r.status}</Pill></span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// ── Timesheet approvals ──────────────────────────────────────────────────────
function TimeAdmin({ toast }) {
  const { data: pending, refetch } = useApi(() => hr.time.list({ status: "submitted" }), []);
  const [busy, setBusy] = useState(false);

  const decide = async (ids, decision) => {
    setBusy(true);
    try {
      const r = await hr.time.decide({ ids, decision });
      toast.success?.(`${r.decided} day(s) ${decision} · ${r.hours} hours.`);
      refetch();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const byUser = (pending ?? []).reduce((acc, e) => { (acc[e.userName] ??= []).push(e); return acc; }, {});

  return (
    <Card>
      <CardBody>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <Clock size={15} className="text-indigo-500" /> Hours awaiting approval
        </h3>
        {pending && !pending.length && (
          <Empty icon={CheckCircle2} title="No timesheets waiting"
            hint="Only approved hours are paid, so anything submitted lands here first." />
        )}
        <div className="space-y-3">
          {Object.entries(byUser).map(([name, entries]) => {
            const total = entries.reduce((s, e) => s + Number(e.hours ?? 0) + Number(e.overtimeHours ?? 0), 0);
            return (
              <div key={name} className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-700">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    {name} <span className="font-normal text-slate-400">· {entries.length} day(s) · {Math.round(total * 100) / 100} hours</span>
                  </p>
                  <div className="flex gap-1.5">
                    <button onClick={() => decide(entries.map((e) => e.id), "approved")} disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-500/40 dark:text-emerald-400">
                      <CheckCircle2 size={11} /> Approve all
                    </button>
                    <button onClick={() => decide(entries.map((e) => e.id), "rejected")} disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/40">
                      <XCircle size={11} /> Reject
                    </button>
                  </div>
                </div>
                <div className="space-y-0.5">
                  {entries.map((e) => (
                    <p key={e.id} className="text-[11px] text-slate-500">
                      {day(e.date)} · {e.hours}h{e.overtimeHours ? ` +${e.overtimeHours}h OT` : ""}{e.project ? ` · ${e.project}` : ""}{e.note ? ` · ${e.note}` : ""}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
const ADMIN_TABS = [
  { id: "directory", label: "Directory",  icon: Users },
  { id: "leave",     label: "Leave",      icon: CalendarDays },
  { id: "time",      label: "Timesheets", icon: Clock },
  { id: "payroll",   label: "Payroll",    icon: Wallet },
  { id: "me",        label: "My HR",      icon: UserCog },
];

export default function People() {
  const toast = useToast();
  const { isAdmin } = useUser();
  const [tabParam, setTab] = useRecordParam("tab");
  // A tab the viewer can't open is not a tab. `/people?tab=payroll` asked for by
  // someone who isn't an admin lands on the directory rather than on a blank
  // panel or an error.
  const tab = ADMIN_TABS.some((t) => t.id === tabParam) ? tabParam : "directory";
  const { data: catalog } = useApi(() => hr.catalog(), [], { cacheKey: "hr:catalog" });
  const { data: stats } = useApi(() => (isAdmin ? hr.stats() : Promise.resolve(null)), [isAdmin]);

  // `?section=` picks the sub-tab of the admin's own record on the My HR tab.
  const [section] = useRecordParam("section");

  // The route already sends non-administrators to their own record; this is the
  // belt-and-braces case (a role changing while the page is open).
  if (!isAdmin) return <Navigate to="/account/my-hr" replace />;

  return (
    <div>
      <PageHeader
        title="HR"
        subtitle="Employment records, compensation, leave, timesheets and payroll."
        actions={stats && tab !== "payroll" && (
          <div className="hidden gap-3 text-right sm:flex">
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{stats.headcount}</p>
              <p className="text-[11px] text-slate-400">people</p>
            </div>
            <div>
              <p className={cls("text-lg font-semibold", stats.awaitingOnboarding ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white")}>
                {stats.awaitingOnboarding}
              </p>
              <p className="text-[11px] text-slate-400">to onboard</p>
            </div>
            <div>
              <p className={cls("text-lg font-semibold", stats.pendingLeaveRequests ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white")}>
                {stats.pendingLeaveRequests}
              </p>
              <p className="text-[11px] text-slate-400">leave to decide</p>
            </div>
            <div>
              <p className={cls("text-lg font-semibold", stats.timesheetsAwaitingApproval ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white")}>
                {stats.timesheetsAwaitingApproval}
              </p>
              <p className="text-[11px] text-slate-400">hours to approve</p>
            </div>
          </div>
        )}
      >
        <div className="flex flex-wrap gap-1">
          {ADMIN_TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id === "directory" ? null : t.id)}
              className={cls("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                tab === t.id
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800")}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>
      </PageHeader>

      {stats && Object.keys(stats.annualSalaryByCurrency ?? {}).length > 0 && tab === "directory" && (
        <Card className="mb-4">
          <CardBody className="flex flex-wrap items-center gap-4">
            <Wallet size={16} className="text-indigo-500" />
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Annual salary commitment:{" "}
              {Object.entries(stats.annualSalaryByCurrency).map(([cur, v]) => money(v, cur)).join(" · ")}
            </p>
            <p className="text-[11px] text-slate-400">Salaried staff only, at today's rates. Currencies are never added together.</p>
          </CardBody>
        </Card>
      )}

      {tab === "directory" && <Directory catalog={catalog} toast={toast} />}
      {tab === "leave" && <LeaveAdmin toast={toast} />}
      {tab === "time" && <TimeAdmin toast={toast} />}
      {/* Payroll renders without its own page header — it is a section of HR, and
          two stacked titles would say so twice. */}
      {tab === "payroll" && <Payroll embedded />}
      {tab === "me" && <MyHr initialTab={["profile", "leave", "time", "pay"].includes(section) ? section : "profile"} />}
    </div>
  );
}
