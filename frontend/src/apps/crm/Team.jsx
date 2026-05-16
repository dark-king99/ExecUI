import { useMemo, useState } from "react";
import {
  Users, Target, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Gauge, CalendarClock, Filter, Map, AlertCircle,
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { crm } from "../../services/api";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";

function currency(n) { return n != null ? `$${Number(n).toLocaleString()}` : "—"; }

export default function Team() {
  const [territoryFilter, setTerritoryFilter] = useState("all");

  const { data: reps, loading, error } = useApi(
    () => crm.reps.list({ limit: 200 }), [], { pollingInterval: 60000 }
  );

  const allReps = reps ?? [];

  const territories = useMemo(() =>
    ["all", ...new Set(allReps.map(r => r.territory).filter(Boolean))],
    [allReps]
  );

  const filtered = useMemo(() =>
    territoryFilter === "all" ? allReps : allReps.filter(r => r.territory === territoryFilter),
    [allReps, territoryFilter]
  );

  const metrics = useMemo(() => {
    const totalQuota    = filtered.reduce((s, r) => s + (r.quota    ?? 0), 0);
    const totalClosed   = filtered.reduce((s, r) => s + (r.closed   ?? 0), 0);
    const totalPipeline = filtered.reduce((s, r) => s + (r.pipeline ?? 0), 0);
    const avgVelocity   = filtered.length > 0
      ? (filtered.reduce((s, r) => s + (r.velocity ?? 0), 0) / filtered.length).toFixed(1) : 0;
    const attainment    = totalQuota > 0 ? Math.round((totalClosed / totalQuota) * 100) : 0;
    return { totalQuota, totalClosed, totalPipeline, avgVelocity, attainment };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Team Performance"
        subtitle="Quota attainment, execution velocity, coaching signals, and territory health."
      />

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Filter size={14} className="text-slate-500 dark:text-slate-400" />
        <select
          value={territoryFilter} onChange={e => setTerritoryFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {territories.map(t => <option key={t} value={t}>{t === "all" ? "All Territories" : t}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Stat label="Total Quota"      value={loading ? "…" : currency(metrics.totalQuota)}    icon={Target}       color="indigo" />
        <Stat label="Closed Revenue"   value={loading ? "…" : currency(metrics.totalClosed)}   icon={TrendingUp}   color="emerald" />
        <Stat label="Pipeline Coverage" value={loading ? "…" : currency(metrics.totalPipeline)} icon={Gauge}       color="amber" />
        <Stat label="Avg Velocity"     value={loading ? "…" : String(metrics.avgVelocity)}     icon={CalendarClock} color="sky" />
        <Stat label="Attainment"       value={loading ? "…" : `${metrics.attainment}%`}        icon={Users}        color="indigo" />
      </div>

      {/* Territory Health */}
      <Card>
        <CardHeader title="Territory Health" icon={Map} />
        <CardBody>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
              {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-700 rounded-lg" />)}
            </div>
          ) : territories.filter(t => t !== "all").length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No territory data available.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {territories.filter(t => t !== "all").map(t => {
                const repsInTerritory = allReps.filter(r => r.territory === t);
                const quota    = repsInTerritory.reduce((s, r) => s + (r.quota  ?? 0), 0);
                const closed   = repsInTerritory.reduce((s, r) => s + (r.closed ?? 0), 0);
                const attainment = quota > 0 ? Math.round((closed / quota) * 100) : 0;
                return (
                  <div key={t} className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{t}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{repsInTerritory.length} reps · Quota {currency(quota)}</p>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500 dark:text-slate-400">Attainment</span>
                        <span className={`font-semibold ${attainment >= 90 ? "text-emerald-600 dark:text-emerald-400" : attainment >= 70 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>{attainment}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${attainment >= 90 ? "bg-emerald-500" : attainment >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${Math.min(attainment, 100)}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Closed: {currency(closed)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Rep Scorecards */}
      <Card>
        <CardHeader title="Rep Scorecards" icon={Users} />
        <CardBody>
          {loading && allReps.length === 0 ? (
            <div className="space-y-2 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No reps found for this territory.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    {["Rep", "Territory", "Quota", "Closed", "Pipeline", "Attainment", "Velocity", "Cycle", "Coaching"].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map(r => {
                    const attainment = r.quota > 0 ? Math.round(((r.closed ?? 0) / r.quota) * 100) : 0;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">{r.name}</td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{r.territory ?? "—"}</td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{currency(r.quota)}</td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{currency(r.closed)}</td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{currency(r.pipeline)}</td>
                        <td className="py-3 px-3">
                          <span className={`font-semibold ${attainment >= 90 ? "text-emerald-600 dark:text-emerald-400" : attainment >= 70 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                            {attainment}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{r.velocity ?? "—"}</td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{r.avgCycle ?? "—"}</td>
                        <td className="py-3 px-3">
                          {r.coaching === "good"  && <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium"><CheckCircle2 size={12} /> On Track</span>}
                          {r.coaching === "watch" && <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium"><AlertTriangle size={12} /> Needs Focus</span>}
                          {r.coaching === "risk"  && <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium"><TrendingDown size={12} /> At Risk</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
