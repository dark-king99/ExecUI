import { useState, useMemo } from "react";
import { Briefcase, DollarSign, Clock, TrendingUp, Plus, Search, RefreshCw, AlertCircle, CheckSquare, Square, X, ChevronRight } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { crm } from "../../services/api";

const STAGES = ["Discovery", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];
const STAGE_VARIANT = { Discovery: "neutral", Qualified: "info", Proposal: "warning", Negotiation: "indigo", "Closed Won": "success", "Closed Lost": "danger" };
const EMPTY_DEAL = { name: "", account: "", value: "", stage: "Discovery", closeDate: "", owner: "" };

function NewDealModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_DEAL);
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => crm.deals.create(d), {
    onSuccess: () => { toast({ message: "Deal created", type: "success" }); onCreated(); onClose(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">New Deal</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); setErr(null); if (!form.name.trim()) { setErr("Name required"); return; } mutate(form); }} className="px-6 py-5 space-y-4">
          {err && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Deal Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Deal name" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Account</label>
              <input value={form.account} onChange={e => set("account", e.target.value)} placeholder="Company" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Value ($)</label>
              <input type="number" min="0" value={form.value} onChange={e => set("value", e.target.value)} placeholder="0" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Stage</label>
              <select value={form.stage} onChange={e => set("stage", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                {STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Close Date</label>
              <input type="date" value={form.closeDate} onChange={e => set("closeDate", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Owner</label>
            <input value={form.owner} onChange={e => set("owner", e.target.value)} placeholder="Rep name" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white transition">{loading ? "Saving…" : "Create Deal"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DealDetail({ deal, onRefresh }) {
  const toast = useToast();
  const [newTask, setNewTask] = useState("");
  const { data: tasks, loading: tasksLoading, refetch: refetchTasks } = useApi(() => crm.deals.tasks(deal.id), [deal.id]);
  const { data: timeline, loading: tlLoading } = useApi(() => crm.deals.timeline(deal.id), [deal.id]);
  const { data: audit } = useApi(() => crm.deals.auditTrail(deal.id), [deal.id]);
  const { mutate: createTask, loading: ctLoading } = useMutation((d) => crm.deals.createTask(deal.id, d), {
    onSuccess: () => { toast({ message: "Task added", type: "success" }); refetchTasks(); setNewTask(""); },
    onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }),
  });
  const { mutate: updateTask } = useMutation((p) => crm.deals.updateTask(deal.id, p.taskId, p.data), {
    onSuccess: () => refetchTasks(),
  });
  const allTasks = tasks ?? [];
  const events = timeline ?? [];
  const auditLog = audit ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{deal.name}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{deal.account}{deal.owner ? ` • ${deal.owner}` : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge label={deal.stage} variant={STAGE_VARIANT[deal.stage] ?? "neutral"} />
          <span className="font-bold text-sm text-slate-900 dark:text-white">{deal.value}</span>
        </div>
      </div>

      {/* Tasks */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Deal Tasks</h3>
        {tasksLoading ? <div className="text-xs text-slate-400 py-2">Loading…</div> : (
          <div className="space-y-1.5 mb-3">
            {allTasks.length === 0 ? <p className="text-xs text-slate-400">No tasks yet.</p> : allTasks.map((t, i) => (
              <div key={t.id ?? i} className="flex items-center gap-2 text-sm">
                <button onClick={() => updateTask({ taskId: t.id, data: { completed: !t.completed } })} className="shrink-0 text-slate-400 hover:text-orange-600 transition">
                  {t.completed ? <CheckSquare size={16} className="text-emerald-500" /> : <Square size={16} />}
                </button>
                <span className={`flex-1 ${t.completed ? "line-through text-slate-400" : "text-slate-900 dark:text-white"}`}>{t.title ?? t.name}</span>
                {t.dueDate && <span className="text-xs text-slate-400 shrink-0">{t.dueDate}</span>}
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === "Enter" && newTask.trim() && createTask({ title: newTask.trim() })} placeholder="Add task (Enter to save)…" className="flex-1 text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          <button disabled={!newTask.trim() || ctLoading} onClick={() => createTask({ title: newTask.trim() })} className="text-xs px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white rounded-lg transition">{ctLoading ? "…" : <Plus size={14} />}</button>
        </div>
      </div>

      {/* Timeline */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Timeline</h3>
        {tlLoading ? <div className="text-xs text-slate-400">Loading…</div> : events.length === 0 ? (
          <p className="text-xs text-slate-400">No timeline events.</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {events.map((e, i) => (
              <div key={e.id ?? i} className="flex gap-3 text-xs">
                <div className="mt-1 h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                <div><span className="text-slate-900 dark:text-white">{e.text ?? e.description ?? e.action}</span><span className="text-slate-400 ml-2">{e.date ?? e.at ?? ""}</span></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit Trail */}
      {auditLog.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Audit Trail</h3>
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {auditLog.map((a, i) => (
              <div key={a.id ?? i} className="flex items-center gap-2 text-xs text-slate-500">
                <ChevronRight size={12} className="shrink-0" />
                <span>{a.action ?? a.text}</span>
                <span className="ml-auto shrink-0">{a.by ?? a.user}</span>
                <span className="shrink-0">{a.at ?? a.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DealCommandCenter() {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const { data: deals, loading, error, refetch } = useApi(() => crm.deals.list({ limit: 200 }), [], { pollingInterval: 60000 });
  const all = deals ?? [];
  const filtered = useMemo(() => all.filter(d => {
    const matchStage = stageFilter === "all" || d.stage === stageFilter;
    const matchSearch = !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.account?.toLowerCase().includes(search.toLowerCase());
    return matchStage && matchSearch;
  }), [all, search, stageFilter]);
  const stats = useMemo(() => {
    const open = all.filter(d => d.stage !== "Closed Won" && d.stage !== "Closed Lost");
    const won = all.filter(d => d.stage === "Closed Won");
    const totalValue = open.reduce((s, d) => s + (d.rawValue ?? 0), 0);
    const avgDays = open.length ? Math.round(open.reduce((s, d) => s + (d.daysOpen ?? 0), 0) / open.length) : 0;
    return { open: open.length, totalValue, avgDays, won: won.length };
  }, [all]);
  return (
    <div className="space-y-6">
      {showModal && <NewDealModal onClose={() => setShowModal(false)} onCreated={refetch} />}
      <PageHeader title="Deal Command Center" subtitle="Execute and manage deals through every stage"
        actions={<button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 py-2 rounded-lg transition"><Plus size={15} /> New Deal</button>}
      />
      {loading && all.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Open Deals" value={stats.open} icon={Briefcase} color="orange" />
          <Stat label="Pipeline Value" value={stats.totalValue ? `$${(stats.totalValue / 1000).toFixed(0)}k` : "—"} icon={DollarSign} color="emerald" />
          <Stat label="Avg Days Open" value={stats.avgDays || "—"} icon={Clock} color="sky" />
          <Stat label="Won This Quarter" value={stats.won} icon={TrendingUp} color="amber" />
        </div>
      )}
      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}
      <div className="flex gap-4 items-start">
        <div className="w-80 shrink-0 space-y-3">
          <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900">
            <Search size={14} className="text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deals…" className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["all", ...STAGES].map(s => (
              <button key={s} onClick={() => setStageFilter(s)} className={`text-xs px-2.5 py-1 rounded-full border transition ${stageFilter === s ? "bg-orange-600 text-white border-orange-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-orange-400"}`}>{s === "all" ? "All" : s}</button>
            ))}
          </div>
          <Card>
            {loading && all.length === 0 ? <div className="p-4"><SkeletonTable rows={8} /></div> : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[calc(100vh-22rem)] overflow-y-auto">
                {filtered.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">No deals found.</p> : filtered.map(d => (
                  <button key={d.id ?? d.name} onClick={() => setSelected(d)} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${selected?.id === d.id ? "bg-orange-50 dark:bg-orange-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{d.name}</div>
                      <div className="text-xs text-slate-400 truncate">{d.account}{d.owner ? ` • ${d.owner}` : ""}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">{d.value}</div>
                      <div className="mt-0.5"><StatusBadge label={d.stage} variant={STAGE_VARIANT[d.stage] ?? "neutral"} /></div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
        <div className="flex-1 min-w-0">
          {selected ? (
            <Card><CardBody><DealDetail deal={selected} onRefresh={refetch} /></CardBody></Card>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <Briefcase size={36} className="text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-slate-500">Select a deal to view its command center</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
