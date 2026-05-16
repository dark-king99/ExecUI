import { useApi } from "../../../hooks/useApi";
import api from "../../../services/api";
import PageHeader from "../../../components/ui/PageHeader";
import { Stat } from "../../../components/ui/Stat";
import { Card, CardHeader, CardBody } from "../../../components/ui/Card";
import { SkeletonCard } from "../../../components/ui/Skeleton";
import StatusBadge from "../../../components/ui/StatusBadge";
import { Monitor, Activity, Wifi, AlertCircle, CheckCircle, Clock } from "lucide-react";

const POLL = 15000;

const eventIcon = { alert: AlertCircle, info: Activity, success: CheckCircle };
const eventColor = { alert: "text-red-500", info: "text-blue-500", success: "text-emerald-500" };

function UtilBar({ value, color = "emerald" }) {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  const bar = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : `bg-${color}-500`;
  return (
    <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex-1">
      <div className={`h-full ${bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function DeviceCard({ device }) {
  const statusMap = { healthy: "success", warning: "warning", critical: "danger", unreachable: "default" };
  return (
    <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Wifi size={14} className="text-emerald-500" />
          <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{device.name}</span>
        </div>
        <StatusBadge status={statusMap[device.health] ?? "default"} label={device.health} />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{device.ip}</p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="w-8">CPU</span>
          <UtilBar value={device.cpu} />
          <span className="w-8 text-right">{device.cpu?.toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="w-8">Mem</span>
          <UtilBar value={device.mem} color="blue" />
          <span className="w-8 text-right">{device.mem?.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, unit }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{value} <span className="text-xs font-normal text-slate-500">{unit}</span></span>
    </div>
  );
}

export default function NetworkMonitor() {
  const { data: overview, loading: loadO } = useApi(() => api.network.monitor.overview(), [], { pollingInterval: POLL });
  const { data: metrics, loading: loadM } = useApi(() => api.network.monitor.metrics(), [], { pollingInterval: POLL });
  const { data: events = [], loading: loadE } = useApi(() => api.network.monitor.events(), [], { pollingInterval: POLL });

  const devices = overview?.devices ?? [];
  const healthy = devices.filter((d) => d.health === "healthy").length;
  const warning = devices.filter((d) => d.health === "warning").length;
  const critical = devices.filter((d) => d.health === "critical").length;
  const unreachable = devices.filter((d) => d.health === "unreachable").length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Visual Network Monitor"
        subtitle="Real-time health monitoring across all network devices"
        icon={Monitor}
        iconColor="emerald"
        badge={{ label: "Live", color: "emerald" }}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Healthy" value={healthy} color="emerald" />
          <Stat label="Warning" value={warning} color="amber" />
          <Stat label="Critical" value={critical} color="red" />
          <Stat label="Unreachable" value={unreachable} color="slate" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Device health grid */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader title="Device Health Grid" />
              <CardBody>
                {loadO ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                ) : devices.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                    No devices monitored yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {devices.map((d, i) => <DeviceCard key={i} device={d} />)}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Side panels */}
          <div className="flex flex-col gap-6">
            {/* Live metrics */}
            <Card>
              <CardHeader title="Network Metrics" />
              <CardBody>
                {loadM ? (
                  <SkeletonCard />
                ) : metrics ? (
                  <>
                    <MetricRow label="Total Throughput" value={metrics.throughputMbps?.toFixed(1)} unit="Mbps" />
                    <MetricRow label="Packet Loss" value={metrics.packetLossPct?.toFixed(2)} unit="%" />
                    <MetricRow label="Avg Latency" value={metrics.avgLatencyMs?.toFixed(1)} unit="ms" />
                    <MetricRow label="Active Connections" value={metrics.activeConnections} unit="" />
                    <MetricRow label="Errors / min" value={metrics.errorsPerMin} unit="" />
                  </>
                ) : (
                  <p className="text-sm text-slate-400">No metrics available</p>
                )}
              </CardBody>
            </Card>

            {/* Event feed */}
            <Card className="flex-1">
              <CardHeader title="Event Feed" />
              <CardBody noPadding>
                {loadE ? (
                  <div className="p-4"><SkeletonCard /></div>
                ) : events.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm">No recent events</div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                    {events.map((ev, i) => {
                      const Icon = eventIcon[ev.type] ?? Activity;
                      return (
                        <div key={i} className="flex items-start gap-3 px-4 py-3">
                          <Icon size={14} className={`mt-0.5 shrink-0 ${eventColor[ev.type] ?? "text-slate-400"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{ev.message}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {ev.device && <span className="text-xs text-slate-500">{ev.device}</span>}
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Clock size={10} /> {ev.time ?? ev.timestamp}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Summary bar */}
        {overview?.summary && (
          <Card>
            <CardHeader title="Network Summary" />
            <CardBody>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
                {Object.entries(overview.summary).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{v}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 capitalize">{k.replace(/_/g, " ")}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
