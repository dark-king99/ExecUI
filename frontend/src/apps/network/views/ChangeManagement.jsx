import { useState } from "react";
import { GitBranch, Plus, RefreshCw, AlertCircle, X, Clock, CheckCircle, XCircle, ChevronRight } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../../components/ui/Skeleton";
import { useToast } from "../../../components/ui/Toast";
import { useApi, useMutation } from "../../../hooks/useApi";
import { network } from "../../../services/api";

const RISK_VARIANT = { low: "success", medium: "warning", high: "danger", critical: "danger" };
const STATUS_VARIANT = { approved: "success", pending: "warning", "in-progress": "info", scheduled: "neutral", rejected: "danger", completed: "success" };
const TYPE_VARIANT = { standard: "neutral", normal: "info", emergency: "danger" };
const EMPTY = { title: "", type: "standard", risk: "low", owner: "", window: "", description: "" };

function SubmitChangeModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => network.changes.create(d), {
    onSuccess: () => { toast({ message: "Change request submitted", type: "success" }); onCreated(); onClose(); },
    onError: (e) => setErr(e?.message ?? "Failed to submit change"),
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">Submit Change Request</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); setErr(null); if (!form.title.trim()) { setErr("Title required"); return; } mutate({ ...form, status: "pending" }); }} className="px-6 py-5 space-y-4">
          {err && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Title *</label>
            <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="What are you changing?" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
              <select value={form.type} onChange={e => set("type", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {["standard", "normal", "emergency"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Risk Level</label>
              <select value={form.risk} onChange={e => set("risk", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {["low", "medium", "high", "critical"].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Owner</label>
              <input value={form.owner} onChange={e => set("owner", e.target.value)} placeholder="Engineer name" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Maintenance Window</label>
            <input value={form.window} onChange={e => set("window", e.target.value)} placeholder="e.g. 2026-05-20 02:00–04:00 UTC" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description / Impact</label>
            <textarea rows={3} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe the change, steps, rollback plan…" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white transition">{loading ? "Submitting…" : "Submit Request"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ChangeManagement() {
  const toast = useToast();
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState(null);

  const { data: changes, loading, error, refetch } = useApi(() => network.changes.list({ limit: 100 }), [], { pollingInterval: 60000 });

  const { mutate: approve } = useMutation((id) => network.changes.approve(id), {
    onSuccess: () => { refetch(); toast({ message: "Change approved", type: "success" }); },
    onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }),
  });
  const { mutate: reject } = useMutation((id) => network.changes.reject(id), {
    onSuccess: () => { refetch(); toast({ message: "Change rejected", type: "success" }); },
    onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }),
  });

  const all = changes ?? [];
  const selectedChange = all.find(c => c.id === selected);
  const pending = all.filter(c => c.status === "pending").length;
  const approved = all.filter(c => c.status === "approved").length;
  const emergency = all.filter(c => c.type === "emergency").length;

  return (
    <div className="space-y-6">
      {showNew && <SubmitChangeModal onClose={() => setShowNew(false)} onCreated={refetch} />}
      <PageHeader title="Change Management" subtitle="Review, approve, and track infrastructure change requests"
        actions={
          <div className="flex gap-2">
            <button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /></button>
            <button onClick={() => setShowNew(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg transition"><Plus size={14} /> Submit Change</button>
          </div>
        }
      />

      {loading && all.length === 0 ? (
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Pending Review" value={pending} icon={Clock} color="amber" />
          <Stat label="Approved" value={approved} icon={CheckCircle} color="emerald" />
          <Stat label="Emergency Changes" value={emergency} icon={AlertCircle} color="red" />
        </div>
      )}

      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}

      <div className={`grid gap-4 ${selectedChange ? "grid-cols-1 lg:grid-cols-5" : "grid-cols-1"}`}>
        <div className={selectedChange ? "lg:col-span-3" : ""}>
          <Card>
            {loading && all.length === 0 ? <div className="p-5"><SkeletonTable rows={8} /></div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      {["Type", "Title", "Risk", "Owner", "Status", "Window", ""].map(h => (
                        <th key={h} className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {all.length === 0 ? (
                      <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-500">No change requests. Submit your first change.</td></tr>
                    ) : all.map((c, i) => (
                      <tr key={c.id ?? i} onClick={() => setSelected(c.id === selected ? null : c.id)} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition ${selected === c.id ? "bg-emerald-50 dark:bg-emerald-900/10" : ""}`}>
                        <td className="p-4"><StatusBadge label={c.type ?? "standard"} variant={TYPE_VARIANT[c.type] ?? "neutral"} /></td>
                        <td className="p-4 font-medium text-slate-900 dark:text-white max-w-xs truncate">{c.title}</td>
                        <td className="p-4"><StatusBadge label={c.risk ?? "low"} variant={RISK_VARIANT[c.risk] ?? "neutral"} /></td>
                        <td className="p-4 text-slate-500">{c.owner ?? "—"}</td>
                        <td className="p-4"><StatusBadge label={c.status ?? "pending"} variant={STATUS_VARIANT[c.status] ?? "neutral"} dot /></td>
                        <td className="p-4 text-slate-400 text-xs">{c.window ?? "—"}</td>
                        <td className="p-4"><ChevronRight size={14} className="text-slate-300" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {selectedChange && (
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white truncate pr-2">{selectedChange.title}</h3>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 shrink-0"><X size={16} /></button>
              </div>
              <CardBody className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["Type", selectedChange.type],
                    ["Risk", selectedChange.risk],
                    ["Status", selectedChange.status],
                    ["Owner", selectedChange.owner ?? "—"],
                    ["Window", selectedChange.window ?? "—"],
                    ["Submitted", selectedChange.createdAt ?? selectedChange.created_at ?? "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5">
                      <div className="text-[10px] text-slate-400 mb-0.5">{label}</div>
                      {label === "Risk" ? <StatusBadge label={value ?? "low"} variant={RISK_VARIANT[value] ?? "neutral"} /> : label === "Status" ? <StatusBadge label={value ?? "pending"} variant={STATUS_VARIANT[value] ?? "neutral"} dot /> : label === "Type" ? <StatusBadge label={value ?? "standard"} variant={TYPE_VARIANT[value] ?? "neutral"} /> : <div className="text-sm font-medium text-slate-900 dark:text-white">{value}</div>}
                    </div>
                  ))}
                </div>
                {selectedChange.description && (
                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-1">Description</div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{selectedChange.description}</p>
                  </div>
                )}
                {selectedChange.status === "pending" && (
                  <div className="flex gap-2">
                    <button onClick={() => reject(selectedChange.id)} className="flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"><XCircle size={14} />Reject</button>
                    <button onClick={() => approve(selectedChange.id)} className="flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition"><CheckCircle size={14} />Approve</button>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
