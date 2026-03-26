import { useMemo, useState } from "react";
import { useApi, useMutation } from "../../hooks/useApi";
import { crm } from "../../services/api";
import { useToast } from "../../components/ui/Toast";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import {
  DollarSign, Target, CalendarClock, Users, Mail, Phone,
  MessageSquare, Share2, Calendar, AlertTriangle, CheckCircle2,
  TrendingUp, FileText, History, Plus, Loader2, RefreshCw,
} from "lucide-react";

const TYPE_META = {
  email:    { icon: Mail,         cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
  call:     { icon: Phone,        cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  chat:     { icon: MessageSquare,cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
  social:   { icon: Share2,       cls: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300" },
  meeting:  { icon: Calendar,     cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  campaign: { icon: FileText,     cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
};

function currency(n) { return `$${Number(n).toLocaleString()}`; }

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3">
      <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline">
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}

export default function DealCommandCenter() {
  const toast = useToast();

  // The deal command center shows the most recent/selected deal.
  // In a real app this would come from routing params (:dealId).
  // Here we load the first deal from the list.
  const {
    data: deals,
    loading: dealLoading,
    error: dealError,
    refetch: refetchDeal,
  } = useApi(() => crm.deals.list({ limit: 1 }));

  const deal = deals?.[0] ?? null;

  const {
    data: timeline,
    loading: tlLoading,
    error: tlError,
  } = useApi(
    () => deal ? crm.deals.timeline(deal.id) : Promise.resolve(null),
    [deal?.id]
  );

  const {
    data: tasksData,
    loading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
  } = useApi(
    () => deal ? crm.deals.tasks(deal.id) : Promise.resolve(null),
    [deal?.id]
  );

  const {
    data: audit,
    loading: auditLoading,
    error: auditError,
  } = useApi(
    () => deal ? crm.deals.auditTrail(deal.id) : Promise.resolve(null),
    [deal?.id]
  );

  const [newTask, setNewTask] = useState("");

  const { mutate: createTask, loading: creatingTask } = useMutation(
    (data) => crm.deals.createTask(deal.id, data),
    {
      onSuccess: () => { setNewTask(""); refetchTasks(); toast({ message: "Task added.", type: "success" }); },
      onError:   (err) => toast({ message: err?.message ?? "Failed to add task.", type: "error" }),
    }
  );

  const { mutate: toggleTask } = useMutation(
    ({ dealId, taskId, done }) => crm.deals.updateTask(dealId, taskId, { done }),
    {
      onSuccess: () => refetchTasks(),
      onError:   (err) => toast({ message: err?.message ?? "Update failed.", type: "error" }),
    }
  );

  const weighted = deal ? Math.round((deal.value ?? 0) * (deal.probability ?? 0)) : 0;

  if (dealLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonTable rows={6} />
      </div>
    );
  }

  if (dealError) return <ErrorBanner message={dealError} onRetry={refetchDeal} />;

  if (!deal) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-10 text-center text-sm text-slate-500">
        No deals found. Create your first deal to get started.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{deal.name}</h1>
          <p className="text-slate-500">Deal ID {deal.id} · Account: {deal.account ?? "—"}</p>
        </div>
        <button
          onClick={refetchDeal}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPI icon={DollarSign}   label="Deal Value"        value={currency(deal.value ?? 0)} />
        <KPI icon={Target}       label="Probability"       value={`${Math.round((deal.probability ?? 0) * 100)}%`} />
        <KPI icon={TrendingUp}   label="Weighted Forecast" value={currency(weighted)} />
        <KPI icon={CalendarClock}label="Age (days)"        value={deal.ageDays ?? "—"} />
        <KPI icon={CalendarClock}label="Close Date"        value={deal.closeDate ?? "—"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="space-y-6">
          <Panel title="Deal Overview">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Owner"           value={deal.owner ?? "—"} />
              <Field label="Stage"           value={deal.stage ?? "—"} />
              <Field label="Forecast Cat."   value={deal.forecastCategory ?? "—"} />
              <Field label="Days in Stage"   value={deal.daysInStage ?? "—"} />
              <Field label="Risk">
                {deal.riskLevel === "attention" ? (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" /> Attention
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> Healthy
                  </span>
                )}
              </Field>
            </div>
          </Panel>

          <Panel title="Stakeholders & Contacts" icon={Users}>
            <div className="space-y-2">
              {deal.contacts?.length > 0 ? (
                deal.contacts.map((c) => (
                  <div key={c.email} className="flex items-center justify-between rounded border p-3">
                    <div>
                      <div className="font-medium text-sm">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.role}</div>
                    </div>
                    <div className="text-xs text-slate-500">{c.email}</div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No stakeholders recorded.</p>
              )}
            </div>
          </Panel>
        </div>

        {/* Center: Timeline */}
        <Panel title="Deal Activity Timeline" className="lg:col-span-1">
          {tlLoading ? <SkeletonTable rows={3} /> : tlError ? (
            <p className="text-sm text-red-500">{tlError}</p>
          ) : timeline?.length > 0 ? (
            <div className="space-y-3">
              {timeline.map((e) => {
                const meta = TYPE_META[e.type] ?? TYPE_META.email;
                const Icon = meta.icon;
                return (
                  <div key={e.id} className="rounded border p-3 bg-white dark:bg-slate-900">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${meta.cls}`}>
                        <Icon className="h-3.5 w-3.5" /> {e.type}
                      </span>
                      <span className="text-xs text-slate-500">{e.ts ?? e.timestamp}</span>
                    </div>
                    <div className="font-medium text-sm">{e.title}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">{e.summary}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No activity recorded.</p>
          )}
        </Panel>

        {/* Right */}
        <div className="space-y-6">
          <Panel title="Next Actions">
            <div className="flex gap-2 mb-3">
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && newTask.trim() && createTask({ title: newTask })}
                placeholder="Add next action…"
                className="flex-1 px-3 py-2 rounded border bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => newTask.trim() && createTask({ title: newTask })}
                disabled={creatingTask || !newTask.trim()}
                className="px-3 py-2 rounded bg-indigo-600 text-white text-sm flex items-center gap-1 disabled:opacity-50"
              >
                {creatingTask ? <Loader2 size={14} className="animate-spin" /> : <Plus className="h-4 w-4" />}
                Add
              </button>
            </div>
            {tasksLoading ? <SkeletonTable rows={3} /> : tasksError ? (
              <p className="text-sm text-red-500">{tasksError}</p>
            ) : (
              <div className="space-y-2">
                {(tasksData ?? []).map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={t.done ?? false}
                      onChange={() => toggleTask({ dealId: deal.id, taskId: t.id, done: !t.done })}
                    />
                    <span className={t.done ? "line-through text-slate-400" : ""}>{t.title}</span>
                  </div>
                ))}
                {(tasksData ?? []).length === 0 && <p className="text-sm text-slate-500">No tasks yet.</p>}
              </div>
            )}
          </Panel>

          <Panel title="Forecast Impact">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Deal Value</span><span className="font-medium">{currency(deal.value ?? 0)}</span></div>
              <div className="flex justify-between"><span>Probability</span><span className="font-medium">{Math.round((deal.probability ?? 0) * 100)}%</span></div>
              <div className="flex justify-between"><span>Weighted Impact</span><span className="font-medium">{currency(weighted)}</span></div>
              <div className="flex justify-between"><span>Forecast Category</span><span className="font-medium">{deal.forecastCategory ?? "—"}</span></div>
            </div>
          </Panel>

          <Panel title="Audit Trail" icon={History}>
            {auditLoading ? <SkeletonTable rows={3} /> : auditError ? (
              <p className="text-sm text-red-500">{auditError}</p>
            ) : (
              <div className="space-y-2 text-sm">
                {(audit ?? []).map((a) => (
                  <div key={a.id} className="text-slate-600 dark:text-slate-400">
                    <div className="text-xs text-slate-500">{a.ts ?? a.timestamp}</div>
                    <div>{a.text ?? a.description}</div>
                  </div>
                ))}
                {(audit ?? []).length === 0 && <p className="text-sm text-slate-500">No audit records.</p>}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
        <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children, className = "" }) {
  return (
    <div className={`rounded-xl border bg-white dark:bg-slate-900 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
        <div className="font-semibold">{title}</div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, children }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-medium">{children ?? value ?? "—"}</div>
    </div>
  );
}
