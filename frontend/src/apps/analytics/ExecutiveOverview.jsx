import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useApi } from "../../hooks/useApi";
import { analytics } from "../../services/api";
import { BarChart3, TrendingUp, Users, DollarSign, Activity, ShieldCheck, RefreshCw } from "lucide-react";

const ICON_MAP = {
  DollarSign, Users, TrendingUp, BarChart3, Activity, ShieldCheck,
};

const STATUS_VARIANT = { healthy: "success", warning: "warning", critical: "danger" };

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3">
      <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline"
        >
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}

export default function ExecutiveOverview() {
  const {
    data: kpis,
    loading: kpisLoading,
    error: kpisError,
    refetch: refetchKpis,
  } = useApi(() => analytics.kpis(), [], { pollingInterval: 60000 });

  const {
    data: health,
    loading: healthLoading,
    error: healthError,
    refetch: refetchHealth,
  } = useApi(() => analytics.healthSummary(), [], { pollingInterval: 60000 });

  const {
    data: revPlan,
    loading: revLoading,
    error: revError,
    refetch: refetchRev,
  } = useApi(() => analytics.revenueVsPlan(), [], { pollingInterval: 120000 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Overview"
        subtitle="North-star KPIs and business health snapshot"
        actions={
          <button
            onClick={() => { refetchKpis(); refetchHealth(); refetchRev(); }}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />

      {/* KPI Grid */}
      {kpisError && <ErrorBanner message={kpisError} onRetry={refetchKpis} />}
      {kpisLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : kpis?.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {kpis.map((kpi) => {
            const Icon = ICON_MAP[kpi.icon] ?? BarChart3;
            return (
              <Stat
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                delta={kpi.delta}
                icon={Icon}
                color={kpi.color}
              />
            );
          })}
        </div>
      ) : !kpisLoading && !kpisError ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-sm text-slate-500">
          No KPI data available yet.
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Business Health */}
        <Card>
          <CardHeader title="Business Health Summary" icon={ShieldCheck} />
          <CardBody className="space-y-3">
            {healthError && <ErrorBanner message={healthError} onRetry={refetchHealth} />}
            {healthLoading ? (
              <SkeletonTable rows={4} />
            ) : health?.length > 0 ? (
              health.map((h) => (
                <div
                  key={h.area}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{h.area}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{h.note}</p>
                  </div>
                  <StatusBadge
                    label={h.status}
                    variant={STATUS_VARIANT[h.status] ?? "neutral"}
                    dot
                  />
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No health data available.</p>
            )}
          </CardBody>
        </Card>

        {/* Revenue vs Plan */}
        <Card>
          <CardHeader title="Revenue vs Plan (Monthly)" icon={TrendingUp} />
          <CardBody>
            {revError && <ErrorBanner message={revError} onRetry={refetchRev} />}
            {revLoading ? (
              <SkeletonTable rows={6} />
            ) : revPlan?.length > 0 ? (
              <div className="space-y-3">
                {revPlan.map((m) => (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="w-8 text-xs text-slate-400">{m.month}</span>
                    <div className="flex-1 h-4 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          m.pct >= 100 ? "bg-emerald-500" : m.pct >= 90 ? "bg-amber-500" : "bg-red-400"
                        }`}
                        style={{ width: `${Math.min(m.pct, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold w-12 text-right text-slate-700 dark:text-slate-300">
                      {m.pct}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No revenue plan data available.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
