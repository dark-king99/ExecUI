import { useMemo } from "react";
import PageHeader from "../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import { TrendingUp, AlertTriangle, Server, Wifi, AlertCircle } from "lucide-react";
import { useApi } from "../../../hooks/useApi";
import { network } from "../../../services/api";

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
  const { data: links, loading, error } = useApi(
    () => network.capacity.links(), [], { pollingInterval: 60000 }
  );

  const allLinks = links ?? [];

  const { critical, warn, avgUtil } = useMemo(() => ({
    critical: allLinks.filter(l => l.status === "critical").length,
    warn:     allLinks.filter(l => l.status === "warn").length,
    avgUtil:  allLinks.length > 0
      ? Math.round(allLinks.reduce((s, l) => s + (l.current ?? 0), 0) / allLinks.length)
      : 0,
  }), [allLinks]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Capacity Planning"
        subtitle="30-day trend forecasts per site/link, saturation alerts, and procurement recommendations"
      />

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Links Monitored"  value={loading ? "…" : allLinks.length} icon={Wifi}          color="indigo" />
        <Stat label="Near Saturation"  value={loading ? "…" : warn}            icon={AlertTriangle} color="amber" />
        <Stat label="Critical"         value={loading ? "…" : critical}         icon={AlertTriangle} color="red" />
        <Stat label="Avg Utilization"  value={loading ? "…" : `${avgUtil}%`}   icon={TrendingUp}    color="sky" />
      </div>

      <Card>
        <CardHeader title="Link Utilization Forecast" icon={TrendingUp} />
        <CardBody className="space-y-5">
          {loading && allLinks.length === 0 && (
            <div className="space-y-4 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 dark:bg-slate-700 rounded" />)}
            </div>
          )}
          {!loading && !error && allLinks.length === 0 && (
            <p className="text-sm text-slate-500">No capacity data available.</p>
          )}
          {allLinks.map(link => (
            <div key={link.id ?? link.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server size={14} className="text-slate-400" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{link.name}</span>
                  <span className="text-xs text-slate-400">({link.bandwidth})</span>
                </div>
                <div className="flex items-center gap-2">
                  {link.satETA && link.satETA !== "—" && (
                    <span className="text-xs text-slate-500">Saturates in {link.satETA}</span>
                  )}
                  <StatusBadge label={(link.status ?? "ok").toUpperCase()} variant={statusVariant[link.status] ?? "neutral"} dot />
                </div>
              </div>
              <UsageBar pct={link.current ?? 0} forecast={link.forecast ?? 0} />
            </div>
          ))}
        </CardBody>
      </Card>

      {allLinks.filter(l => l.status !== "ok").length > 0 && (
        <Card>
          <CardHeader title="Procurement Recommendations" icon={AlertTriangle} />
          <CardBody>
            <div className="space-y-3">
              {allLinks.filter(l => l.status !== "ok").map(l => (
                <div key={l.id ?? l.name} className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
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
      )}
    </div>
  );
}
