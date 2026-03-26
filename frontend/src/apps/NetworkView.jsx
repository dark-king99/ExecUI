import {
  Server,
  Activity,
  Bell,
  Cloud,
  Cpu,
  HardDrive,
  ShieldCheck,
  Boxes,
  TrendingUp,
} from "lucide-react";

export default function NetworkDashboard() {
  const stats = [
    { label: "Total Devices", value: "248", icon: Boxes },
    { label: "Servers Online", value: "32 / 34", icon: Server },
    { label: "Active Alerts", value: "3", icon: Bell },
    { label: "Endpoints Healthy", value: "97%", icon: ShieldCheck },
    { label: "Cloud Regions", value: "5", icon: Cloud },
    { label: "Avg Utilization", value: "68%", icon: Cpu },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Network Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Real-time overview of devices, servers, endpoints, and cloud infrastructure.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between shadow-sm"
            >
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
                <p className="text-2xl font-semibold">{stat.value}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
                <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monitoring & Health */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Monitoring & Health</h2>
            <Activity className="h-5 w-5 text-emerald-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StatusCard title="Network Status" value="Operational" color="text-emerald-600" />
            <StatusCard title="Endpoint Health" value="Good" color="text-emerald-600" />
            <StatusCard title="Server Load" value="Moderate" color="text-amber-500" />
            <StatusCard title="Security Posture" value="Secure" color="text-emerald-600" />
          </div>
        </div>

        {/* Cloud Control */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Cloud Control</h2>
            <Cloud className="h-5 w-5 text-sky-500" />
          </div>

          <div className="space-y-3 text-sm">
            <Row label="Active Regions" value="5" />
            <Row label="Services Running" value="18" />
            <Row label="Incidents" value="1 Warning" highlight />
          </div>
        </div>
      </div>

      {/* Usage & Storage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel
          title="Server & Device Usage"
          icon={<TrendingUp className="h-5 w-5 text-indigo-500" />}
          description="CPU, memory, and bandwidth usage across infrastructure."
        />
        <Panel
          title="Storage & Backups"
          icon={<HardDrive className="h-5 w-5 text-emerald-500" />}
          description="Inventory, backups, and retention status."
        />
      </div>
    </div>
  );
}

function StatusCard({ title, value, color }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={highlight ? "text-amber-500 font-semibold" : "font-semibold"}>
        {value}
      </span>
    </div>
  );
}

function Panel({ title, icon, description }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-950 bg-white dark:bg-slate-950 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {icon}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      <div className="mt-4 h-28 rounded-lg bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Chart / Data Visualization Placeholder
      </div>
    </div>
  );
}
