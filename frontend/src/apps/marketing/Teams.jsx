import { useState } from "react";
import { Users, Plus, CheckSquare, BarChart3, RefreshCw, AlertCircle, X, Clock } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { marketing } from "../../services/api";

const ROLE_VARIANT = { admin: "danger", manager: "indigo", "content-writer": "info", designer: "violet", analyst: "warning", "email-marketer": "sky" };
const PRIORITY_VARIANT = { high: "danger", medium: "warning", low: "success" };
const EMPTY_TASK = { title: "", assignee: "", dueDate: "", priority: "medium", type: "content" };

function InviteModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ email: "", role: "content-writer" });
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => marketing.teams.invite(d), {
    onSuccess: () => { toast({ message: "Invite sent", type: "success" }); onCreated(); onClose(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">Invite Team Member</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); setErr(null); if (!form.email.trim()) { setErr("Email required"); return; } mutate(form); }} className="px-6 py-5 space-y-4">
          {err && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email *</label>
            <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="colleague@company.com" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
            <select value={form.role} onChange={e => set("role", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              {["admin", "manager", "content-writer", "designer", "analyst", "email-marketer"].map(r => <option key={r} value={r}>{r.replace(/-/g, " ")}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white transition">{loading ? "Sending…" : "Send Invite"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NewTaskModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_TASK);
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => marketing.teams.createTask(d), {
    onSuccess: () => { toast({ message: "Task created", type: "success" }); onCreated(); onClose(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">New Task</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); setErr(null); if (!form.title.trim()) { setErr("Title required"); return; } mutate(form); }} className="px-6 py-5 space-y-4">
          {err && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Title *</label>
            <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Task title" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
              <select value={form.priority} onChange={e => set("priority", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                {["high", "medium", "low"].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Assignee</label>
            <input value={form.assignee} onChange={e => set("assignee", e.target.value)} placeholder="Team member name" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white transition">{loading ? "Creating…" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Teams() {
  const [showInvite, setShowInvite] = useState(false);
  const [showTask, setShowTask] = useState(false);
  const [tab, setTab] = useState("members");
  const { data: members, loading: memLoading, error, refetch } = useApi(() => marketing.teams.list(), [], { pollingInterval: 120000 });
  const { data: tasks, loading: taskLoading, refetch: refetchTasks } = useApi(() => marketing.teams.tasks({ limit: 100 }), [], { pollingInterval: 60000 });
  const { data: metrics } = useApi(() => marketing.teams.metrics(), [], { pollingInterval: 120000 });
  const allMembers = members ?? [];
  const allTasks = tasks ?? [];
  const m = metrics ?? {};
  return (
    <div className="space-y-6">
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onCreated={refetch} />}
      {showTask && <NewTaskModal onClose={() => setShowTask(false)} onCreated={refetchTasks} />}
      <PageHeader title="Marketing Team" subtitle="Manage your marketing team, tasks, and performance"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 border border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-400 text-sm px-3 py-2 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition"><Plus size={14} /> Invite</button>
            <button onClick={() => setShowTask(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg transition"><CheckSquare size={14} /> New Task</button>
          </div>
        }
      />
      {memLoading && allMembers.length === 0 ? (
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Team Members" value={m.totalMembers ?? allMembers.length} icon={Users} color="violet" />
          <Stat label="Open Tasks" value={m.openTasks ?? allTasks.filter(t => !t.completed).length} icon={CheckSquare} color="sky" />
          <Stat label="Campaigns Active" value={m.activeCampaigns ?? "—"} icon={BarChart3} color="emerald" />
        </div>
      )}
      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}
      <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden w-fit">
        {["members", "tasks"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm font-medium capitalize transition ${tab === t ? "bg-violet-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{t}</button>
        ))}
      </div>
      {tab === "members" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {memLoading && allMembers.length === 0 ? [...Array(6)].map((_, i) => <SkeletonCard key={i} />) : allMembers.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-slate-500">No team members yet. Invite your first member!</div>
          ) : allMembers.map((m, i) => (
            <div key={m.id ?? i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-violet-300 dark:hover:border-violet-700 transition">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 font-bold">{(m.name ?? m.email ?? "?")[0].toUpperCase()}</div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">{m.name ?? m.email}</div>
                  <div className="text-xs text-slate-400">{m.email ?? ""}</div>
                </div>
              </div>
              <StatusBadge label={m.role ?? "member"} variant={ROLE_VARIANT[m.role] ?? "neutral"} />
              {(m.activeCampaigns != null || m.openTasks != null) && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {m.activeCampaigns != null && <div className="text-center bg-slate-50 dark:bg-slate-800 rounded-lg py-2"><div className="text-xs text-slate-400">Campaigns</div><div className="font-bold text-sm text-slate-900 dark:text-white">{m.activeCampaigns}</div></div>}
                  {m.openTasks != null && <div className="text-center bg-slate-50 dark:bg-slate-800 rounded-lg py-2"><div className="text-xs text-slate-400">Tasks</div><div className="font-bold text-sm text-slate-900 dark:text-white">{m.openTasks}</div></div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {tab === "tasks" && (
        <Card>
          {taskLoading && allTasks.length === 0 ? <div className="p-5"><SkeletonTable rows={8} /></div> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {allTasks.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No tasks found.</p> : allTasks.map((t, i) => (
                <div key={t.id ?? i} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${t.priority === "high" ? "bg-red-500" : t.priority === "medium" ? "bg-amber-500" : "bg-emerald-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${t.completed ? "line-through text-slate-400" : "text-slate-900 dark:text-white"}`}>{t.title ?? t.name}</div>
                    <div className="text-xs text-slate-400">{t.assignee ?? "Unassigned"}{t.type ? ` • ${t.type}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.priority && <StatusBadge label={t.priority} variant={PRIORITY_VARIANT[t.priority] ?? "neutral"} />}
                    {t.dueDate && <div className="flex items-center gap-1 text-xs text-slate-400"><Clock size={11} />{t.dueDate}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
