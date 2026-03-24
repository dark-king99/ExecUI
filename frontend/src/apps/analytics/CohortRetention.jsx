import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useApi } from "../../hooks/useApi";
import { analytics } from "../../services/api";
import { Users, TrendingUp, Calendar, RefreshCw } from "lucide-react";

function heatColor(val) {
  if (val === null || val === undefined) return "bg-slate-100 dark:bg-slate-800 text-transparent";
  if (val >= 80) return "bg-emerald-500 text-white";
  if (val >= 65) return "bg-emerald-400/80 text-white";
  if (val >= 50) return "bg-amber-400/80 text-white";
  return "bg-red-400/80 text-white";
}

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

export default function CohortRetention() {
  const {
    data: cohorts,
    loading: cohortsLoading,
    error: cohortsError,
    refetch: refetchCohorts,
  } = useApi(() => analytics.cohorts(), [], { pollingInterval: 300000 });

  const {
    data: tierRetention,
    loading: tierLoading,
    error: tierError,
    refetch: refetchTier,
  } = useApi(() => analytics.retentionByTier(), [], { pollingInterval: 300000 });

  const {
    data: churnSignals,
    loading: churnLoading,
    error: churnError,
    refetch: refetchChurn,
  } = useApi(() => analytics.churnSignals(), [], { pollingInterval: 120000 });

  const latestAvg = cohorts?.length
    ? Math.round(cohorts.reduce((s, c) => s + (c.retention?.[1] ?? 0), 0) / cohorts.length)
    : null;

  const bestCohort = cohorts?.reduce((best, c) =>
    (c.retention?.[1] ?? 0) > (best?.retention?.[1] ?? 0) ? c : best
  , null)?.cohort ?? "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cohort & Retention"
        subtitle="Monthly user cohort retention heatmap and trend analysis"
        actions={
          <button
            onClick={() => { refetchCohorts(); refetchTier(); refetchChurn(); }}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />

      {/* Summary stats */}
      {cohortsLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Cohorts Tracked"  value={cohorts?.length ?? "—"}     icon={Calendar}  color="indigo" />
          <Stat label="Avg M1 Retention" value={latestAvg != null ? `${latestAvg}%` : "—"} icon={Users} color="emerald" />
          <Stat label="Best Cohort"      value={bestCohort}                  icon={TrendingUp} color="sky" />
        </div>
      )}

      {/* Cohort heatmap */}
      <Card>
        <CardHeader title="Retention Cohort Heatmap" icon={Users} />
        <CardBody>
          {cohortsError && <ErrorBanner message={cohortsError} onRetry={refetchCohorts} />}
          {cohortsLoading ? (
            <SkeletonTable rows={6} />
          ) : cohorts?.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400">Cohort</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400">Size</th>
                      {["M0","M1","M2","M3","M4","M5","M6"].map((m) => (
                        <th key={m} className="px-3 py-2 text-center text-xs font-semibold text-slate-400">{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {cohorts.map((row) => (
                      <tr key={row.cohort}>
                        <td className="px-3 py-2 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.cohort}</td>
                        <td className="px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{row.size}</td>
                        {(row.retention ?? []).map((val, i) => (
                          <td key={i} className="px-1 py-1">
                            <div className={`text-center text-xs font-semibold px-2 py-1 rounded ${heatColor(val)}`}>
                              {val != null ? `${val}%` : ""}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-3 mt-4 text-xs text-slate-400">
                <span>Legend:</span>
                {[["≥80%","bg-emerald-500"], ["65–80%","bg-emerald-400/80"], ["50–65%","bg-amber-400/80"], ["<50%","bg-red-400/80"]].map(([l, c]) => (
                  <span key={l} className="flex items-center gap-1">
                    <span className={`h-3 w-3 rounded ${c}`} />{l}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500 text-center py-6">No cohort data available.</p>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Retention by tier */}
        <Card>
          <CardHeader title="Retention by Plan Tier" icon={TrendingUp} />
          <CardBody className="space-y-3">
            {tierError && <ErrorBanner message={tierError} onRetry={refetchTier} />}
            {tierLoading ? (
              <SkeletonTable rows={4} />
            ) : tierRetention?.length > 0 ? (
              tierRetention.map((r) => (
                <div key={r.tier} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{r.tier}</p>
                  <div className="flex gap-4 text-xs">
                    <span>M1: <strong className="text-emerald-600 dark:text-emerald-400">{r.m1}</strong></span>
                    <span>M3: <strong className="text-amber-600 dark:text-amber-400">{r.m3}</strong></span>
                    <span>M6: <strong className="text-red-500">{r.m6}</strong></span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No tier retention data.</p>
            )}
          </CardBody>
        </Card>

        {/* Churn risk signals */}
        <Card>
          <CardHeader title="Churn Risk Signals" icon={Users} />
          <CardBody className="space-y-3">
            {churnError && <ErrorBanner message={churnError} onRetry={refetchChurn} />}
            {churnLoading ? (
              <SkeletonTable rows={4} />
            ) : churnSignals?.length > 0 ? (
              churnSignals.map((s) => (
                <div key={s.signal} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-700 dark:text-slate-300">{s.signal}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{s.affected}</span>
                    <span className={`text-xs font-medium ${s.risk === "high" ? "text-red-500" : "text-amber-500"}`}>{s.risk}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No churn risk signals.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
