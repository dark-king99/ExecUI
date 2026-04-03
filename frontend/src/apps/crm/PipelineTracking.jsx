import { useMemo, useState } from "react";
import { useApi } from "../../hooks/useApi";
import { crm } from "../../services/api";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import {
  TrendingUp, DollarSign, Target, Timer,
  AlertTriangle, CheckCircle2, Filter, RefreshCw,
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
  return `$${Number(n).toLocaleString()}`;
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3">
      <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline">
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}

export default function PipelineTracking() {
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");

  const {
    data: deals,
    loading,
    error,
    refetch,
  } = useApi(() => crm.deals.list({ limit: 100 }), [], { pollingInterval: 60000 });

  const owners = useMemo(() => {
    if (!deals) return [];
    return [...new Set(deals.map((d) => d.owner).filter(Boolean))];
  }, [deals]);

  const filteredDeals = useMemo(() => {
    if (!deals) return [];
    return deals.filter((d) => {
      if (ownerFilter !== "all" && d.owner !== ownerFilter) return false;
      if (stageFilter !== "all" && d.stage !== stageFilter) return false;
      return true;
    });
  }, [deals, ownerFilter, stageFilter]);

  const metrics = useMemo(() => {
    const pipelineValue    = filteredDeals.reduce((s, d) => s + (d.value ?? 0), 0);
    const weightedForecast = filteredDeals.reduce((s, d) => s + (d.value ?? 0) * (d.probability ?? 0), 0);
    const closedWon        = filteredDeals.filter((d) => d.stage === "won");
    const winRate          = filteredDeals.length
      ? Math.round((closedWon.length / filteredDeals.length) * 100)
      : 0;
    const avgCycle         = filteredDeals.length
      ? Math.round(filteredDeals.reduce((s, d) => s + (d.daysInStage ?? 0), 0) / filteredDeals.length)
      : 0;
    return { pipelineValue, weightedForecast, winRate, avgCycle };
  }, [filteredDeals]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-slate-900 dark:text-white font-semibold">Pipeline Tracking</h1>
          <p className="text-slate-500">End-to-end deal visibility, forecasting, and execution control.</p>
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* KPI Row */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 border border-slate-200 dark:border-slate-800 rounded gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 rounded gap-4">
          <KPI icon={DollarSign} label="Total Pipeline"    value={currency(metrics.pipelineValue)} />
          <KPI icon={TrendingUp} label="Weighted Forecast" value={currency(Math.round(metrics.weightedForecast))} />
          <KPI icon={Target}     label="Win Rate"          value={`${metrics.winRate}%`} />
          <KPI icon={Timer}      label="Avg Cycle (days)"  value={metrics.avgCycle} />
        </div>
      )}

      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Filter className="h-4 w-4" /> Filters:
        </div>
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="px-3 py-2 rounded border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
        >
          <option value="all">All Owners</option>
          {owners.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="px-3 py-2 rounded border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm text-slate-900 dark:text-white "
        >
          <option value="all">All Stages</option>
          {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {loading ? (
        <SkeletonTable rows={5} />
      ) : filteredDeals.length > 0 ? (
        <>
          {/* Pipeline Board */}
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 overflow-x-auto">
            {STAGES.map((stage) => (
              <div key={stage.id} className="rounded-xl border bg-white dark:bg-slate-900 p-3 min-w-[220px]">
                <div className="font-semibold mb-2 text-sm">{stage.label}</div>
                <div className="space-y-2">
                  {filteredDeals.filter((d) => d.stage === stage.id).map((deal) => (
                    <div key={deal.id} className="rounded-lg border p-3 bg-slate-50 dark:bg-slate-950">
                      <div className="flex items-start justify-between">
                        <div className="font-medium text-sm">{deal.name}</div>
                        {deal.risk === "attention"
                          ? <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                          : <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{deal.owner}</div>
                      <div className="flex justify-between text-xs mt-2">
                        <span>{currency(deal.value ?? 0)}</span>
                        <span>{Math.round((deal.probability ?? 0) * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Deal Table */}
          <div className="rounded-xl border bg-white dark:bg-slate-900">
            <div className="p-4 font-semibold">Deal Execution Table</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800 text-left">
                  <tr>
                    {["Deal","Owner","Stage","Value","Probability","Days in Stage","Risk"].map((h) => (
                      <th key={h} className="p-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDeals.map((d) => (
                    <tr key={d.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-950">
                      <td className="p-3 font-medium">{d.name}</td>
                      <td className="p-3">{d.owner}</td>
                      <td className="p-3">{STAGES.find((s) => s.id === d.stage)?.label ?? d.stage}</td>
                      <td className="p-3">{currency(d.value ?? 0)}</td>
                      <td className="p-3">{Math.round((d.probability ?? 0) * 100)}%</td>
                      <td className="p-3">{d.daysInStage ?? "—"}</td>
                      <td className="p-3">
                        {d.risk === "attention"
                          ? <span className="text-amber-600">Attention</span>
                          : <span className="text-emerald-600">Healthy</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Forecast Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ForecastCard
              title="Commit"
              value={currency(filteredDeals.filter((d) => d.stage === "commit" || d.stage === "won").reduce((s, d) => s + (d.value ?? 0), 0))}
            />
            <ForecastCard
              title="Best Case"
              value={currency(filteredDeals.filter((d) => (d.probability ?? 0) >= 0.6).reduce((s, d) => s + (d.value ?? 0), 0))}
            />
            <ForecastCard title="Pipeline" value={currency(metrics.pipelineValue)} />
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

function KPI({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
        <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-lg text-slate-900 dark:text-white font-semibold">{value}</div>
      </div>
    </div>
  );
}

function ForecastCard({ title, value }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="text-2xl text-slate-900 dark:text-white font-semibold mt-1">{value}</div>
    </div>
  );
}
