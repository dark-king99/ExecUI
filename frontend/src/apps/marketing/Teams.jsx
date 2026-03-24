import { useApi } from "../../hooks/useApi";
import { marketing } from "../../services/api";
import {
  Users,
  Briefcase,
  CheckCircle,
  Activity,
  BarChart3,
  Plus,
  AlertCircle,
} from "lucide-react";

export default function Teams() {
  const { data: members, loading: membersLoading, error: membersError } = useApi(
    () => marketing.teams.list(), [], { pollingInterval: 60000 }
  );
  const { data: tasks, loading: tasksLoading, error: tasksError } = useApi(
    () => marketing.teams.tasks(), [], { pollingInterval: 30000 }
  );
  const { data: metrics, loading: metricsLoading } = useApi(
    () => marketing.teams.metrics(), [], { pollingInterval: 60000 }
  );

  const allMembers = members ?? [];
  const allTasks = tasks ?? [];

  const backlog    = allTasks.filter(t => t.status === "backlog" || t.column === "Backlog");
  const inProgress = allTasks.filter(t => t.status === "in_progress" || t.column === "In Progress");
  const completed  = allTasks.filter(t => t.status === "completed" || t.column === "Completed");

  return (
    <div className="min-h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-8 space-y-8">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Users size={20} /> Marketing Team Command Center
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Workforce management, task tracking, and performance intelligence.
          </p>
        </div>

        <div className="flex gap-4">
          <button className="px-4 py-2 text-sm bg-slate-200 dark:bg-slate-800 rounded-md">
            Invite Member
          </button>
          <button className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2">
            <Plus size={14} /> Create Task
          </button>
        </div>
      </div>

      {(membersError || tasksError) && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {membersError ?? tasksError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard icon={Users}       label="Active Agents"      value={metricsLoading ? "…" : (metrics?.activeAgents ?? allMembers.length)} />
        <StatCard icon={Briefcase}   label="Open Tasks"         value={metricsLoading ? "…" : (metrics?.openTasks ?? (backlog.length + inProgress.length))} />
        <StatCard icon={CheckCircle} label="SLA Compliance"     value={metricsLoading ? "…" : (metrics?.slaCompliance ?? "—")} />
        <StatCard icon={Activity}    label="Campaign Velocity"  value={metricsLoading ? "…" : (metrics?.campaignVelocity ?? "—")} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        <div className="xl:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg mb-4">Team Members</h2>

          {membersLoading && allMembers.length === 0 && (
            <div className="space-y-3 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 dark:bg-slate-700 rounded-md" />)}
            </div>
          )}
          {!membersLoading && allMembers.length === 0 && !membersError && (
            <p className="text-sm text-slate-500">No team members found.</p>
          )}

          <div className="space-y-4">
            {allMembers.map(m => (
              <TeamMember
                key={m.id ?? m.name}
                name={m.name}
                role={m.role}
                workload={m.workload ?? 0}
                status={m.status ?? "Available"}
              />
            ))}
          </div>
        </div>

        <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg mb-6">Task Board</h2>

          {tasksLoading && allTasks.length === 0 && (
            <div className="grid grid-cols-3 gap-4 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 dark:bg-slate-700 rounded-md" />)}
            </div>
          )}

          {!tasksLoading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <TaskColumn title="Backlog">
                {backlog.map(t => <TaskCard key={t.id ?? t.title} title={t.title} priority={t.priority} />)}
                {backlog.length === 0 && <p className="text-xs text-slate-400 text-center py-2">Empty</p>}
              </TaskColumn>

              <TaskColumn title="In Progress">
                {inProgress.map(t => <TaskCard key={t.id ?? t.title} title={t.title} priority={t.priority} />)}
                {inProgress.length === 0 && <p className="text-xs text-slate-400 text-center py-2">Empty</p>}
              </TaskColumn>

              <TaskColumn title="Completed">
                {completed.map(t => <TaskCard key={t.id ?? t.title} title={t.title} priority={t.priority} />)}
                {completed.length === 0 && <p className="text-xs text-slate-400 text-center py-2">Empty</p>}
              </TaskColumn>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <BarChart3 size={18} /> Performance Overview
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <PerformanceMetric label="Top Performer"           value={metricsLoading ? "…" : (metrics?.topPerformer ?? "—")} />
          <PerformanceMetric label="Campaign Contribution"   value={metricsLoading ? "…" : (metrics?.campaignContribution ?? "—")} />
          <PerformanceMetric label="Avg Task Completion"     value={metricsLoading ? "…" : (metrics?.avgTaskCompletion ?? "—")} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex justify-between items-center">
        <Icon size={18} />
        <span className="text-xs text-slate-500 dark:text-slate-400">Live</span>
      </div>
      <div className="mt-4 text-xl font-semibold">{value}</div>
      <div className="text-sm text-slate-600 dark:text-slate-400">{label}</div>
    </div>
  );
}

function TeamMember({ name, role, workload, status }) {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-md p-4">
      <div className="font-medium">{name}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{role}</div>

      <div className="mt-2 text-xs">
        Workload: {workload}%
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded mt-1">
          <div className="h-2 bg-indigo-600 rounded" style={{ width: `${workload}%` }} />
        </div>
      </div>

      <div className={`mt-2 text-xs ${status === "Busy" ? "text-red-500" : "text-green-500"}`}>
        {status}
      </div>
    </div>
  );
}

function TaskColumn({ title, children }) {
  return (
    <div>
      <h3 className="font-medium mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function TaskCard({ title, priority }) {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-md p-4 text-sm bg-slate-100 dark:bg-slate-800">
      <div className="font-medium">{title}</div>
      <div className={`mt-1 text-xs ${
        priority === "High" || priority === "high"
          ? "text-red-500"
          : priority === "Medium" || priority === "medium"
          ? "text-yellow-500"
          : "text-green-500"
      }`}>
        {priority} Priority
      </div>
    </div>
  );
}

function PerformanceMetric({ label, value }) {
  return (
    <div>
      <div className="text-slate-500 dark:text-slate-400 text-xs">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
