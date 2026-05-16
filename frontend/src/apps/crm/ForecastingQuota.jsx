import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useApi } from "../../hooks/useApi";
import { crm } from "../../services/api";
import { TrendingUp, DollarSign, Users, Target, RefreshCw } from "lucide-react";

const STATUS_VARIANT = { "on-track": "success", "at-risk": "warning", exceeded: "indigo", behind: "danger" };

function AttainmentBar({ pct }) {
  const color = pct >= 100 ? "bg-orange-500" : pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-32 h-2 rounded-full bg-slate-200 dark:bg-slate-700">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{pct}%</span>
    </div>
  );
}


export default function ForecastingQuota() {
  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useApi(() => crm.forecast.summary(), [], { pollingInterval: 120000 });

  const {
    data: reps,
    loading: repsLoading,
    error: repsError,
    refetch: refetchReps,
  } = useApi(() => crm.forecast.byRep(), [], { pollingInterval: 120000 });

  const {
    data: categories,
    loading: catsLoading,
    error: catsError,
    refetch: refetchCats,
  } = useApi(() => crm.forecast.categories(), [], { pollingInterval: 120000 });

  const handleRefresh = () => { refetchSummary(); refetchReps(); refetchCats(); };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Forecasting & Quota"
        subtitle="Roll-up forecasts, commit/best-case categories and variance insights"
        actions={
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />

      {summaryError && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3">
          <p className="text-sm text-red-700 dark:text-red-300">{summaryError}</p>
          <button onClick={refetchSummary} className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline"><RefreshCw size={12} /> Retry</button>
        </div>
      )}

      {/* Summary KPIs */}
      {summaryLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Team Quota"      value={summary.quota      ?? "—"} icon={Target}    color="orange" />
          <Stat label="Commit"          value={summary.commit     ?? "—"} icon={DollarSign} color="sky" />
          <Stat label="Best Case"       value={summary.bestCase   ?? "—"} icon={TrendingUp} color="emerald" />
          <Stat label="Team Attainment" value={summary.attainment ? `${summary.attainment}%` : "—"} icon={Users} color="amber" delta={summary.attainmentDelta} />
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Rep breakdown */}
        <Card>
          <CardHeader title="Rep Forecast Breakdown" icon={Users} />
          <CardBody className="space-y-4">
            {repsError && (
              <div className="flex items-center justify-between rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3">
                <p className="text-sm text-red-700 dark:text-red-300">{repsError}</p>
                <button onClick={refetchReps} className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline"><RefreshCw size={12} /> Retry</button>
              </div>
            )}
            {repsLoading ? (
              <SkeletonTable rows={4} />
            ) : reps?.length > 0 ? (
              reps.map((rep) => (
                <div key={rep.name} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{rep.name}</p>
                    <StatusBadge
                      label={(rep.status ?? "").replace("-", " ")}
                      variant={STATUS_VARIANT[rep.status] ?? "neutral"}
                      dot
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 mb-3">
                    <div><span className="block font-semibold text-slate-800 dark:text-slate-200">{rep.quota}</span>Quota</div>
                    <div><span className="block font-semibold text-orange-600 dark:text-orange-400">{rep.commit}</span>Commit</div>
                    <div><span className="block font-semibold text-emerald-600 dark:text-emerald-400">{rep.bestCase}</span>Best Case</div>
                  </div>
                  <AttainmentBar pct={rep.attainment ?? 0} />
                </div>
              ))
            ) : !repsLoading && !repsError ? (
              <p className="text-sm text-slate-500 text-center py-4">No rep data available.</p>
            ) : null}
          </CardBody>
        </Card>

        {/* Forecast categories */}
        <Card>
          <CardHeader title="Forecast Categories" icon={TrendingUp} />
          <CardBody className="space-y-4">
            {catsError && (
              <div className="flex items-center justify-between rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3">
                <p className="text-sm text-red-700 dark:text-red-300">{catsError}</p>
                <button onClick={refetchCats} className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline"><RefreshCw size={12} /> Retry</button>
              </div>
            )}
            {catsLoading ? (
              <SkeletonTable rows={4} />
            ) : categories?.length > 0 ? (
              <>
                {categories.map((cat) => (
                  <div key={cat.label} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-700 dark:text-slate-300">{cat.label}</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{cat.value}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className={`h-2 rounded-full ${cat.color ?? "bg-indigo-500"}`}
                        style={{ width: `${Math.min(cat.pct ?? 0, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}

                {summary?.aiInsight && (
                  <div className="mt-4 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                    <p className="text-xs font-semibold text-orange-700 dark:text-orange-300">AI Forecast Insight</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{summary.aiInsight}</p>
                  </div>
                )}
              </>
            ) : !catsLoading && !catsError ? (
              <p className="text-sm text-slate-500 text-center py-4">No category data available.</p>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
