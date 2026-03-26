import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useApi, useMutation } from "../../hooks/useApi";
import { crm } from "../../services/api";
import { useToast } from "../../components/ui/Toast";
import {
  CalendarSync, CheckCircle, Clock, AlertTriangle, Plus, Loader2, RefreshCw,
} from "lucide-react";

const PRIORITY_VARIANT = { high: "danger", medium: "warning", low: "neutral" };
const STATUS_VARIANT   = { pending: "warning", scheduled: "info", done: "success" };
const TYPE_COLORS      = {
  Call:    "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  Email:   "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400",
  Meeting: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400",
  Task:    "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
};

export default function TaskCadence() {
  const toast = useToast();

  const {
    data: tasks,
    loading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
  } = useApi(() => crm.tasks.list({ limit: 50 }), [], { pollingInterval: 30000 });

  const {
    data: sequences,
    loading: seqLoading,
    error: seqError,
    refetch: refetchSeq,
  } = useApi(() => crm.sequences.list(), [], { pollingInterval: 120000 });

  const { mutate: completeTask } = useMutation(
    (id) => crm.tasks.complete(id),
    {
      onSuccess: () => { refetchTasks(); toast({ message: "Task marked complete.", type: "success" }); },
      onError:   (err) => toast({ message: err?.message ?? "Failed.", type: "error" }),
    }
  );

  const { mutate: createSequence, loading: creatingSeq } = useMutation(
    (data) => crm.sequences.create(data),
    {
      onSuccess: () => { refetchSeq(); toast({ message: "Sequence created.", type: "success" }); },
      onError:   (err) => toast({ message: err?.message ?? "Failed.", type: "error" }),
    }
  );

  const overdue   = tasks?.filter((t) => t.due?.includes("Today") && t.status === "pending").length ?? 0;
  const thisWeek  = tasks?.filter((t) => t.status !== "done").length ?? 0;
  const completed = tasks?.filter((t) => t.status === "done").length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Task & Cadence Center"
        subtitle="Personal and team task queue, SLA due dates, reminders and sequence automation"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => { refetchTasks(); refetchSeq(); }}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition"
            >
              <RefreshCw size={13} /> Refresh
            </button>
            <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition">
              <Plus size={15} /> New Task
            </button>
          </div>
        }
      />

      {/* Stats */}
      {tasksLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Due Today"  value={overdue}   icon={AlertTriangle} color="amber" />
          <Stat label="This Week"  value={thisWeek}  icon={Clock}         color="sky" />
          <Stat label="Completed"  value={completed} icon={CheckCircle}   color="emerald" />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Task queue */}
        <Card>
          <CardHeader title="Task Queue" icon={CalendarSync} />
          <CardBody className="space-y-2">
            {tasksError && (
              <div className="text-sm text-red-600 dark:text-red-400 mb-2">{tasksError}</div>
            )}
            {tasksLoading ? (
              <SkeletonTable rows={5} />
            ) : tasks?.length > 0 ? (
              tasks.map((t, i) => (
                <div
                  key={t.id ?? i}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition"
                >
                  <input
                    type="checkbox"
                    checked={t.status === "done"}
                    onChange={() => completeTask(t.id)}
                    className="rounded border-slate-300 dark:border-slate-600 text-indigo-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{t.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[t.type] ?? TYPE_COLORS.Task}`}>
                        {t.type ?? "Task"}
                      </span>
                      <span className="text-xs text-slate-400">{t.due ?? t.dueDate ?? "—"}</span>
                      <span className="text-xs text-slate-400">{t.owner ?? "—"}</span>
                    </div>
                  </div>
                  <StatusBadge label={t.priority ?? "low"} variant={PRIORITY_VARIANT[t.priority] ?? "neutral"} />
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-6">No tasks found.</p>
            )}
          </CardBody>
        </Card>

        {/* Active sequences */}
        <Card>
          <CardHeader title="Active Sequences" icon={CalendarSync} />
          <CardBody className="space-y-4">
            {seqError && (
              <div className="text-sm text-red-600 dark:text-red-400 mb-2">{seqError}</div>
            )}
            {seqLoading ? (
              <SkeletonTable rows={3} />
            ) : sequences?.length > 0 ? (
              sequences.map((s, i) => (
                <div key={s.id ?? i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.name}</p>
                    <StatusBadge label={s.status ?? "Active"} variant="success" dot />
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{s.step ?? s.description ?? "—"}</p>
                  <div className="flex gap-4 text-xs">
                    <span className="text-slate-500">Enrolled: <strong className="text-slate-800 dark:text-slate-200">{s.enrolled ?? 0}</strong></span>
                    <span className="text-slate-500">Active: <strong className="text-indigo-600 dark:text-indigo-400">{s.active ?? 0}</strong></span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No sequences running.</p>
            )}
            <button
              onClick={() => createSequence({ name: "New Sequence", status: "active" })}
              disabled={creatingSeq}
              className="w-full py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {creatingSeq ? <Loader2 size={13} className="animate-spin" /> : "+ Create New Sequence"}
            </button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
