import { useApi } from "../../../hooks/useApi";
import { network } from "../../../services/api";
import PageHeader from "../../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../../components/ui/Card";
import { SkeletonCard, SkeletonTable } from "../../../components/ui/Skeleton";
import StatusBadge from "../../../components/ui/StatusBadge";
import { Activity, RefreshCw, AlertCircle, Server, Wifi, ArrowDownUp, AlertTriangle, Clock } from "lucide-react";

function ProtocolBar({ name, percent, bytes }) {
  const pct = typeof percent === "string" ? parseFloat(percent) : (percent ?? 0);
  const color = pct > 60 ? "bg-emerald-500" : pct > 30 ? "bg-sky-500" : "bg-slate-400";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-300">{name}</span>
        <div className="flex gap-3 text-xs text-slate-400">
          {bytes && <span>{bytes}</span>}
          <span className="font-semibold text-slate-700 dark:text-slate-200">{typeof percent === "string" ? percent : `${pct}%`}</span>
        </div>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(100, Math.max(2, pct))}%` }} />
      </div>
    </div>
  );
}

export default function Traffic() {
  const { data: overview, loading: ovLoading, error: ovError, refetch: refetchOv } = useApi(() => network.traffic.overview(), [], { pollingInterval: 15000 });
  const { data: topTalkers, loading: talkLoading, refetch: refetchTalk } = useApi(() => network.traffic.topTalkers(), [], { pollingInterval: 15000 });
  const { data: protocols, loading: protLoading, refetch: refetchProt } = useApi(() => network.traffic.protocols(), [], { pollingInterval: 30000 });
  const { data: anomalies, loading: anomLoading, refetch: refetchAnom } = useApi(() => network.traffic.anomalies(), [], { pollingInterval: 15000 });

  const kpis = overview?.kpis ?? [];
  const allTalkers = topTalkers ?? [];
  const allProtocols = protocols ?? [];
  const allAnomalies = anomalies ?? [];

  const handleRefreshAll = () => { refetchOv(); refetchTalk(); refetchProt(); refetchAnom(); };

  const SEV_VARIANT = { Alert: "danger", Critical: "danger", Warning: "warning", Info: "info" };

  return (
    <div className="space-y-6">
      <PageHeader title="Network Traffic" subtitle="Real-time flows, bandwidth, and anomaly detection"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Auto-refresh 15s</span>
            <button onClick={handleRefreshAll} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh</button>
          </div>
        }
      />

      {ovError && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{ovError}</div>}

      {ovLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : kpis.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {kpis.map((kpi, i) => (
            <div key={kpi.label ?? i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">{kpi.label}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{kpi.value}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                <Activity size={18} className="text-emerald-600" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Bandwidth by Direction" icon={ArrowDownUp} />
          <CardBody className="space-y-4">
            {ovLoading ? <SkeletonTable rows={4} /> : (
              <>
                {overview?.bandwidth ? (
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(overview.bandwidth).map(([key, val]) => (
                      <div key={key} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-1 capitalize">{key.replace(/_/g, " ")}</div>
                        <div className="text-lg font-bold text-slate-900 dark:text-white">{String(val)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allProtocols.slice(0, 4).map((p, i) => (
                      <ProtocolBar key={p.name ?? i} name={p.name} percent={p.percent} bytes={p.bytes} />
                    ))}
                    {allProtocols.length === 0 && !protLoading && <p className="text-sm text-slate-500 text-center py-4">No bandwidth data available.</p>}
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Top Protocols" icon={Wifi} />
          <CardBody className="space-y-3">
            {protLoading ? <SkeletonTable rows={5} /> : allProtocols.length > 0 ? (
              allProtocols.map((p, i) => <ProtocolBar key={p.name ?? i} name={p.name} percent={p.percent} bytes={p.bytes} />)
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No protocol data.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Top Talkers" icon={Server} />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {talkLoading ? <div className="p-4"><SkeletonTable rows={5} /></div> : allTalkers.length > 0 ? (
              allTalkers.map((t, i) => (
                <div key={t.ip ?? t.name ?? i} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{t.name ?? t.hostname}</div>
                    <div className="font-mono text-xs text-slate-400">{t.ip}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">{t.traffic ?? t.bytes ?? t.total}</div>
                    {t.percent && <div className="text-xs text-slate-400">{t.percent}% of total</div>}
                  </div>
                </div>
              ))
            ) : (
              <p className="p-6 text-sm text-slate-500 text-center">No talker data available.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Anomalies & Spikes" icon={AlertTriangle} />
          <CardBody className="space-y-3">
            {anomLoading ? <SkeletonTable rows={4} /> : allAnomalies.length > 0 ? (
              allAnomalies.map((a, i) => (
                <div key={i} className="border border-slate-100 dark:border-slate-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400"><Clock size={11} />{a.time ?? a.timestamp ?? "—"}</div>
                    <StatusBadge label={a.severity ?? "warning"} variant={SEV_VARIANT[a.severity] ?? "warning"} />
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{a.description ?? a.message ?? a.detail}</p>
                  {a.device && <p className="text-xs text-slate-400 mt-0.5">{a.device}</p>}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No anomalies detected. Network is clean.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
