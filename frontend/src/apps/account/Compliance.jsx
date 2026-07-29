/**
 * Compliance console — data-subject requests, retention policies and legal
 * holds, self-serve.
 *
 * The destructive actions here are irreversible and legally significant, so the
 * UI is deliberately explicit: erasure names exactly what will happen to each
 * category before you confirm, and retention shows a live count of what a
 * policy would remove before you let it run.
 */
import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import { useApi } from "../../hooks/useApi";
import { useToast } from "../../components/ui/Toast";
import { governance } from "../../services/api";
import {
  ShieldCheck, Search, Download, Trash2, Lock, Unlock, Clock, AlertTriangle,
  FileJson, RefreshCw, Play, Plus, X, Scale, Database, CheckCircle2,
} from "lucide-react";

const cls = (...a) => a.filter(Boolean).join(" ");
const input = "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white";
const when = (d) => (d ? new Date(d).toLocaleString() : "—");

const STATUS = {
  completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  blocked:   "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  failed:    "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  pending:   "bg-slate-100 text-slate-500 dark:bg-slate-800",
};

// ── Data-subject requests ────────────────────────────────────────────────────
function Subjects({ toast }) {
  const { data: requests, refetch } = useApi(() => governance.requests({ limit: 30 }), [], { cacheKey: "gov:requests" });
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState("");

  const lookup = async () => {
    setBusy(true); setSubject(null); setConfirming(false);
    try { setSubject(await governance.subject(email)); }
    catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const doExport = async () => {
    setBusy(true);
    try {
      const r = await governance.export(email);
      toast.success?.(`Exported ${r.recordCount} record(s).`);
      await governance.download(r.id);
      refetch();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const doErase = async () => {
    setBusy(true);
    try {
      const r = await governance.erase(email, note || undefined);
      toast.success?.(`Erasure ${r.status} — ${r.recordCount} record(s) processed.`);
      setConfirming(false); setSubject(null); setNote(""); refetch();
    } catch (e) { toast.error?.(e.message); refetch(); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center gap-2">
            <Search size={15} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Find a data subject</h3>
          </div>
          <div className="flex gap-2">
            <input className={input} placeholder="person@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && lookup()} />
            <button onClick={lookup} disabled={busy || !email.trim()}
              className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
              {busy ? "Searching…" : "Look up"}
            </button>
          </div>

          {subject && !subject.found && (
            <p className="text-sm text-slate-500">No employee or CRM contact holds that email address.</p>
          )}

          {subject?.found && (
            <div className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{subject.label}</p>
                <p className="text-xs text-slate-500">
                  {subject.email} · {subject.subjectType === "employee" ? "Employee" : "CRM contact"}
                  {subject.employee?.department ? ` · ${subject.employee.department}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={doExport} disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300">
                  <Download size={13} /> Export their data
                </button>
                <button onClick={() => setConfirming(true)} disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/40 dark:hover:bg-red-500/10">
                  <Trash2 size={13} /> Erase their data
                </button>
              </div>

              {confirming && (
                <div className="space-y-2 rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-500/40 dark:bg-red-500/10">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-500" />
                    <div className="text-xs text-slate-700 dark:text-slate-200">
                      <p className="font-semibold text-red-700 dark:text-red-400">This cannot be undone.</p>
                      <p className="mt-1">
                        Personal records are deleted. Audit logs, email logs and approval decisions are
                        <strong> anonymized instead of deleted</strong>, so the organization keeps a complete,
                        defensible trail of what happened. An active legal hold will block this.
                      </p>
                    </div>
                  </div>
                  <input className={input} placeholder="Note for the record (e.g. verified request ref)" value={note} onChange={(e) => setNote(e.target.value)} />
                  <div className="flex gap-2">
                    <button onClick={doErase} disabled={busy}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50">
                      {busy ? "Erasing…" : "Confirm erasure"}
                    </button>
                    <button onClick={() => setConfirming(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileJson size={15} className="text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Request history</h3>
            </div>
            <button onClick={refetch} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"><RefreshCw size={12} /> Refresh</button>
          </div>
          {!requests?.length ? (
            <p className="py-8 text-center text-sm text-slate-400">No data-subject requests yet.</p>
          ) : (
            <div className="space-y-1.5">
              {requests.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2.5 text-xs dark:border-slate-700">
                  <span className={cls("rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS[r.status])}>{r.status}</span>
                  <span className="font-medium uppercase text-slate-700 dark:text-slate-200">{r.type}</span>
                  <span className="text-slate-600 dark:text-slate-300">{r.subjectLabel || r.subjectEmail}</span>
                  <span className="text-slate-400">{when(r.createdAt)} · {r.recordCount} record(s)</span>
                  {r.type === "export" && r.status === "completed" && (
                    <button onClick={() => governance.download(r.id).catch((e) => toast.error?.(e.message))}
                      className="ml-auto inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
                      <Download size={11} /> JSON
                    </button>
                  )}
                  {r.error && <p className="w-full text-[11px] text-amber-600 dark:text-amber-400">{r.error}</p>}
                  {r.note && <p className="w-full text-[11px] text-slate-400">Note: {r.note}</p>}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ── Retention ────────────────────────────────────────────────────────────────
function Retention({ toast }) {
  const { data, refetch } = useApi(() => governance.retention.list(), [], { cacheKey: "gov:retention" });
  const { data: preview, refetch: refetchPreview } = useApi(() => governance.retention.preview(), [], { cacheKey: "gov:preview" });
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({});

  const save = async (category, retainDays, action) => {
    setBusy(true);
    try {
      await governance.retention.save({ category, retainDays: Number(retainDays), action });
      toast.success?.("Policy saved.");
      refetch(); refetchPreview();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const runNow = async () => {
    if (!window.confirm("Apply all active retention policies now? Data past its retention period will be permanently removed.")) return;
    setBusy(true);
    try {
      const r = await governance.retention.run();
      const purged = r.results.reduce((n, x) => n + (x.purged || 0), 0);
      toast.success?.(`Retention run complete — ${purged} record(s) processed.`);
      refetch(); refetchPreview();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const rows = [...(data?.policies || []), ...(data?.suggestions || [])];
  const previewFor = (cat) => (preview || []).find((p) => p.category === cat);

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Retention policies</h3>
            </div>
            <button onClick={runNow} disabled={busy || !data?.policies?.length}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300">
              <Play size={12} /> Run now
            </button>
          </div>
          <p className="mb-3 text-xs text-slate-400">
            Policies run automatically once a day. Data older than the retention window is deleted — or anonymized where
            an audit trail must survive.
          </p>

          <div className="space-y-1.5">
            {rows.map((p) => {
              const key = p.category;
              const pv = previewFor(key);
              const d = draft[key] || {};
              const days = d.retainDays ?? p.retainDays ?? "";
              const action = d.action ?? p.action ?? "delete";
              return (
                <div key={key} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Database size={12} className="text-slate-400" />
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.label}</span>
                      {p.suggested && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800">not configured</span>}
                      {p.pii && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">PII</span>}
                    </div>
                    {p.note && <p className="text-[11px] text-slate-400">{p.note}</p>}
                    {!p.suggested && (
                      <p className="text-[11px] text-slate-400">
                        Last run {when(p.lastRunAt)} · {p.totalPurged} processed all-time
                        {pv ? ` · ${pv.count} row(s) currently past retention` : ""}
                        {pv?.blocked ? ` · held by ${pv.heldBy.join(", ")}` : ""}
                      </p>
                    )}
                  </div>
                  <input type="number" min="1" max="3650" className={cls(input, "w-24")} placeholder="days" value={days}
                    onChange={(e) => setDraft({ ...draft, [key]: { ...d, retainDays: e.target.value } })} />
                  <select className={cls(input, "w-32")} value={action}
                    onChange={(e) => setDraft({ ...draft, [key]: { ...d, action: e.target.value } })}>
                    <option value="delete">delete</option>
                    <option value="anonymize">anonymize</option>
                  </select>
                  <button onClick={() => save(key, days, action)} disabled={busy || !days}
                    className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                    Save
                  </button>
                  {!p.suggested && (
                    <button onClick={() => governance.retention.remove(p.id).then(() => { toast.success?.("Policy removed."); refetch(); refetchPreview(); }).catch((e) => toast.error?.(e.message))}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-red-500 dark:border-slate-700"><X size={13} /></button>
                  )}
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// ── Legal holds ──────────────────────────────────────────────────────────────
function Holds({ catalog, toast }) {
  const { data: holds, refetch } = useApi(() => governance.holds.list(), [], { cacheKey: "gov:holds" });
  const [form, setForm] = useState({ open: false, name: "", reason: "", scope: "subject", subjectEmail: "", category: "" });
  const [busy, setBusy] = useState(false);

  const place = async () => {
    setBusy(true);
    try {
      await governance.holds.place(form);
      toast.success?.("Legal hold placed.");
      setForm({ open: false, name: "", reason: "", scope: "subject", subjectEmail: "", category: "" });
      refetch();
    } catch (e) { toast.error?.(e.message); } finally { setBusy(false); }
  };

  const release = async (id) => {
    if (!window.confirm("Release this hold? The data it protects becomes eligible for erasure and retention purging again.")) return;
    try { await governance.holds.release(id); toast.success?.("Hold released."); refetch(); }
    catch (e) { toast.error?.(e.message); }
  };

  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale size={15} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Legal holds</h3>
          </div>
          <button onClick={() => setForm({ ...form, open: !form.open })}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
            <Plus size={13} /> Place hold
          </button>
        </div>
        <p className="mb-3 text-xs text-slate-400">
          A hold freezes data against erasure and retention purging — for litigation, investigation or audit.
          A hold always beats a deletion request.
        </p>

        {form.open && (
          <div className="mb-4 space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <input className={input} placeholder="Name — e.g. Litigation #441" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={input} placeholder="Reason (optional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            <div className="flex gap-2">
              <select className={cls(input, "w-40")} value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
                <option value="subject">A person</option>
                <option value="category">A data category</option>
              </select>
              {form.scope === "subject" ? (
                <input className={input} placeholder="person@example.com" value={form.subjectEmail} onChange={(e) => setForm({ ...form, subjectEmail: e.target.value })} />
              ) : (
                <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="">Choose a category…</option>
                  {(catalog?.categories || []).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setForm({ ...form, open: false })} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800">Cancel</button>
              <button onClick={place} disabled={busy || !form.name.trim() || (form.scope === "subject" ? !form.subjectEmail.trim() : !form.category)}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                {busy ? "Placing…" : "Place hold"}
              </button>
            </div>
          </div>
        )}

        {!holds?.length ? (
          <p className="py-8 text-center text-sm text-slate-400">No legal holds.</p>
        ) : (
          <div className="space-y-1.5">
            {holds.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
                {h.active ? <Lock size={13} className="text-amber-500" /> : <Unlock size={13} className="text-slate-400" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{h.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {h.scope === "subject" ? `Person: ${h.subjectEmail}` : `Category: ${h.category}`} · Placed {when(h.createdAt)}
                    {h.releasedAt ? ` · Released ${when(h.releasedAt)}` : ""}
                  </p>
                  {h.reason && <p className="text-[11px] text-slate-500">{h.reason}</p>}
                </div>
                {h.active
                  ? <button onClick={() => release(h.id)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">Release</button>
                  : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800">released</span>}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Compliance() {
  const toast = useToast();
  const { data: catalog } = useApi(() => governance.catalog(), [], { cacheKey: "gov:catalog" });
  const [tab, setTab] = useState("subjects");

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Compliance"
        subtitle="Answer data-subject requests, keep data only as long as you've decided to, and freeze records when the law requires it."
      />

      <div className="mb-4 flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
        {[["subjects", "Data requests", Search], ["retention", "Retention", Clock], ["holds", "Legal holds", Scale]].map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cls("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition",
              tab === id ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === "subjects" && <Subjects toast={toast} />}
      {tab === "retention" && <Retention toast={toast} />}
      {tab === "holds" && <Holds catalog={catalog} toast={toast} />}

      <div className="mt-5 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-500" />
        <p>
          Every export, erasure and blocked attempt is recorded permanently — including the reason it was blocked —
          so you can evidence exactly how each request was handled. See <code>docs/COMPLIANCE.md</code>.
        </p>
      </div>
    </div>
  );
}
