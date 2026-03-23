import PageHeader from "../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import { TrendingUp, AlertTriangle, Server, Wifi } from "lucide-react";

const links = [
  { name: "DC-West → Core-01",   current: 78, forecast: 94, status: "warn",    bandwidth: "10 Gbps", satETA: "42 days" },
  { name: "Edge-12 → ISP-A",     current: 45, forecast: 58, status: "ok",      bandwidth: "1 Gbps",  satETA: "—" },
  { name: "Branch-05 → Core-02", current: 92, forecast: 99, status: "critical",bandwidth: "100 Mbps",satETA: "8 days" },
  { name: "DC-East → Core-03",   current: 33, forecast: 41, status: "ok",      bandwidth: "10 Gbps", satETA: "—" },
  { name: "ISP-B → Peering-01",  current: 65, forecast: 81, status: "warn",    bandwidth: "10 Gbps", satETA: "90 days" },
];

const statusVariant = { ok: "success", warn: "warning", critical: "danger" };

function UsageBar({ pct, forecast }) {
  return (
    <div className="space-y-1">
      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 relative">
        <div
          className={`h-2 rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }}
        />
        {forecast && (
          <div
            className="absolute top-0 h-2 rounded-full border-r-2 border-indigo-500 opacity-60"
            style={{ width: `${forecast}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-xs text-slate-400">
        <span>Now: {pct}%</span>
        <span>30-day: {forecast}%</span>
      </div>
    </div>
  );
}

export default function CapacityPlanning() {
  const critical = links.filter(l => l.status === "critical").length;
  const warn     = links.filter(l => l.status === "warn").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Capacity Planning"
        subtitle="30-day trend forecasts per site/link, saturation alerts, and procurement recommendations"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Links Monitored"  value={links.length} icon={Wifi}          color="indigo" />
        <Stat label="Near Saturation"  value={warn}          icon={AlertTriangle} color="amber" />
        <Stat label="Critical"         value={critical}      icon={AlertTriangle} color="red" />
        <Stat label="Avg Utilization"  value={`${Math.round(links.reduce((s,l)=>s+l.current,0)/links.length)}%`} icon={TrendingUp} color="sky" />
      </div>

      <Card>
        <CardHeader title="Link Utilization Forecast" icon={TrendingUp} />
        <CardBody className="space-y-5">
          {links.map(link => (
            <div key={link.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server size={14} className="text-slate-400" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{link.name}</span>
                  <span className="text-xs text-slate-400">({link.bandwidth})</span>
                </div>
                <div className="flex items-center gap-2">
                  {link.satETA !== "—" && (
                    <span className="text-xs text-slate-500">Saturates in {link.satETA}</span>
                  )}
                  <StatusBadge label={link.status.toUpperCase()} variant={statusVariant[link.status]} dot />
                </div>
              </div>
              <UsageBar pct={link.current} forecast={link.forecast} />
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Procurement Recommendations" icon={AlertTriangle} />
        <CardBody>
          <div className="space-y-3">
            {links.filter(l => l.status !== "ok").map(l => (
              <div key={l.name} className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{l.name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Current: {l.current}% · Forecast: {l.forecast}% · Capacity: {l.bandwidth}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      {l.status === "critical"
                        ? "⚡ Immediate upgrade required. Submit procurement request."
                        : "Schedule bandwidth upgrade within 60 days."}
                    </p>
                  </div>
                  <button className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap ml-4">
                    Open ticket →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
