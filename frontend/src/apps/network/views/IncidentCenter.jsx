import { useState } from "react";
import { AlertTriangle, Plus, RefreshCw, AlertCircle, X, Clock, ChevronRight, CheckCircle, TrendingUp } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../../components/ui/Skeleton";
import { useToast } from "../../../components/ui/Toast";
import { useApi, useMutation } from "../../../hooks/useApi";
import { network } from "../../../services/api";

const SEV_VARIANT = { critical: "danger", high: "danger", medium: "warning", low: "info" };
const STATUS_VARIANT = { open: "danger", investigating: "warning", "in-progress": "info", resolved: "success", closed: "neutral" };
const EMPTY_INC = { title: "", severity: "medium", owner: "", description: "" };

function NewIncidentModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_INC);
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => network.incidents.create(d), {
    onSuccess: () => { toast({ message: "Incident created", type: "success" }); onCreated(); onClose(); },
    onError: (e) => setErr(e?.message ?? "Failed to create incident"),
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">New Incident</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); setErr(null); if (!form.title.trim()) { setErr("Title required"); return; } mutate({ ...form, status: "open" }); }} className="px-6 py-5 space-y-4">
          {err && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Title *</label>
            <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Brief description of the incident" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Severity</label>
              <select value={form.severity} onChange={e => set("severity", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {["critical", "high", "medium", "low"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Owner / Assignee</label>
              <input value={form.owner} onChange={e => set("owner", e.target.value)} placeholder="On-call engineer" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea rows={3} value={form.description} onChange={e => set("description", e.target.value)} placeholder="What happened? What is the impact?" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white transition">{loading ? "Creating…" : "Create Incident"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function IncidentCenter() {
  const toast = useToast();
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState(null);

  const { data: incidents, loading, error, refetch } = useApi(() => network.incidents.list({ limit: 100 }), [], { pollingInterval: 30000 });
  const { data: timeline, loading: tlLoading } = useApi(
    () => selected ? network.incidents.timeline(selected) : Promise.resolve([]),
    [selected], {}
  );

  const { mutate: resolve } = useMutation((id) => network.incidents.resolve(id), {
    onSuccess: () => { refetch(); toast({ message: "Incident resolved", type: "success" }); setSelected(null); },
    onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }),
  });
  const { mutate: escalate } = useMutation((id) => network.incidents.escalate(id), {
    onSuccess: () => { refetch(); toast({ message: "Incident escalated", type: "warning" }); },
    onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }),
  });

  const all = incidents ?? [];
  const tl = timeline ?? [];
  const selectedInc = all.find(i => i.id === selected);
  const open = all.filter(i => ["open", "investigating", "in-progress"].includes(i.status)).length;
  const critical = all.filter(i => i.severity === "critical").length;
  const resolved = all.filter(i => i.status === "resolved" || i.status === "closed").length;

  return (
    <div className="space-y-6">
      {showNew && <NewIncidentModal onClose={() => setShowNew(false)} onCreated={refetch} />}
      <PageHeader title="Incident Center" subtitle="Detect, triage, and resolve network incidents"
        actions={
          <div className="flex gap-2">
            <button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /></button>
            <button onClick={() => setShowNew(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg transition"><Plus size={14} /> New Incident</button>
          </div>
        }
      />

      {loading && all.length === 0 ? (
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Open Incidents" value={open} icon={AlertTriangle} color="red" />
          <Stat label="Critical" value={critical} icon={AlertCircle} color="red" />
          <Stat label="Resolved (Total)" value={resolved} icon={CheckCircle} color="emerald" />
        </div>
      )}

      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}

      <div className={`grid gap-4 ${selectedInc ? "grid-cols-1 lg:grid-cols-5" : "grid-cols-1"}`}>
        <div className={selectedInc ? "lg:col-span-3" : ""}>
          <Card>
            {loading && all.length === 0 ? <div className="p-5"><SkeletonTable rows={8} /></div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      {["Severity", "Title", "Owner", "Status", "Created", ""].map(h => (
                        <th key={h} className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {all.length === 0 ? (
                      <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-500">No incidents. All systems operational.</td></tr>
                    ) : all.map((inc, i) => (
                      <tr key={inc.id ?? i} onClick={() => setSelected(inc.id === selected ? null : inc.id)} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition ${selected === inc.id ? "bg-emerald-50 dark:bg-emerald-900/10" : ""}`}>
                        <td className="p-4"><StatusBadge label={inc.severity ?? "medium"} variant={SEV_VARIANT[inc.severity] ?? "neutral"} /></td>
                        <td className="p-4 font-medium text-slate-900 dark:text-white max-w-xs truncate">{inc.title}</td>
                        <td className="p-4 text-slate-500">{inc.owner ?? "—"}</td>
                        <td className="p-4"><StatusBadge label={inc.status ?? "open"} variant={STATUS_VARIANT[inc.status] ?? "neutral"} dot /></td>
                        <td className="p-4 text-slate-400 text-xs"><div className="flex items-center gap-1"><Clock size={11} />{inc.createdAt ?? inc.created_at ?? "—"}</div></td>
                        <td className="p-4"><ChevronRight size={14} className="text-slate-300" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {selectedInc && (
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white truncate pr-2">{selectedInc.title}</h3>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 shrink-0"><X size={16} /></button>
              </div>
              <CardBody className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {[["Severity", selectedInc.severity ?? "medium", true], ["Status", selectedInc.status ?? "open", true], ["Owner", selectedInc.owner ?? "Unassigned", false], ["Created", selectedInc.createdAt ?? selectedInc.created_at ?? "—", false]].map(([label, value, isBadge]) => (
                    <div key={label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5">
                      <div className="text-[10px] text-slate-400 mb-1">{label}</div>
                      {isBadge && label === "Severity" ? <StatusBadge label={value} variant={SEV_VARIANT[value] ?? "neutral"} /> : isBadge ? <StatusBadge label={value} variant={STATUS_VARIANT[value] ?? "neutral"} dot /> : <div className="text-sm font-medium text-slate-900 dark:text-white">{value}</div>}
                    </div>
                  ))}
                </div>
                {selectedInc.description && (
                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-1">Description</div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{selectedInc.description}</p>
                  </div>
                )}
                {selectedInc.status !== "resolved" && selectedInc.status !== "closed" && (
                  <div className="flex gap-2">
                    <button onClick={() => escalate(selectedInc.id)} className="flex-1 text-sm py-2 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition">Escalate</button>
                    <button onClick={() => resolve(selectedInc.id)} className="flex-1 text-sm py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition">Resolve</button>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Timeline" icon={TrendingUp} />
              <div className="px-5 py-3 max-h-64 overflow-y-auto">
                {tlLoading ? <SkeletonTable rows={4} /> : tl.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No timeline events yet.</p>
                ) : (
                  <div className="space-y-3">
                    {tl.map((event, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <div>
                          <div className="text-sm text-slate-700 dark:text-slate-300">{event.message ?? event.description}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{event.author ?? event.user}{event.timestamp ? ` · ${event.timestamp}` : ""}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
