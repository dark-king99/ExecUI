import { useMemo, useState } from "react";
import {
  TrendingUp,
  DollarSign,
  Target,
  Timer,
  AlertTriangle,
  CheckCircle2,
  Filter,
} from "lucide-react";

const STAGES = [
  { id: "lead", label: "Lead In" },
  { id: "qualified", label: "Qualified" },
  { id: "proposal", label: "Proposal" },
  { id: "negotiation", label: "Negotiation" },
  { id: "commit", label: "Commit" },
  { id: "won", label: "Closed Won" },
];

const DEALS = [
  {
    id: 1,
    name: "Acme Industries — Platform Rollout",
    owner: "Alice Johnson",
    value: 120000,
    stage: "proposal",
    probability: 0.6,
    daysInStage: 8,
    risk: "normal",
  },
  {
    id: 2,
    name: "Globex Corp — Security Suite",
    owner: "Bob Smith",
    value: 240000,
    stage: "negotiation",
    probability: 0.75,
    daysInStage: 14,
    risk: "attention",
  },
  {
    id: 3,
    name: "Initech — CRM Expansion",
    owner: "Dana Patel",
    value: 56000,
    stage: "commit",
    probability: 0.9,
    daysInStage: 5,
    risk: "normal",
  },
  {
    id: 4,
    name: "Umbrella Group — Network Upgrade",
    owner: "Charlie Davis",
    value: 310000,
    stage: "qualified",
    probability: 0.4,
    daysInStage: 21,
    risk: "attention",
  },
  {
    id: 5,
    name: "Soylent Systems — Marketing Stack",
    owner: "Alice Johnson",
    value: 88000,
    stage: "won",
    probability: 1,
    daysInStage: 0,
    risk: "normal",
  },
];

function currency(n) {
  return `$${n.toLocaleString()}`;
}

export default function PipelineTracking() {
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");

  const filteredDeals = useMemo(() => {
    return DEALS.filter((d) => {
      if (ownerFilter !== "all" && d.owner !== ownerFilter) return false;
      if (stageFilter !== "all" && d.stage !== stageFilter) return false;
      return true;
    });
  }, [ownerFilter, stageFilter]);

  const metrics = useMemo(() => {
    const pipelineValue = filteredDeals.reduce((s, d) => s + d.value, 0);
    const weightedForecast = filteredDeals.reduce(
      (s, d) => s + d.value * d.probability,
      0
    );
    const closedWon = filteredDeals.filter((d) => d.stage === "won");
    const winRate =
      filteredDeals.length > 0
        ? Math.round((closedWon.length / filteredDeals.length) * 100)
        : 0;
    const avgCycle =
      filteredDeals.length > 0
        ? Math.round(
            filteredDeals.reduce((s, d) => s + d.daysInStage, 0) /
              filteredDeals.length
          )
        : 0;

    return { pipelineValue, weightedForecast, winRate, avgCycle };
  }, [filteredDeals]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Pipeline Tracking</h1>
        <p className="text-slate-500">
          End-to-end deal visibility, forecasting, and execution control.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPI
          icon={DollarSign}
          label="Total Pipeline"
          value={currency(metrics.pipelineValue)}
        />
        <KPI
          icon={TrendingUp}
          label="Weighted Forecast"
          value={currency(Math.round(metrics.weightedForecast))}
        />
        <KPI icon={Target} label="Win Rate" value={`${metrics.winRate}%`} />
        <KPI icon={Timer} label="Avg Cycle (days)" value={metrics.avgCycle} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Filter className="h-4 w-4" />
          Filters:
        </div>
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="px-3 py-2 rounded border bg-white dark:bg-slate-900"
        >
          <option value="all">All Owners</option>
          {[...new Set(DEALS.map((d) => d.owner))].map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="px-3 py-2 rounded border bg-white dark:bg-slate-900"
        >
          <option value="all">All Stages</option>
          {STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Pipeline Board */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 overflow-x-auto">
        {STAGES.map((stage) => (
          <div
            key={stage.id}
            className="rounded-xl border bg-white dark:bg-slate-900 p-3 min-w-[220px]"
          >
            <div className="font-semibold mb-2 text-sm">{stage.label}</div>
            <div className="space-y-2">
              {filteredDeals
                .filter((d) => d.stage === stage.id)
                .map((deal) => (
                  <div
                    key={deal.id}
                    className="rounded-lg border p-3 bg-slate-50 dark:bg-slate-950"
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-medium text-sm">{deal.name}</div>
                      {deal.risk === "attention" ? (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {deal.owner}
                    </div>
                    <div className="flex justify-between text-xs mt-2">
                      <span>{currency(deal.value)}</span>
                      <span>{Math.round(deal.probability * 100)}%</span>
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
                <th className="p-3">Deal</th>
                <th className="p-3">Owner</th>
                <th className="p-3">Stage</th>
                <th className="p-3">Value</th>
                <th className="p-3">Probability</th>
                <th className="p-3">Days in Stage</th>
                <th className="p-3">Risk</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.map((d) => (
                <tr
                  key={d.id}
                  className="border-t hover:bg-slate-50 dark:hover:bg-slate-950"
                >
                  <td className="p-3 font-medium">{d.name}</td>
                  <td className="p-3">{d.owner}</td>
                  <td className="p-3">
                    {STAGES.find((s) => s.id === d.stage)?.label}
                  </td>
                  <td className="p-3">{currency(d.value)}</td>
                  <td className="p-3">{Math.round(d.probability * 100)}%</td>
                  <td className="p-3">{d.daysInStage}</td>
                  <td className="p-3">
                    {d.risk === "attention" ? (
                      <span className="text-amber-600">Attention</span>
                    ) : (
                      <span className="text-emerald-600">Healthy</span>
                    )}
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
          value={currency(
            filteredDeals
              .filter((d) => d.stage === "commit" || d.stage === "won")
              .reduce((s, d) => s + d.value, 0)
          )}
        />
        <ForecastCard
          title="Best Case"
          value={currency(
            filteredDeals
              .filter((d) => d.probability >= 0.6)
              .reduce((s, d) => s + d.value, 0)
          )}
        />
        <ForecastCard
          title="Pipeline"
          value={currency(metrics.pipelineValue)}
        />
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

function ForecastCard({ title, value }) {
  return (
    <div className="rounded-xl border bg-white dark:bg-slate-900 p-4">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}