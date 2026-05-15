import { useMemo, useState } from "react";
import { useApi } from "../../hooks/useApi";
import { crm } from "../../services/api";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  TrendingUp, DollarSign, Target, Timer,
  AlertTriangle, CheckCircle2, Filter, RefreshCw, AlertCircle,
} from "lucide-react";

const STAGES = [
  { id: "lead",        label: "Lead In" },
  { id: "qualified",   label: "Qualified" },
  { id: "proposal",    label: "Proposal" },
  { id: "negotiation", label: "Negotiation" },
  { id: "commit",      label: "Commit" },
  { id: "won",         label: "Closed Won" },
];

function currency(n) {
  if (!n && n !== 0) return "—";
  return `$${Number(n).toLocaleString()}`;
}

const stageColors = {
  lead:        "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
  qualified:   "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  proposal:    "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800",
  negotiation: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
  commit:      "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
  won:         "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
};

export default function PipelineTracking() {
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");

  const { data: deals, loading, error, refetch } = useApi(
    () => crm.deals.list({ limit: 100 }), [], { pollingInterval: 60000 }
  );

  const owners = useMemo(() => {
    if (!deals) return [];
    return [...new Set(deals.map(d => d.owner).filter(Boolean))];
  }, [deals]);

  const filteredDeals = useMemo(() => {
    if (!deals) return [];
    return deals.filter(d => {
      if (ownerFilter !== "all" && d.owner !== ownerFilter) return false;
      if (stageFilter !== "all" && d.stage !== stageFilter) return false;
      return true;
    });
  }, [deals, ownerFilter, stageFilter]);

  const metrics = useMemo(() => {
    const pipelineValue    = filteredDeals.reduce((s, d) => s + (d.value ?? 0), 0);
    const weightedForecast = filteredDeals.reduce((s, d) => s + (d.value ?? 0) * (d.probability ?? 0), 0);
    const closedWon        = filteredDeals.filter(d => d.stage === "won");
    const winRate          = filteredDeals.length
      ? Math.round((closedWon.length / filteredDeals.length) * 100) : 0;
    const avgCycle         = filteredDeals.length
      ? Math.round(filteredDeals.reduce((s, d) => s + (d.daysInStage ?? 0), 0) / filteredDeals.length) : 0;
    return { pipelineValue, weightedForecast, winRate, avgCycle };
  }, [filteredDeals]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline Tracking"
        subtitle="End-to-end deal visibility, stage breakdown, forecasting, and execution control."
        actions={
          <button
            onClick={refetch}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Pipeline"    value={loading ? "…" : currency(metrics.pipelineValue)}              icon={DollarSign} color="indigo" />
        <Stat label="Weighted Forecast" value={loading ? "…" : currency(Math.round(metrics.weightedForecast))} icon={TrendingUp} color="emerald" />
        <Stat label="Win Rate"          value={loading ? "…" : `${metrics.winRate}%`}                          icon={Target}    color="amber" />
        <Stat label="Avg Cycle (days)"  value={loading ? "…" : metrics.avgCycle}                               icon={Timer}     color="sky" />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
          <button onClick={refetch} className="ml-auto text-xs hover:underline flex items-center gap-1"><RefreshCw size={11} /> Retry</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <Filter size={14} /> Filter:
        </span>
        <select
          value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">All Owners</option>
          {owners.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select
          value={stageFilter} onChange={e => setStageFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">All Stages</option>
          {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        {(ownerFilter !== "all" || stageFilter !== "all") && (
          <button
            onClick={() => { setOwnerFilter("all"); setStageFilter("all"); }}
            className="text-xs text-orange-600 dark:text-orange-400 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {loading && !deals ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
        </div>
      ) : filteredDeals.length > 0 ? (
        <>
          {/* Kanban Board */}
          <Card>
            <CardHeader title="Pipeline Board" icon={Target} />
            <CardBody>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {STAGES.map(stage => {
                  const stageDeals = filteredDeals.filter(d => d.stage === stage.id);
                  const stageValue = stageDeals.reduce((s, d) => s + (d.value ?? 0), 0);
                  return (
                    <div key={stage.id} className={`rounded-xl border flex-shrink-0 w-52 p-3 ${stageColors[stage.id] ?? "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{stage.label}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{stageDeals.length}</span>
                      </div>
                      {stageValue > 0 && (
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">{currency(stageValue)}</p>
                      )}
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {stageDeals.length === 0 ? (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center py-3">Empty</p>
                        ) : stageDeals.map(deal => (
                          <div key={deal.id} className="rounded-lg border border-white/70 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 shadow-sm">
                            <div className="flex items-start justify-between gap-1">
                              <p className="text-xs font-medium text-slate-900 dark:text-white leading-tight">{deal.name ?? deal.title}</p>
                              {deal.risk === "attention"
                                ? <AlertTriangle size={11} className="text-amber-500 shrink-0 mt-0.5" />
                                : <CheckCircle2 size={11} className="text-emerald-500 shrink-0 mt-0.5" />}
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{deal.owner ?? deal.rep}</p>
                            <div className="flex justify-between mt-1.5">
                              <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">{currency(deal.value ?? 0)}</span>
                              <span className="text-[10px] text-slate-500">{Math.round((deal.probability ?? 0) * 100)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {/* Deal Table */}
          <Card>
            <CardHeader title="Deal Execution Table" icon={TrendingUp} />
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      {["Deal", "Owner", "Stage", "Value", "Probability", "Days in Stage", "Risk"].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredDeals.map(d => (
                      <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">{d.name ?? d.title}</td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{d.owner ?? d.rep ?? "—"}</td>
                        <td className="py-3 px-3">{STAGES.find(s => s.id === d.stage)?.label ?? d.stage ?? "—"}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">{currency(d.value ?? 0)}</td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{Math.round((d.probability ?? 0) * 100)}%</td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{d.daysInStage ?? "—"}</td>
                        <td className="py-3 px-3">
                          {d.risk === "attention"
                            ? <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1"><AlertTriangle size={11} /> Attention</span>
                            : <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 size={11} /> Healthy</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          {/* Forecast summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Stat label="Commit"     value={currency(filteredDeals.filter(d => ["commit","won"].includes(d.stage)).reduce((s, d) => s + (d.value ?? 0), 0))}  icon={CheckCircle2} color="emerald" />
            <Stat label="Best Case"  value={currency(filteredDeals.filter(d => (d.probability ?? 0) >= 0.6).reduce((s, d) => s + (d.value ?? 0), 0))}          icon={TrendingUp}   color="amber" />
            <Stat label="Pipeline"   value={currency(metrics.pipelineValue)}                                                                                     icon={DollarSign}   color="indigo" />
          </div>
        </>
      ) : !loading && !error ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-10 text-center text-sm text-slate-500">
          No deals found for the selected filters.
        </div>
      ) : null}
    </div>
  );
}
