import { useMemo, useState } from "react";
import {
  TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle2,
  BarChart3, PieChart, Users, CalendarClock, Filter, AlertCircle,
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { crm } from "../../services/api";

function currency(n) { return n != null ? `$${Number(n).toLocaleString()}` : "—"; }

export default function RevenueIntelligence() {
  const [ownerFilter, setOwnerFilter] = useState("all");

  const { data: deals, loading, error } = useApi(
    () => crm.deals.list({ limit: 500 }), [], { pollingInterval: 60000 }
  );

  const allDeals = deals ?? [];

  const owners = useMemo(() => ["all", ...new Set(allDeals.map(d => d.owner).filter(Boolean))], [allDeals]);

  const filtered = useMemo(() =>
    ownerFilter === "all" ? allDeals : allDeals.filter(d => d.owner === ownerFilter),
    [allDeals, ownerFilter]
  );

  const metrics = useMemo(() => {
    const open   = filtered.filter(d => !d.closed && d.stage !== "won" && d.stage !== "lost");
    const won    = filtered.filter(d => d.stage === "won"  || d.closed === true);
    const lost   = filtered.filter(d => d.stage === "lost");
    const pipelineValue = open.reduce((s, d) => s + (d.value ?? 0), 0);
    const weighted      = open.reduce((s, d) => s + (d.value ?? 0) * (d.probability ?? 0), 0);
    const winRate = won.length + lost.length > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
    const avgDealAge = open.length > 0 ? Math.round(open.reduce((s, d) => s + (d.age ?? 0), 0) / open.length) : 0;
    return { pipelineValue, weighted, winRate, avgDealAge };
  }, [filtered]);

  const byStage = useMemo(() => {
    const map = {};
    filtered.forEach(d => {
      if (!map[d.stage]) map[d.stage] = { count: 0, value: 0 };
      map[d.stage].count += 1;
      map[d.stage].value += d.value ?? 0;
    });
    return map;
  }, [filtered]);

  const byOwner = useMemo(() => {
    const map = {};
    filtered.forEach(d => {
      if (!map[d.owner]) map[d.owner] = { open: 0, won: 0, value: 0 };
      if (d.stage === "won") map[d.owner].won += 1;
      if (!d.closed && d.stage !== "won") map[d.owner].open += 1;
      map[d.owner].value += d.value ?? 0;
    });
    return map;
  }, [filtered]);

  const riskDeals = useMemo(() =>
    filtered.filter(d => !d.closed && d.stage !== "won" && ((d.daysInStage ?? 0) > 14 || (d.age ?? 0) > 60)),
    [filtered]
  );

  const forecastCategory = (cat) => filtered.filter(d => d.forecastCategory === cat).reduce((s, d) => s + (d.value ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-slate-900 dark:text-white font-semibold">Revenue Intelligence</h1>
        <p className="text-slate-500">Forecast accuracy, deal health, execution risk, and performance intelligence.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-slate-500" />
        <select
          value={ownerFilter}
          onChange={e => setOwnerFilter(e.target.value)}
          className="px-3 py-2 rounded border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
        >
          {owners.map(o => <option key={o} value={o}>{o === "all" ? "All Owners" : o}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 text-slate-900 dark:text-white gap-4">
        <KPI icon={BarChart3}    label="Open Pipeline"        value={loading ? "…" : currency(metrics.pipelineValue)} />
        <KPI icon={Target}       label="Weighted Forecast"    value={loading ? "…" : currency(Math.round(metrics.weighted))} />
        <KPI icon={TrendingUp}   label="Win Rate"             value={loading ? "…" : `${metrics.winRate}%`} />
        <KPI icon={CalendarClock} label="Avg Deal Age (days)" value={loading ? "…" : metrics.avgDealAge} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 text-slate-900 dark:text-white gap-4">
        {["commit", "best", "pipeline"].map(cat => (
          <ForecastBox key={cat} title={cat === "best" ? "Best Case" : cat.charAt(0).toUpperCase() + cat.slice(1)} value={currency(forecastCategory(cat))} />
        ))}
        <ForecastBox title="Closed" value={currency(filtered.filter(d => d.closed || d.stage === "won").reduce((s, d) => s + (d.value ?? 0), 0))} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 text-slate-400 gap-6">
        <Panel title="Stage Distribution" icon={PieChart}>
          <div className="space-y-3">
            {Object.entries(byStage).map(([s, data]) => (
              <div key={s} className="flex items-center justify-between text-sm">
                <span className="capitalize text-slate-600 dark:text-slate-400">{s}</span>
                <span className="font-medium">{data.count} deals · {currency(data.value)}</span>
              </div>
            ))}
            {Object.keys(byStage).length === 0 && !loading && (
              <p className="text-sm text-slate-400">No stage data available.</p>
            )}
          </div>
        </Panel>

        <Panel title="Rep Performance" icon={Users}>
          <div className="space-y-3">
            {Object.entries(byOwner).map(([owner, stats]) => (
              <div key={owner} className="flex items-center justify-between text-sm">
                <span className="font-medium">{owner}</span>
                <span className="text-slate-600 dark:text-slate-400">
                  Open: {stats.open} · Won: {stats.won} · Value: {currency(stats.value)}
                </span>
              </div>
            ))}
            {Object.keys(byOwner).length === 0 && !loading && (
              <p className="text-sm text-slate-400">No rep data available.</p>
            )}
          </div>
        </Panel>
      </div>
      <div className="text-slate-400">
      <Panel title="Execution Risk Radar" icon={AlertTriangle}>
        {riskDeals.length === 0 && !loading ? (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm">
            <CheckCircle2 className="h-4 w-4" /> No high-risk deals detected
          </div>
        ) : (
          <div className="space-y-2">
            {riskDeals.map(d => (
              <div key={d.id} className="flex items-center justify-between rounded border p-3 bg-amber-50 dark:bg-amber-900/20">
                <div>
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-slate-500">{d.owner} · Stage: {d.stage} · Age: {d.age} days</div>
                </div>
                <div className="text-amber-600 dark:text-amber-400 flex items-center gap-1 text-sm">
                  <TrendingDown className="h-4 w-4" /> Risk
                </div>
              </div>
            ))}
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

function ForecastBox({ title, value }) {
  return (
    <div className="rounded-xl border bg-white dark:bg-slate-900 p-4">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <div className="rounded-xl border bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        <div className="font-semibold">{title}</div>
      </div>
      {children}
    </div>
  );
}
