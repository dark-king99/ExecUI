import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useApi } from "../../hooks/useApi";
import { analytics } from "../../services/api";
import { Activity, AlertTriangle, CheckCircle, Clock, RefreshCw } from "lucide-react";

const STATUS_VARIANT = { healthy: "success", warning: "warning", critical: "danger" };
const EVENT_COLOR   = { warning: "text-amber-500", info: "text-indigo-400", error: "text-red-500" };

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

export default function OperationalMetrics() {
  const {
    data: services,
    loading: svcLoading,
    error: svcError,
    refetch: refetchSvc,
  } = useApi(() => analytics.operationalServices(), [], { pollingInterval: 30000 });

  const {
    data: events,
    loading: evtLoading,
    error: evtError,
    refetch: refetchEvt,
  } = useApi(() => analytics.operationalEvents(), [], { pollingInterval: 30000 });

  // Derived summary stats from live data
  const healthy  = services?.filter((s) => s.status === "healthy").length ?? 0;
  const total    = services?.length ?? 0;
  const avgLatency = services?.length
    ? Math.round(services.reduce((s, svc) => s + parseFloat(svc.latency), 0) / services.length) + "ms"
    : "—";
  const avgUptime = services?.length
    ? (services.reduce((s, svc) => s + parseFloat(svc.uptime), 0) / services.length).toFixed(2) + "%"
    : "—";
  const incidents = events?.filter((e) => e.type === "warning" || e.type === "error").length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational Metrics"
        subtitle="Near real-time service health, latency, uptime and error rates"
        actions={
          <button
            onClick={() => { refetchSvc(); refetchEvt(); }}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />

      {/* Summary stats */}
      {svcLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Services Healthy" value={`${healthy}/${total}`} icon={CheckCircle}  color="emerald" />
          <Stat label="Avg Latency"      value={avgLatency}            icon={Activity}     color="sky" />
          <Stat label="Avg Uptime"       value={avgUptime}             icon={Clock}        color="indigo" />
          <Stat label="Events Open"      value={incidents}             icon={AlertTriangle} color="amber" />
        </div>
      )}

      {/* Service health table */}
      <Card>
        <CardHeader title="Service Health" icon={Activity} />
        <CardBody>
          {svcError && <ErrorBanner message={svcError} onRetry={refetchSvc} />}
          {svcLoading ? (
            <SkeletonTable rows={5} />
          ) : services?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    {["Service", "Latency", "Uptime", "Error Rate", "Status"].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {services.map((svc) => (
                    <tr key={svc.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{svc.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{svc.latency}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${parseFloat(svc.uptime) >= 99.9 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                          {svc.uptime}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{svc.errors}</td>
                      <td className="px-4 py-3">
                        <StatusBadge label={svc.status} variant={STATUS_VARIANT[svc.status] ?? "neutral"} dot />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-6">No service data available.</p>
          )}
        </CardBody>
      </Card>

      {/* Recent events */}
      <Card>
        <CardHeader title="Recent Events" icon={AlertTriangle} />
        <CardBody className="space-y-3">
          {evtError && <ErrorBanner message={evtError} onRetry={refetchEvt} />}
          {evtLoading ? (
            <SkeletonTable rows={4} />
          ) : events?.length > 0 ? (
            events.map((e, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="text-xs text-slate-400 w-12 shrink-0">{e.time}</span>
                <span className="text-xs font-medium text-slate-500 w-28 shrink-0">{e.svc}</span>
                <span className={`text-xs ${EVENT_COLOR[e.type] ?? "text-slate-400"}`}>{e.msg}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">No recent events.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
