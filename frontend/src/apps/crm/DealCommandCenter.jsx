import { useState } from "react";
import { useApi, useMutation } from "../../hooks/useApi";
import { useToast } from "../../components/ui/Toast";
import { crm } from "../../services/api";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  Search, DollarSign, TrendingUp, Users, Clock,
  CheckCircle, Plus, X, ChevronRight, AlertCircle
} from "lucide-react";

const stageVariant = {
  won: "success", negotiation: "warning", proposal: "info",
  qualified: "neutral", lead: "neutral", lost: "danger",
};

function NewTaskModal({ dealId, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ title: "", dueDate: "", priority: "medium" });
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => crm.deals.createTask(dealId, d));

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    if (!form.title.trim()) { setErr("Task title is required."); return; }
    try {
      await mutate(form);
      toast({ message: "Task added.", type: "success" });
      onCreated();
      onClose();
    } catch (ex) { setErr(ex?.message ?? "Failed to create task."); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Add Task</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          {err && <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-3 py-2">{err}</p>}
          <input
            type="text" placeholder="Task title" value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date" value={form.dueDate}
              onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
              className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <select
              value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
              className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {["low","medium","high"].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white transition">{loading ? "Adding…" : "Add Task"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DealDetail({ deal, onClose }) {
  const [showAddTask, setShowAddTask] = useState(false);
  const { data: timeline, loading: tlLoading } = useApi(() => crm.deals.timeline(deal.id), [deal.id], {});
  const { data: tasks, loading: tasksLoading, refetch: refetchTasks } = useApi(() => crm.deals.tasks(deal.id), [deal.id], {});
  const { data: audit } = useApi(() => crm.deals.auditTrail(deal.id), [deal.id], {});
  const { mutate: updateTask } = useMutation(({ dealId, taskId }) => crm.deals.updateTask(dealId, taskId, { status: "done" }));
  const toast = useToast();

  async function handleCompleteTask(taskId) {
    try {
      await updateTask({ dealId: deal.id, taskId });
      toast({ message: "Task marked done.", type: "success" });
      refetchTasks();
    } catch { toast({ message: "Failed to update task.", type: "error" }); }
  }

  const allTasks = tasks ?? [];
  const allTimeline = timeline ?? [];
  const allAudit = audit ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white truncate">{deal.name ?? deal.title}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{deal.company ?? deal.account ?? "—"}</p>
        </div>
        <button onClick={onClose} className="ml-3 shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"><X size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Value", value: deal.value ?? deal.amount ?? "—" },
            { label: "Stage", value: <StatusBadge label={deal.stage ?? "—"} variant={stageVariant[deal.stage] ?? "neutral"} dot /> },
            { label: "Close Date", value: deal.closeDate ?? deal.expectedClose ?? "—" },
            { label: "Owner", value: deal.owner ?? deal.rep ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">{label}</p>
              <div className="text-sm font-medium text-slate-900 dark:text-white">{value}</div>
            </div>
          ))}
        </div>

        {(deal.stakeholders ?? []).length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Stakeholders</p>
            <div className="space-y-2">
              {deal.stakeholders.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-900 dark:text-white font-medium">{s.name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{s.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tasks</p>
            <button onClick={() => setShowAddTask(true)} className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline">
              <Plus size={11} /> Add
            </button>
          </div>
          {tasksLoading ? (
            <div className="space-y-1.5 animate-pulse">{[1,2].map(i => <div key={i} className="h-8 bg-slate-100 dark:bg-slate-700 rounded" />)}</div>
          ) : allTasks.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">No tasks yet.</p>
          ) : (
            <div className="space-y-1.5">
              {allTasks.map(t => (
                <div key={t.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <button
                    onClick={() => handleCompleteTask(t.id)}
                    className={`shrink-0 h-4 w-4 rounded border-2 flex items-center justify-center transition ${
                      t.status === "done" ? "border-orange-500 bg-orange-500" : "border-slate-300 dark:border-slate-600 hover:border-orange-400"
                    }`}
                  >
                    {t.status === "done" && <CheckCircle size={10} className="text-white" />}
                  </button>
                  <span className={`text-xs flex-1 ${t.status === "done" ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"}`}>{t.title}</span>
                  {t.dueDate && <span className="text-[10px] text-slate-400">{t.dueDate}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Activity Timeline</p>
          {tlLoading ? (
            <div className="space-y-2 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded" />)}</div>
          ) : allTimeline.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">No timeline events.</p>
          ) : (
            <div className="space-y-2">
              {allTimeline.slice(0, 8).map((e, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <div className="shrink-0 mt-1.5 h-2 w-2 rounded-full bg-orange-400" />
                  <div>
                    <p className="text-slate-800 dark:text-slate-200 text-xs">{e.description ?? e.event}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{e.time ?? e.date ?? e.createdAt}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {allAudit.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Audit Trail</p>
            <div className="space-y-1">
              {allAudit.slice(0, 5).map((a, i) => (
                <div key={i} className="text-xs text-slate-500 dark:text-slate-400 flex justify-between">
                  <span>{a.action ?? a.event}</span>
                  <span className="text-slate-400 dark:text-slate-500">{a.by ?? a.user}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAddTask && (
        <NewTaskModal dealId={deal.id} onClose={() => setShowAddTask(false)} onCreated={refetchTasks} />
      )}
    </div>
  );
}

export default function DealCommandCenter() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [selectedDeal, setSelectedDeal] = useState(null);

  const { data: deals, loading, error } = useApi(
    () => crm.deals.list(), [], { pollingInterval: 30000 }
  );

  const allDeals = deals ?? [];

  const wonCount    = allDeals.filter(d => d.stage === "won").length;
  const activeCount = allDeals.filter(d => !["won","lost"].includes(d.stage)).length;
  const totalValue  = allDeals
    .filter(d => d.stage !== "lost")
    .reduce((sum, d) => sum + (parseFloat(String(d.value ?? d.amount ?? "0").replace(/[^0-9.]/g,"")) || 0), 0);

  const stages = ["all", ...Array.from(new Set(allDeals.map(d => d.stage).filter(Boolean)))];

  const filtered = allDeals.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = !search || [d.name, d.title, d.company, d.account, d.owner, d.rep]
      .some(v => v?.toLowerCase().includes(q));
    const matchStage = stageFilter === "all" || d.stage === stageFilter;
    return matchSearch && matchStage;
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 pt-6 shrink-0">
        <PageHeader
          title="Deal Command Center"
          subtitle="Browse, search, and manage all deals across your pipeline."
        />
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Stat label="Active Deals"   value={loading ? "…" : activeCount} icon={TrendingUp}  color="indigo" />
          <Stat label="Deals Won"      value={loading ? "…" : wonCount}    icon={CheckCircle} color="emerald" />
          <Stat label="Pipeline Value" value={loading ? "…" : `$${(totalValue/1000).toFixed(0)}k`} icon={DollarSign} color="amber" />
        </div>
      </div>

      {error && (
        <div className="mx-6 mb-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden gap-4 px-6 pb-6">
        <div className={`flex flex-col ${selectedDeal ? "w-80 shrink-0" : "flex-1"} transition-all duration-200`}>
          <Card className="flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 shrink-0 space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text" placeholder="Search deals…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full text-sm pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {stages.map(s => (
                  <button
                    key={s}
                    onClick={() => setStageFilter(s)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                      stageFilter === s
                        ? "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading && allDeals.length === 0 ? (
                <div className="space-y-2 p-4 animate-pulse">
                  {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded-lg" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 dark:text-slate-500 text-sm">
                  <DollarSign size={28} className="mb-2 opacity-30" />
                  {allDeals.length === 0 ? "No deals found." : "No deals match your filters."}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map(deal => (
                    <button
                      key={deal.id}
                      onClick={() => setSelectedDeal(selectedDeal?.id === deal.id ? null : deal)}
                      className={`w-full text-left px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group ${
                        selectedDeal?.id === deal.id ? "bg-orange-50 dark:bg-orange-500/5 border-l-2 border-orange-500" : "border-l-2 border-transparent"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{deal.name ?? deal.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                            <Users size={10} /> {deal.company ?? deal.account ?? "—"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right space-y-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{deal.value ?? deal.amount ?? "—"}</p>
                          <StatusBadge label={deal.stage ?? "—"} variant={stageVariant[deal.stage] ?? "neutral"} dot />
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock size={9} /> {deal.closeDate ?? deal.expectedClose ?? "—"}
                        </span>
                        <ChevronRight size={13} className="text-slate-300 dark:text-slate-600 group-hover:text-orange-500 transition" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {selectedDeal && (
          <div className="flex-1 overflow-hidden">
            <Card className="h-full overflow-hidden flex flex-col">
              <DealDetail deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
