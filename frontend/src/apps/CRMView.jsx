import { useState } from "react";
import { Target, DollarSign, Users, CheckSquare, TrendingUp, RefreshCw, AlertCircle, ArrowRight } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../components/ui/Card";
import StatusBadge from "../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../components/ui/Skeleton";
import { useApi } from "../hooks/useApi";
import { crm } from "../services/api";

const STAGE_VARIANT = { Discovery: "neutral", Qualified: "info", Proposal: "warning", Negotiation: "indigo", "Closed Won": "success", "Closed Lost": "danger" };
const PRIORITY_VARIANT = { high: "danger", medium: "warning", low: "success" };

export default function CRMView() {
  const [refresh, setRefresh] = useState(0);
  const { data: deals, loading: dealsLoading, error } = useApi(() => crm.deals.list({ limit: 10 }), [refresh], { pollingInterval: 60000 });
  const { data: leads, loading: leadsLoading } = useApi(() => crm.leads.list({ limit: 10 }), [refresh], { pollingInterval: 60000 });
  const { data: tasks, loading: tasksLoading } = useApi(() => crm.tasks.list({ limit: 10 }), [refresh], { pollingInterval: 30000 });
  const { data: forecast } = useApi(() => crm.forecast.summary(), [refresh], { pollingInterval: 120000 });
  const { data: pipeline } = useApi(() => crm.pipeline.summary(), [refresh], { pollingInterval: 60000 });

  const allDeals = deals ?? [];
  const allLeads = leads ?? [];
  const allTasks = tasks ?? [];
  const openDeals = allDeals.filter(d => d.stage !== "Closed Won" && d.stage !== "Closed Lost");
  const dueTasks = allTasks.filter(t => !t.completed);
  const pipelineValue = openDeals.reduce((s, d) => s + (d.rawValue ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="CRM" subtitle="Your sales command center — deals, leads, tasks, and pipeline at a glance"
        actions={
          <button onClick={() => setRefresh(r => r + 1)} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition">
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />

      {dealsLoading && allDeals.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Open Deals" value={openDeals.length} icon={Target} color="orange" />
          <Stat label="Pipeline Value" value={pipelineValue ? `$${(pipelineValue / 1000).toFixed(0)}k` : (pipeline?.totalPipeline ?? "—")} icon={DollarSign} color="emerald" />
          <Stat label="Active Leads" value={allLeads.length} icon={Users} color="sky" />
          <Stat label="Tasks Due" value={dueTasks.length} icon={CheckSquare} color="amber" />
        </div>
      )}

      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}

      {forecast && (
        <Card>
          <CardHeader title="Forecast Overview" icon={TrendingUp} />
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ["Forecast (QTD)", forecast.forecast],
                ["Quota", forecast.quota],
                ["Attainment", forecast.attainment != null ? `${forecast.attainment}%` : null],
                ["Commit", forecast.commit],
              ].filter(([, v]) => v != null).map(([l, v]) => (
                <div key={l} className="text-center">
                  <div className="text-xs text-slate-500 mb-1">{l}</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white">{v}</div>
                </div>
              ))}
            </div>
            {forecast.attainment != null && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>0%</span><span>Quota Attainment</span><span>100%</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${forecast.attainment >= 100 ? "bg-emerald-500" : forecast.attainment >= 70 ? "bg-amber-500" : "bg-orange-500"}`} style={{ width: `${Math.min(100, forecast.attainment)}%` }} />
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader title="Recent Deals" icon={Target} actions={<ArrowRight size={14} className="text-slate-400" />} />
          {dealsLoading && allDeals.length === 0 ? <div className="p-4"><SkeletonTable rows={5} /></div> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {allDeals.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">No deals found.</p> : allDeals.slice(0, 6).map((d, i) => (
                <div key={d.id ?? i} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0 flex-1 mr-2">
                    <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{d.name}</div>
                    <div className="text-xs text-slate-400 truncate">{d.account ?? ""}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">{d.value}</div>
                    <StatusBadge label={d.stage ?? "—"} variant={STAGE_VARIANT[d.stage] ?? "neutral"} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Recent Leads" icon={Users} />
          {leadsLoading && allLeads.length === 0 ? <div className="p-4"><SkeletonTable rows={5} /></div> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {allLeads.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">No leads found.</p> : allLeads.slice(0, 6).map((l, i) => (
                <div key={l.id ?? i} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="h-7 w-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 font-semibold text-xs shrink-0">
                    {(l.name ?? l.email ?? "L")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{l.name}</div>
                    <div className="text-xs text-slate-400 truncate">{l.company ?? l.account ?? ""}</div>
                  </div>
                  {l.score != null && (
                    <div className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${l.score >= 70 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : l.score >= 40 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>{l.score}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Tasks Due" icon={CheckSquare} />
          {tasksLoading && allTasks.length === 0 ? <div className="p-4"><SkeletonTable rows={5} /></div> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {dueTasks.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">All caught up!</p> : dueTasks.slice(0, 6).map((t, i) => (
                <div key={t.id ?? i} className="flex items-center gap-3 px-4 py-2.5">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${t.priority === "high" ? "bg-red-500" : t.priority === "medium" ? "bg-amber-500" : "bg-emerald-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{t.title ?? t.name}</div>
                    <div className="text-xs text-slate-400">{t.type ?? ""}{t.assignee ? ` • ${t.assignee}` : ""}</div>
                  </div>
                  {t.priority && <StatusBadge label={t.priority} variant={PRIORITY_VARIANT[t.priority] ?? "neutral"} />}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
