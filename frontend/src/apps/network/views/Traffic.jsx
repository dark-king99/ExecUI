import { useApi } from "../../../hooks/useApi";
import { network } from "../../../services/api";
import { SkeletonCard, SkeletonTable } from "../../../components/ui/Skeleton";
import { Activity, ArrowDownUp, Wifi, AlertTriangle, Server, Boxes, RefreshCw, AlertCircle } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader";

const KPI_ICON_MAP = {
  ArrowDownUp, Activity, AlertTriangle, Wifi, Server, Boxes,
};

export default function Traffic() {
  const {
    data: overview,
    loading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useApi(() => network.traffic.overview(), [], { pollingInterval: 15000 });

  const {
    data: topTalkers,
    loading: talkersLoading,
    error: talkersError,
    refetch: refetchTalkers,
  } = useApi(() => network.traffic.topTalkers(), [], { pollingInterval: 15000 });

  const {
    data: protocols,
    loading: protLoading,
    error: protError,
    refetch: refetchProt,
  } = useApi(() => network.traffic.protocols(), [], { pollingInterval: 30000 });

  const {
    data: anomalies,
    loading: anomLoading,
    error: anomError,
    refetch: refetchAnom,
  } = useApi(() => network.traffic.anomalies(), [], { pollingInterval: 15000 });

  const handleRefreshAll = () => {
    refetchOverview(); refetchTalkers(); refetchProt(); refetchAnom();
  };

  return (
    <div className="h-full w-full space-y-6">
      <PageHeader
        title="Network Traffic"
        subtitle="Real-time network flows, bandwidth usage, and anomaly detection."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Auto-refresh 15s</span>
            <button onClick={handleRefreshAll} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition">
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        }
      />

      {/* KPI Grid */}
      {overviewError && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {overviewError}
          <button onClick={refetchOverview} className="ml-auto text-xs hover:underline flex items-center gap-1"><RefreshCw size={11} /> Retry</button>
        </div>
      )}
      {overviewLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : overview?.kpis?.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {overview.kpis.map((kpi) => {
            const Icon = KPI_ICON_MAP[kpi.icon] ?? Activity;
            return (
              <div
                key={kpi.label}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{kpi.label}</p>
                  <p className="text-xl font-semibold text-slate-900 dark:text-white">{kpi.value}</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <Icon className="h-5 w-5 text-indigo-500" />
                </div>
              </div>
            );
          })}
        </div>
      ) : !overviewLoading && !overviewError ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-center text-sm text-slate-500">
          No traffic data available.
        </div>
      ) : null}

      {/* Charts + Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Over Time — live chart placeholder */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Traffic Over Time</h2>
            <Wifi className="h-5 w-5 text-indigo-500" />
          </div>
          <div className="h-48 rounded-lg bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 text-sm">
            {overviewLoading ? "Loading…" : "Connect a charting library to visualise live traffic data"}
          </div>
        </div>

        {/* Protocol Breakdown */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Top Protocols</h2>
          {protError && <p className="text-xs text-red-500 mb-2">{protError}</p>}
          {protLoading ? (
            <SkeletonTable rows={5} />
          ) : protocols?.length > 0 ? (
            <div className="space-y-3">
              {protocols.map((p) => (
                <div key={p.name} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-300">{p.name}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{p.percent}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">No protocol data.</p>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Talkers */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Server className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Top Talkers</h2>
          </div>
          {talkersError && <p className="text-xs text-red-500 mb-2">{talkersError}</p>}
          {talkersLoading ? (
            <SkeletonTable rows={4} />
          ) : topTalkers?.length > 0 ? (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {topTalkers.map((t) => (
                <div key={t.ip ?? t.name} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{t.name}</p>
                    <p className="text-slate-500 dark:text-slate-400 font-mono text-xs">{t.ip}</p>
                  </div>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">{t.traffic}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">No talker data available.</p>
          )}
        </div>

        {/* Anomalies */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Spikes & Anomalies</h2>
          </div>
          {anomError && <p className="text-xs text-red-500 mb-2">{anomError}</p>}
          {anomLoading ? (
            <SkeletonTable rows={3} />
          ) : anomalies?.length > 0 ? (
            <div className="space-y-3">
              {anomalies.map((s, i) => (
                <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{s.time ?? s.timestamp ?? "—"}</span>
                    <span className={`text-xs font-semibold ${
                      s.severity === "Alert" || s.severity === "Critical"
                        ? "text-red-500"
                        : s.severity === "Warning"
                        ? "text-amber-500"
                        : "text-slate-500"
                    }`}>
                      {s.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-900 dark:text-white">{s.description ?? s.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">No anomalies detected.</p>
          )}
        </div>
      </div>
    </div>
  );
}
