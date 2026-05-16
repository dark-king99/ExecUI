import { useState, useMemo } from "react";
import { CheckSquare, Square, Plus, Clock, AlertCircle, RefreshCw, Zap, X } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { crm } from "../../services/api";

const PRIORITY_VARIANT = { high: "danger", medium: "warning", low: "success" };
const EMPTY_TASK = { title: "", dueDate: "", priority: "medium", type: "call", assignee: "" };

function NewTaskModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_TASK);
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => crm.tasks.create(d), {
    onSuccess: () => { toast({ message: "Task created", type: "success" }); onCreated(); onClose(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">New Task</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); setErr(null); if (!form.title.trim()) { setErr("Title required"); return; } mutate(form); }} className="px-6 py-5 space-y-4">
          {err && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Title *</label>
            <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Task title" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
              <select value={form.type} onChange={e => set("type", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                {["call", "email", "meeting", "follow-up", "demo", "proposal"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
              <select value={form.priority} onChange={e => set("priority", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                {["high", "medium", "low"].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Assignee</label>
              <input value={form.assignee} onChange={e => set("assignee", e.target.value)} placeholder="Rep name" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white transition">{loading ? "Saving…" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TaskCadence() {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState("tasks");
  const { data: tasks, loading, error, refetch } = useApi(() => crm.tasks.list({ limit: 200 }), [], { pollingInterval: 30000 });
  const { data: sequences, loading: seqLoading } = useApi(() => crm.sequences.list(), [], { pollingInterval: 120000 });
  const { mutate: completeTask } = useMutation((id) => crm.tasks.complete(id), {
    onSuccess: () => { toast({ message: "Task completed", type: "success" }); refetch(); },
    onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }),
  });
  const all = tasks ?? [];
  const allSeqs = sequences ?? [];

  const FILTERS = ["all", "today", "overdue", "upcoming", "completed"];
  const filtered = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    return all.filter(t => {
      if (filter === "completed") return t.completed;
      if (filter === "today") return !t.completed && t.dueDate === today;
      if (filter === "overdue") return !t.completed && t.dueDate && t.dueDate < today;
      if (filter === "upcoming") return !t.completed && (!t.dueDate || t.dueDate > today);
      return true;
    });
  }, [all, filter]);

  const stats = useMemo(() => ({
    total: all.length,
    due: all.filter(t => !t.completed && t.dueDate === new Date().toISOString().split("T")[0]).length,
    overdue: all.filter(t => !t.completed && t.dueDate && t.dueDate < new Date().toISOString().split("T")[0]).length,
    completed: all.filter(t => t.completed).length,
  }), [all]);

  return (
    <div className="space-y-6">
      {showModal && <NewTaskModal onClose={() => setShowModal(false)} onCreated={refetch} />}
      <PageHeader title="Task Cadence" subtitle="Stay on top of every follow-up and sales activity"
        actions={<button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 py-2 rounded-lg transition"><Plus size={15} /> New Task</button>}
      />

      {loading && all.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total Tasks" value={stats.total} icon={CheckSquare} color="orange" />
          <Stat label="Due Today" value={stats.due} icon={Clock} color="sky" />
          <Stat label="Overdue" value={stats.overdue} icon={AlertCircle} color="amber" />
          <Stat label="Completed" value={stats.completed} icon={CheckSquare} color="emerald" />
        </div>
      )}

      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}

      <div className="flex items-center gap-3">
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          {["tasks", "sequences"].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm font-medium capitalize transition ${tab === t ? "bg-orange-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{t}</button>
          ))}
        </div>
        {tab === "tasks" && (
          <div className="flex gap-1.5">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`text-xs px-2.5 py-1 rounded-full border capitalize transition ${filter === f ? "bg-orange-600 text-white border-orange-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-orange-400"}`}>{f}</button>
            ))}
          </div>
        )}
        <button onClick={refetch} className="ml-auto flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /></button>
      </div>

      {tab === "tasks" && (
        <Card>
          {loading && all.length === 0 ? <div className="p-5"><SkeletonTable rows={8} /></div> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No tasks found.</p> : filtered.map(t => (
                <div key={t.id ?? t.title} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <button onClick={() => !t.completed && completeTask(t.id)} className="shrink-0 text-slate-400 hover:text-orange-600 transition">
                    {t.completed ? <CheckSquare size={18} className="text-emerald-500" /> : <Square size={18} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${t.completed ? "line-through text-slate-400" : "text-slate-900 dark:text-white"}`}>{t.title ?? t.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{t.type ? `${t.type} ` : ""}{t.assignee ? `• ${t.assignee}` : ""}{t.account ? ` • ${t.account}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.priority && <StatusBadge label={t.priority} variant={PRIORITY_VARIANT[t.priority] ?? "neutral"} />}
                    {t.dueDate && <span className="text-xs text-slate-400">{t.dueDate}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "sequences" && (
        <Card>
          <CardHeader title="Cadence Sequences" icon={Zap} />
          <CardBody>
            {seqLoading ? <SkeletonTable rows={5} /> : allSeqs.length === 0 ? (
              <p className="text-sm text-center text-slate-500 py-6">No sequences configured.</p>
            ) : (
              <div className="space-y-3">
                {allSeqs.map((s, i) => (
                  <div key={s.id ?? i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <div>
                      <div className="font-medium text-sm text-slate-900 dark:text-white">{s.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{s.steps ?? 0} steps • {s.enrolled ?? 0} enrolled</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">{s.status ?? "active"}</span>
                      <div className={`h-2 w-2 rounded-full ${s.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
