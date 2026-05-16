import { useState } from "react";
import { Zap, Plus, RefreshCw, AlertCircle, Play, Pause, X, TrendingUp, Mail, Users, BarChart3 } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { marketing } from "../../services/api";

const STATUS_VARIANT = { active: "success", paused: "warning", draft: "neutral", archived: "neutral" };

function NewFlowModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", trigger: "form_submit", description: "" });
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => marketing.flows.create(d), {
    onSuccess: () => { toast({ message: "Flow created", type: "success" }); onCreated(); onClose(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">New Automation Flow</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); setErr(null); if (!form.name.trim()) { setErr("Name required"); return; } mutate(form); }} className="px-6 py-5 space-y-4">
          {err && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Flow Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Welcome Series" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Trigger</label>
            <select value={form.trigger} onChange={e => set("trigger", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              {["form_submit", "signup", "purchase", "tag_applied", "segment_enter", "date_based", "manual"].map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea rows={2} value={form.description} onChange={e => set("description", e.target.value)} placeholder="What does this flow do?" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white transition">{loading ? "Creating…" : "Create Flow"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FlowDetail({ flow }) {
  const toast = useToast();
  const { data: stats } = useApi(() => marketing.flows.stats(flow.id), [flow.id]);
  const { mutate: updateFlow } = useMutation((d) => marketing.flows.update(flow.id, d), {
    onSuccess: () => toast({ message: "Flow updated", type: "success" }),
    onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }),
  });
  const s = stats ?? {};
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{flow.name}</h2>
          <p className="text-sm text-slate-500 mt-0.5">Trigger: {flow.trigger?.replace(/_/g, " ") ?? "—"}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge label={flow.status ?? "draft"} variant={STATUS_VARIANT[flow.status] ?? "neutral"} />
          <button onClick={() => updateFlow({ status: flow.status === "active" ? "paused" : "active" })} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition text-white ${flow.status === "active" ? "bg-amber-500 hover:bg-amber-600" : "bg-violet-600 hover:bg-violet-700"}`}>
            {flow.status === "active" ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Activate</>}
          </button>
        </div>
      </div>
      {flow.description && <p className="text-sm text-slate-600 dark:text-slate-400">{flow.description}</p>}
      <div className="grid grid-cols-3 gap-3">
        {[["Enrolled", s.enrolled ?? flow.enrolled ?? 0], ["Completed", s.completed ?? flow.completed ?? 0], ["Revenue", s.revenue ?? flow.revenue ?? "—"]].map(([l, v]) => (
          <div key={l} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">{l}</div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">{v}</div>
          </div>
        ))}
      </div>
      {(flow.steps ?? s.steps ?? []).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Flow Steps</h3>
          <div className="space-y-2">
            {(flow.steps ?? s.steps).map((step, i) => (
              <div key={step.id ?? i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="h-6 w-6 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">{step.name ?? step.type}</div>
                  {step.delay && <div className="text-xs text-slate-400">Wait: {step.delay}</div>}
                </div>
                {step.sent != null && <div className="text-xs text-slate-400">{step.sent} sent</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EMMA() {
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: flows, loading, error, refetch } = useApi(() => marketing.flows.list(), [], { pollingInterval: 60000 });
  const all = flows ?? [];
  const filtered = statusFilter === "all" ? all : all.filter(f => f.status === statusFilter);
  const stats = { total: all.length, active: all.filter(f => f.status === "active").length, enrolled: all.reduce((s, f) => s + (f.enrolled ?? 0), 0) };
  return (
    <div className="space-y-6">
      {showModal && <NewFlowModal onClose={() => setShowModal(false)} onCreated={refetch} />}
      <PageHeader title="E.M.M.A" subtitle="Enterprise Marketing & Multi-channel Automation — your automation engine"
        actions={<button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg transition"><Plus size={15} /> New Flow</button>}
      />
      {loading && all.length === 0 ? (
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Total Flows" value={stats.total} icon={Zap} color="violet" />
          <Stat label="Active" value={stats.active} icon={TrendingUp} color="emerald" />
          <Stat label="Total Enrolled" value={stats.enrolled} icon={Users} color="sky" />
        </div>
      )}
      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}
      <div className="flex items-center gap-3">
        {["all", "active", "paused", "draft"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`text-xs px-3 py-1.5 rounded-full border capitalize transition ${statusFilter === s ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-400"}`}>{s}</button>
        ))}
        <button onClick={refetch} className="ml-auto flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /></button>
      </div>
      <div className="flex gap-4 items-start">
        <div className="w-80 shrink-0">
          <Card>
            {loading && all.length === 0 ? <div className="p-4"><SkeletonTable rows={6} /></div> : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[calc(100vh-22rem)] overflow-y-auto">
                {filtered.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">No flows found.</p> : filtered.map((f, i) => (
                  <button key={f.id ?? i} onClick={() => setSelected(f)} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${selected?.id === f.id ? "bg-violet-50 dark:bg-violet-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}>
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${f.status === "active" ? "bg-emerald-500" : f.status === "paused" ? "bg-amber-500" : "bg-slate-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{f.name}</div>
                      <div className="text-xs text-slate-400">{f.trigger?.replace(/_/g, " ") ?? ""}{f.enrolled != null ? ` • ${f.enrolled} enrolled` : ""}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
        <div className="flex-1 min-w-0">
          {selected ? (
            <Card><CardBody><FlowDetail flow={selected} /></CardBody></Card>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <Zap size={36} className="text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-slate-500">Select a flow to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
