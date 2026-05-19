import { useApi } from "../hooks/useApi";
import { network, views } from "../services/api";
import { Stat, Card, CardHeader, CardBody } from "../components/ui/Card";
import { SkeletonCard, SkeletonTable } from "../components/ui/Skeleton";
import PageHeader from "../components/ui/PageHeader";
import StatusBadge from "../components/ui/StatusBadge";
import { Server, Bell, ShieldCheck, Cloud, Cpu, Boxes, Activity, RefreshCw, AlertCircle, TrendingUp, HardDrive, CheckCircle2, XCircle } from "lucide-react";

function UtilBar({ hostname, device_type, cpu_util, mem_util, status }) {
  const cpu = Math.round(cpu_util ?? 0);
  const mem = Math.round(mem_util ?? 0);
  const cpuColor = cpu >= 90 ? "bg-red-500" : cpu >= 70 ? "bg-amber-500" : "bg-emerald-500";
  const memColor = mem >= 90 ? "bg-red-500" : mem >= 70 ? "bg-amber-500" : "bg-sky-500";
  return (
    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-2 w-2 rounded-full shrink-0 ${status === "down" || status === "maintenance" ? "bg-red-500" : "bg-emerald-500"}`} />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{hostname}</span>
        </div>
        <span className="text-[10px] uppercase text-slate-400 shrink-0 ml-2">{device_type}</span>
      </div>
      <div className="space-y-1.5">
        <div>
          <div className="flex justify-between text-[10px] mb-0.5"><span className="text-slate-400">CPU</span><span className="text-slate-500">{cpu}%</span></div>
          <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"><div className={`h-1.5 rounded-full ${cpuColor}`} style={{ width: `${cpu}%` }} /></div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] mb-0.5"><span className="text-slate-400">MEM</span><span className="text-slate-500">{mem}%</span></div>
          <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"><div className={`h-1.5 rounded-full ${memColor}`} style={{ width: `${mem}%` }} /></div>
        </div>
      </div>
    </div>
  );
}

export default function NetworkView() {
  const { data: overview, loading: ovLoading, error, refetch } = useApi(() => views.network(), [], { pollingInterval: 60000 });
  const { data: devices, loading: devLoading } = useApi(() => network.devices.list({ limit: 20 }), [], { pollingInterval: 30000 });
  const { data: alerts } = useApi(() => network.alerts.list({ limit: 5, status: "open" }), [], { pollingInterval: 15000 });
  const { data: incidents } = useApi(() => network.incidents.list({ limit: 5, status: "open" }), [], { pollingInterval: 30000 });

  const kpis = overview?.kpis ?? {};
  const health = overview?.health ?? {};
  const cloud = overview?.cloud ?? {};
  const allDevices = devices ?? [];
  const allAlerts = alerts ?? [];
  const allIncidents = incidents ?? [];

  const totalDevices = kpis.total_devices ?? allDevices.length;
  const onlineDevices = allDevices.filter(d => d.status === "Online" || d.status === "online").length;
  const openAlerts = kpis.active_alerts ?? allAlerts.length;

  const healthItems = [
    { label: "Network Status", value: health.network_status ?? "—" },
    { label: "Endpoint Health", value: health.endpoint_health ?? "—" },
    { label: "Server Load", value: health.server_load ?? "—" },
    { label: "Security Posture", value: health.security_posture ?? "—" },
  ];

  function statusVariant(v) {
    const s = (v ?? "").toLowerCase();
    if (["operational", "good", "normal", "secure"].includes(s)) return "success";
    if (["moderate", "fair", "warning"].includes(s)) return "warning";
    return "danger";
  }

  const SEVERITY_COLOR = { Critical: "text-red-600 dark:text-red-400", Warning: "text-amber-600 dark:text-amber-400", Info: "text-sky-600 dark:text-sky-400" };

  return (
    <div className="space-y-6">
      <PageHeader title="Network Operations" subtitle="Real-time overview of your infrastructure health and performance"
        actions={<button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh</button>}
      />

      {ovLoading && allDevices.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Stat label="Total Devices" value={totalDevices || "—"} icon={Boxes} color="emerald" />
          <Stat label="Devices Online" value={devLoading ? "…" : `${onlineDevices} / ${allDevices.length}`} icon={Server} color="sky" />
          <Stat label="Open Alerts" value={openAlerts} icon={Bell} color="amber" />
          <Stat label="Cloud Regions" value={kpis.cloud_regions ?? cloud.active_regions ?? "—"} icon={Cloud} color="indigo" />
          <Stat label="Avg CPU Util" value={kpis.avg_cpu_util != null ? `${kpis.avg_cpu_util}%` : "—"} icon={Cpu} color="red" />
          <Stat label="Endpoints Healthy" value={kpis.endpoints_healthy_pct != null ? `${kpis.endpoints_healthy_pct}%` : "—"} icon={ShieldCheck} color="emerald" />
        </div>
      )}

      {error && <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"><AlertCircle size={15} />Dashboard overview unavailable — showing live device data</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Infrastructure Health" icon={Activity} />
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              {healthItems.map(({ label, value }) => (
                <div key={label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">{label}</div>
                  <StatusBadge label={value} variant={statusVariant(value)} />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Cloud Summary" icon={Cloud} />
          <CardBody className="space-y-3">
            {[
              ["Active Regions", cloud.active_regions ?? kpis.cloud_regions ?? "—"],
              ["Cloud Devices", cloud.cloud_devices ?? "—"],
              ["Open Incidents", cloud.incidents_count ?? allIncidents.length],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{label}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{value}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Device Utilisation" icon={TrendingUp} />
          <CardBody>
            {devLoading ? <SkeletonTable rows={4} /> : allDevices.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No devices discovered. Configure inventory to begin monitoring.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {allDevices.slice(0, 12).map((d, i) => <UtilBar key={d.id ?? i} {...d} />)}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent Alerts" icon={Bell} actions={<span className="text-xs text-slate-400">{openAlerts} open</span>} />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {allAlerts.length === 0 ? (
              <p className="p-6 text-sm text-slate-500 text-center">No open alerts.</p>
            ) : allAlerts.slice(0, 5).map((a, i) => (
              <div key={a.id ?? i} className="flex items-start gap-3 px-4 py-3">
                <AlertCircle size={14} className={`mt-0.5 shrink-0 ${SEVERITY_COLOR[a.severity] ?? "text-slate-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{a.title ?? a.message ?? a.description}</div>
                  <div className="text-xs text-slate-400">{a.device ?? a.source ?? ""}{a.time ? ` · ${a.time}` : ""}</div>
                </div>
                <span className={`text-xs font-semibold shrink-0 ${SEVERITY_COLOR[a.severity] ?? "text-slate-400"}`}>{a.severity}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {allIncidents.length > 0 && (
        <Card>
          <CardHeader title="Open Incidents" icon={AlertCircle} />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {allIncidents.map((inc, i) => (
              <div key={inc.id ?? i} className="flex items-center gap-3 px-4 py-3">
                <div className={`h-2 w-2 rounded-full shrink-0 ${inc.severity === "critical" ? "bg-red-500" : inc.severity === "high" ? "bg-orange-500" : "bg-amber-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">{inc.title}</div>
                  <div className="text-xs text-slate-400">{inc.owner ?? "Unassigned"}</div>
                </div>
                <StatusBadge label={inc.severity ?? "medium"} variant={inc.severity === "critical" ? "danger" : inc.severity === "high" ? "warning" : "info"} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
