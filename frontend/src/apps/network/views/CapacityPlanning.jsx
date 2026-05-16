import { useState } from "react";
import { TrendingUp, RefreshCw, AlertCircle, Server, Wifi, AlertTriangle } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../../components/ui/Skeleton";
import { useApi } from "../../../hooks/useApi";
import { network } from "../../../services/api";

const STATUS_VARIANT = { ok: "success", warn: "warning", critical: "danger", normal: "success" };

function UsageBar({ current, forecast, label }) {
  const now = current ?? 0;
  const fore = forecast ?? 0;
  const nowColor = now >= 90 ? "bg-red-500" : now >= 70 ? "bg-amber-500" : "bg-emerald-500";
  const foreColor = fore >= 90 ? "border-red-500" : fore >= 70 ? "border-amber-500" : "border-emerald-500";
  return (
    <div className="space-y-1">
      <div className="relative h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-visible">
        <div className={`h-3 rounded-full ${nowColor} transition-all`} style={{ width: `${Math.min(100, now)}%` }} />
        {fore > 0 && (
          <div className={`absolute top-0 h-3 rounded-full border-r-2 ${foreColor} opacity-60`} style={{ width: `${Math.min(100, fore)}%` }} />
        )}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>Now: {now}%</span>
        {fore > 0 && <span>30-day: {fore}%</span>}
      </div>
    </div>
  );
}

export default function CapacityPlanning() {
  const [tab, setTab] = useState("links");

  const { data: links, loading: linksLoading, error: linksError, refetch: refetchLinks } = useApi(() => network.capacity.links(), [], { pollingInterval: 120000 });
  const { data: summary, loading: sumLoading, refetch: refetchSum } = useApi(() => network.capacity.summary(), [], { pollingInterval: 120000 });

  const allLinks = links ?? [];
  const s = summary ?? {};

  const critical = allLinks.filter(l => l.status === "critical" || (l.utilization ?? l.current ?? 0) >= 90).length;
  const warn = allLinks.filter(l => l.status === "warn" || (l.utilization ?? l.current ?? 0) >= 70).length - critical;
  const ok = allLinks.length - critical - Math.max(0, warn);

  const maxUtil = Math.max(1, ...allLinks.map(l => l.capacity ?? l.bandwidth ?? 0));

  return (
    <div className="space-y-6">
      <PageHeader title="Capacity Planning" subtitle="Monitor link utilisation and plan infrastructure scaling"
        actions={<button onClick={() => { refetchLinks(); refetchSum(); }} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh</button>}
      />

      {(linksLoading || sumLoading) && allLinks.length === 0 ? (
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Critical Links" value={critical} icon={AlertTriangle} color="red" />
          <Stat label="Near Capacity" value={warn} icon={AlertCircle} color="amber" />
          <Stat label="Healthy Links" value={ok} icon={TrendingUp} color="emerald" />
        </div>
      )}

      {linksError && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{linksError}</div>}

      <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden w-fit">
        {["links", "summary"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm font-medium capitalize transition ${tab === t ? "bg-emerald-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{t}</button>
        ))}
      </div>

      {tab === "links" && (
        <Card>
          {linksLoading && allLinks.length === 0 ? <div className="p-5"><SkeletonTable rows={8} /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    {["Link / Interface", "From → To", "Current", "30-Day Forecast", "Capacity", "Status"].map(h => (
                      <th key={h} className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {allLinks.length === 0 ? (
                    <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-500">No capacity data available.</td></tr>
                  ) : allLinks.map((l, i) => {
                    const current = l.utilization ?? l.current ?? 0;
                    const forecast = l.forecast ?? l.forecastPct ?? 0;
                    return (
                      <tr key={l.id ?? i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="p-4">
                          <div className="font-medium text-slate-900 dark:text-white">{l.name ?? l.interface}</div>
                          {l.type && <div className="text-xs text-slate-400 capitalize">{l.type}</div>}
                        </td>
                        <td className="p-4 text-slate-500 text-xs">{l.from && l.to ? `${l.from} → ${l.to}` : (l.route ?? "—")}</td>
                        <td className="p-4 w-36"><UsageBar current={current} forecast={forecast} /></td>
                        <td className="p-4">
                          <span className={`text-sm font-semibold ${forecast >= 90 ? "text-red-600 dark:text-red-400" : forecast >= 70 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>{forecast}%</span>
                        </td>
                        <td className="p-4 text-slate-500">{l.capacity ?? l.bandwidth ?? "—"}</td>
                        <td className="p-4"><StatusBadge label={l.status ?? "ok"} variant={STATUS_VARIANT[l.status] ?? "success"} dot /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "summary" && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(s).filter(([, v]) => v != null && typeof v !== "object").map(([key, val]) => (
            <div key={key} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-1 capitalize">{key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{String(val)}</div>
            </div>
          ))}
          {Object.keys(s).length === 0 && !sumLoading && (
            <p className="col-span-3 text-sm text-slate-500 text-center py-8">No capacity summary data.</p>
          )}
          {sumLoading && <div className="col-span-3 p-4"><SkeletonTable rows={4} /></div>}
        </div>
      )}
    </div>
  );
}
