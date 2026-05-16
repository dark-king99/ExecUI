import { useApi } from "../../../hooks/useApi";
import { network } from "../../../services/api";
import PageHeader from "../../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import { Monitor, Activity, Wifi, AlertCircle, CheckCircle, Clock } from "lucide-react";

const POLL = 15000;

const eventIcon = { alert: AlertCircle, info: Activity, success: CheckCircle };
const eventColor = { alert: "text-red-500", info: "text-blue-500", success: "text-emerald-500" };
const healthVariant = { healthy: "success", warning: "warning", critical: "danger", unreachable: "neutral" };

function UtilBar({ value, colorClass = "bg-emerald-500" }) {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  const bar = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : colorClass;
  return (
    <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex-1">
      <div className={`h-full ${bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function DeviceCard({ device }) {
  return (
    <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Wifi size={14} className="text-emerald-500" />
          <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{device.name}</span>
        </div>
        <StatusBadge variant={healthVariant[device.health] ?? "neutral"} label={device.health} />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{device.ip}</p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="w-8">CPU</span>
          <UtilBar value={device.cpu} />
          <span className="w-8 text-right">{(device.cpu ?? 0).toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="w-8">Mem</span>
          <UtilBar value={device.mem} colorClass="bg-sky-500" />
          <span className="w-8 text-right">{(device.mem ?? 0).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, unit }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {value} <span className="text-xs font-normal text-slate-500">{unit}</span>
      </span>
    </div>
  );
}

export default function NetworkMonitor() {
  const { data: overview, loading: loadO } = useApi(() => network.monitor.overview(), [], { pollingInterval: POLL });
  const { data: metrics, loading: loadM } = useApi(() => network.monitor.metrics(), [], { pollingInterval: POLL });
  const { data: events = [], loading: loadE } = useApi(() => network.monitor.events(), [], { pollingInterval: POLL });

  const devices = overview?.devices ?? [];
  const healthy = devices.filter((d) => d.health === "healthy").length;
  const warning = devices.filter((d) => d.health === "warning").length;
  const critical = devices.filter((d) => d.health === "critical").length;
  const unreachable = devices.filter((d) => d.health === "unreachable").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visual Network Monitor"
        subtitle="Real-time health monitoring across all network devices"
        icon={Monitor}
        iconColor="emerald"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Healthy" value={healthy} color="emerald" />
        <Stat label="Warning" value={warning} color="amber" />
        <Stat label="Critical" value={critical} color="red" />
        <Stat label="Unreachable" value={unreachable} color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Device Health Grid" />
            <CardBody>
              {loadO ? (
                <p className="text-sm text-slate-400 py-4">Loading devices…</p>
              ) : devices.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                  No devices monitored yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {devices.map((d, i) => <DeviceCard key={d.id ?? i} device={d} />)}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Network Metrics" />
            <CardBody>
              {loadM ? (
                <p className="text-sm text-slate-400">Loading…</p>
              ) : metrics ? (
                <>
                  <MetricRow label="Total Throughput" value={(metrics.throughputMbps ?? 0).toFixed(1)} unit="Mbps" />
                  <MetricRow label="Packet Loss" value={(metrics.packetLossPct ?? 0).toFixed(2)} unit="%" />
                  <MetricRow label="Avg Latency" value={(metrics.avgLatencyMs ?? 0).toFixed(1)} unit="ms" />
                  <MetricRow label="Active Connections" value={metrics.activeConnections ?? 0} unit="" />
                  <MetricRow label="Errors / min" value={metrics.errorsPerMin ?? 0} unit="" />
                </>
              ) : (
                <p className="text-sm text-slate-400">No metrics available</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Event Feed" />
            <CardBody className="p-0">
              {loadE ? (
                <div className="p-4 text-sm text-slate-400">Loading…</div>
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
  );
}
