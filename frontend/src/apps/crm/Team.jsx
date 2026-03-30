import { useMemo, useState } from "react";
import {
  Users, Target, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Gauge, CalendarClock, Filter, Map, AlertCircle,
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { crm } from "../../services/api";

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
    const totalQuota   = filtered.reduce((s, r) => s + (r.quota  ?? 0), 0);
    const totalClosed  = filtered.reduce((s, r) => s + (r.closed ?? 0), 0);
    const totalPipeline = filtered.reduce((s, r) => s + (r.pipeline ?? 0), 0);
    const avgVelocity  = filtered.length > 0
      ? (filtered.reduce((s, r) => s + (r.velocity ?? 0), 0) / filtered.length).toFixed(1)
      : 0;
    const attainment = totalQuota > 0 ? Math.round((totalClosed / totalQuota) * 100) : 0;
    return { totalQuota, totalClosed, totalPipeline, avgVelocity, attainment };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-slate-900 dark:text-white font-semibold">Sales Team Performance</h1>
        <p className="text-slate-500">Quota attainment, execution velocity, coaching signals, and territory health.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-slate-500" />
        <select
          value={territoryFilter}
          onChange={e => setTerritoryFilter(e.target.value)}
          className="px-3 py-2 rounded border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
        >
          {territories.map(t => <option key={t} value={t}>{t === "all" ? "All Territories" : t}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 text-slate-900 dark:text-white gap-4">
        <KPI icon={Target}       label="Total Quota"      value={loading ? "…" : currency(metrics.totalQuota)} />
        <KPI icon={TrendingUp}   label="Closed Revenue"   value={loading ? "…" : currency(metrics.totalClosed)} />
        <KPI icon={Gauge}        label="Pipeline Coverage" value={loading ? "…" : currency(metrics.totalPipeline)} />
        <KPI icon={CalendarClock} label="Avg Velocity"    value={loading ? "…" : String(metrics.avgVelocity)} />
        <KPI icon={Users}        label="Attainment"       value={loading ? "…" : `${metrics.attainment}%`} />
      </div>
   
   <div className="border dark:border-slate-700 text-slate-900 dark:text-white">
      <Panel title="Territory Health" icon={Map}>
        {loading ? (
          <div className="grid grid-cols-4 dark:border-slate-700 gap-4 animate-pulse">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-700 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            {territories.filter(t => t !== "all").map(t => {
              const repsInTerritory = allReps.filter(r => r.territory === t);
              const quota   = repsInTerritory.reduce((s, r) => s + (r.quota  ?? 0), 0);
              const closed  = repsInTerritory.reduce((s, r) => s + (r.closed ?? 0), 0);
              const attainment = quota > 0 ? Math.round((closed / quota) * 100) : 0;
              return (
                <div key={t} className="rounded-lg border p-4 bg-white dark:bg-slate-900">
                  <div className="font-medium">{t}</div>
                  <div className="text-xs text-slate-500 mt-1">Quota: {currency(quota)}</div>
                  <div className="text-xs text-slate-500">Closed: {currency(closed)}</div>
                  <div className={`mt-2 font-semibold ${attainment >= 90 ? "text-emerald-600" : attainment >= 70 ? "text-amber-600" : "text-red-600"}`}>
                    {attainment}% Attainment
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
      

      <Panel title="Rep Scorecards" icon={Users}>
        {loading && allReps.length === 0 ? (
          <div className="space-y-2 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 text-left">
                <tr>
                  {["Rep","Territory","Quota","Closed","Pipeline","Attainment","Velocity","Cycle (days)","Coaching"].map(h => (
                    <th key={h} className="p-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const attainment = r.quota > 0 ? Math.round(((r.closed ?? 0) / r.quota) * 100) : 0;
                  return (
                    <tr key={r.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-950">
                      <td className="p-3 font-medium">{r.name}</td>
                      <td className="p-3">{r.territory}</td>
                      <td className="p-3">{currency(r.quota)}</td>
                      <td className="p-3">{currency(r.closed)}</td>
                      <td className="p-3">{currency(r.pipeline)}</td>
                      <td className="p-3">
                        <span className={attainment >= 90 ? "text-emerald-600" : attainment >= 70 ? "text-amber-600" : "text-red-600"}>
                          {attainment}%
                        </span>
                      </td>
                      <td className="p-3">{r.velocity}</td>
                      <td className="p-3">{r.avgCycle}</td>
                      <td className="p-3">
                        {r.coaching === "good" && <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-4 w-4" /> On Track</span>}
                        {r.coaching === "watch" && <span className="inline-flex items-center gap-1 text-amber-600"><AlertTriangle className="h-4 w-4" /> Needs Focus</span>}
                        {r.coaching === "risk" && <span className="inline-flex items-center gap-1 text-red-600"><TrendingDown className="h-4 w-4" /> At Risk</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!loading && filtered.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No reps found for this filter.</p>
            )}
          </div>
        )}
      </Panel>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
        <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <div className="rounded-xl border bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
        <div className="font-semibold">{title}</div>
      </div>
      {children}
    </div>
  );
}
