import { Activity, ArrowDownUp, Wifi, AlertTriangle, Server, Boxes } from "lucide-react";

export default function Traffic() {
  const kpis = [
    { label: "Total Throughput", value: "1.2 Gbps", icon: ArrowDownUp },
    { label: "Inbound", value: "720 Mbps", icon: ArrowDownUp },
    { label: "Outbound", value: "480 Mbps", icon: ArrowDownUp },
    { label: "Active Flows", value: "3,421", icon: Activity },
    { label: "Packet Loss", value: "0.2%", icon: AlertTriangle },
    { label: "Active Devices", value: "248", icon: Boxes },
  ];

  const topTalkers = [
    { name: "Core-Server-01", ip: "10.0.0.10", traffic: "220 Mbps" },
    { name: "DB-Cluster-02", ip: "10.0.1.12", traffic: "180 Mbps" },
    { name: "Edge-Gateway", ip: "192.168.1.1", traffic: "140 Mbps" },
    { name: "Backup-Node", ip: "10.0.2.5", traffic: "95 Mbps" },
  ];

  const protocols = [
    { name: "HTTPS", percent: "62%" },
    { name: "HTTP", percent: "14%" },
    { name: "SSH", percent: "8%" },
    { name: "DNS", percent: "6%" },
    { name: "Other", percent: "10%" },
  ];

  const spikes = [
    { time: "10:42", description: "Traffic spike on Core-Server-01", severity: "Warning" },
    { time: "09:15", description: "High outbound traffic on Edge-Gateway", severity: "Info" },
    { time: "Yesterday", description: "Unusual flow pattern detected", severity: "Alert" },
  ];

  return (
    <div className="h-full w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Network Traffic
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Real-time and historical view of network flows, bandwidth usage, and anomalies.
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-4 flex items-center justify-between"
            >
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{kpi.label}</p>
                <p className="text-xl font-semibold text-slate-900 dark:text-white">
                  {kpi.value}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-white/10">
                <Icon className="h-5 w-5 text-indigo-500" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts + Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Over Time */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Traffic Over Time
            </h2>
            <Wifi className="h-5 w-5 text-indigo-500" />
          </div>
          <div className="h-48 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 text-sm">
            Traffic chart placeholder
          </div>
        </div>

        {/* Protocol Breakdown */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Top Protocols
          </h2>
          <div className="space-y-3">
            {protocols.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">{p.name}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{p.percent}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Talkers */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Server className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Top Talkers
            </h2>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-white/10">
            {topTalkers.map((t) => (
              <div key={t.ip} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{t.name}</p>
                  <p className="text-slate-500 dark:text-slate-400">{t.ip}</p>
                </div>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {t.traffic}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Spikes & Anomalies */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Spikes & Anomalies
            </h2>
          </div>
          <div className="space-y-3">
            {spikes.map((s, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-200 dark:border-white/10 p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">{s.time}</span>
                  <span
                    className={`text-xs font-semibold ${
                      s.severity === "Alert"
                        ? "text-red-500"
                        : s.severity === "Warning"
                        ? "text-amber-500"
                        : "text-slate-500"
                    }`}
                  >
                    {s.severity}
                  </span>
                </div>
                <p className="mt-1 text-slate-900 dark:text-white">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
