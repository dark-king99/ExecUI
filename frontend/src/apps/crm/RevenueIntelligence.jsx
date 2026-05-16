import { useMemo, useState } from "react";
import {
  TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle2,
  BarChart3, PieChart, Users, CalendarClock, Filter, AlertCircle,
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { crm } from "../../services/api";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";

function currency(n) { return n != null ? `$${Number(n).toLocaleString()}` : "—"; }

export default function RevenueIntelligence() {
  const [ownerFilter, setOwnerFilter] = useState("all");

  const { data: deals, loading, error } = useApi(
    () => crm.deals.list({ limit: 500 }), [], { pollingInterval: 60000 }
  );

  const allDeals = deals ?? [];

  const owners = useMemo(() =>
    ["all", ...new Set(allDeals.map(d => d.owner).filter(Boolean))],
    [allDeals]
  );

  const filtered = useMemo(() =>
    ownerFilter === "all" ? allDeals : allDeals.filter(d => d.owner === ownerFilter),
    [allDeals, ownerFilter]
  );

  const metrics = useMemo(() => {
    const open          = filtered.filter(d => !d.closed && d.stage !== "won" && d.stage !== "lost");
    const won           = filtered.filter(d => d.stage === "won"  || d.closed === true);
    const lost          = filtered.filter(d => d.stage === "lost");
    const pipelineValue = open.reduce((s, d) => s + (d.value ?? 0), 0);
    const weighted      = open.reduce((s, d) => s + (d.value ?? 0) * (d.probability ?? 0), 0);
    const winRate       = won.length + lost.length > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
    const avgDealAge    = open.length > 0 ? Math.round(open.reduce((s, d) => s + (d.age ?? 0), 0) / open.length) : 0;
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

  const forecastCategory = (cat) =>
    filtered.filter(d => d.forecastCategory === cat).reduce((s, d) => s + (d.value ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue Intelligence"
        subtitle="Forecast accuracy, deal health, execution risk, and performance intelligence."
      />

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Filter size={14} className="text-slate-500 dark:text-slate-400" />
        <select
          value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {owners.map(o => <option key={o} value={o}>{o === "all" ? "All Owners" : o}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Open Pipeline"      value={loading ? "…" : currency(metrics.pipelineValue)}          icon={BarChart3}    color="indigo" />
        <Stat label="Weighted Forecast"  value={loading ? "…" : currency(Math.round(metrics.weighted))}   icon={Target}       color="emerald" />
        <Stat label="Win Rate"           value={loading ? "…" : `${metrics.winRate}%`}                    icon={TrendingUp}   color="amber" />
        <Stat label="Avg Deal Age (days)" value={loading ? "…" : metrics.avgDealAge}                      icon={CalendarClock} color="sky" />
      </div>

      {/* Forecast Categories */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { cat: "commit",   label: "Commit" },
          { cat: "best",     label: "Best Case" },
          { cat: "pipeline", label: "Pipeline" },
          { cat: null,       label: "Closed Won" },
        ].map(({ cat, label }) => {
          const val = cat
            ? forecastCategory(cat)
            : filtered.filter(d => d.closed || d.stage === "won").reduce((s, d) => s + (d.value ?? 0), 0);
          return (
            <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{currency(val)}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage Distribution */}
        <Card>
          <CardHeader title="Stage Distribution" icon={PieChart} />
          <CardBody>
            <div className="space-y-3">
              {Object.entries(byStage).map(([s, data]) => (
                <div key={s} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-slate-700 dark:text-slate-300">{s}</span>
                  <span className="font-medium text-slate-900 dark:text-white">{data.count} deals · {currency(data.value)}</span>
                </div>
              ))}
              {Object.keys(byStage).length === 0 && !loading && (
                <p className="text-sm text-slate-500 dark:text-slate-400">No stage data available.</p>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Rep Performance */}
        <Card>
          <CardHeader title="Rep Performance" icon={Users} />
          <CardBody>
            <div className="space-y-3">
              {Object.entries(byOwner).map(([owner, stats]) => (
                <div key={owner} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-900 dark:text-white">{owner}</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    Open: {stats.open} · Won: {stats.won} · {currency(stats.value)}
                  </span>
                </div>
              ))}
              {Object.keys(byOwner).length === 0 && !loading && (
                <p className="text-sm text-slate-500 dark:text-slate-400">No rep data available.</p>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Execution Risk Radar */}
      <Card>
        <CardHeader title="Execution Risk Radar" icon={AlertTriangle} />
        <CardBody>
          {riskDeals.length === 0 && !loading ? (
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm">
              <CheckCircle2 size={16} /> No high-risk deals detected — pipeline looks healthy.
            </div>
          ) : (
            <div className="space-y-2">
              {riskDeals.map(d => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border border-amber-200 dark:border-amber-800 p-3 bg-amber-50 dark:bg-amber-900/20">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white text-sm">{d.name ?? d.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {d.owner ?? "—"} · Stage: {d.stage ?? "—"} · Age: {d.age ?? "?"} days
                    </p>
                  </div>
                  <div className="text-amber-600 dark:text-amber-400 flex items-center gap-1 text-xs font-semibold">
                    <TrendingDown size={14} /> At Risk
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
