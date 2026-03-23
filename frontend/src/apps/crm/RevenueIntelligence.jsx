import { useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  PieChart,
  Users,
  CalendarClock,
  Filter,
} from "lucide-react";

// --- Mock enterprise dataset (structure mirrors real CRM) ---
const STAGES = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "commit",
  "won",
  "lost",
];

const DEALS = [
  {
    id: 1,
    name: "Acme — Platform Rollout",
    owner: "Alice Johnson",
    value: 120000,
    stage: "proposal",
    probability: 0.6,
    daysInStage: 8,
    age: 34,
    forecastCategory: "best",
    closed: false,
  },
  {
    id: 2,
    name: "Globex — Security Suite",
    owner: "Bob Smith",
    value: 240000,
    stage: "negotiation",
    probability: 0.75,
    daysInStage: 14,
    age: 61,
    forecastCategory: "commit",
    closed: false,
  },
  {
    id: 3,
    name: "Initech — CRM Expansion",
    owner: "Dana Patel",
    value: 56000,
    stage: "commit",
    probability: 0.9,
    daysInStage: 5,
    age: 28,
    forecastCategory: "commit",
    closed: false,
  },
  {
    id: 4,
    name: "Umbrella — Network Upgrade",
    owner: "Charlie Davis",
    value: 310000,
    stage: "qualified",
    probability: 0.4,
    daysInStage: 21,
    age: 92,
    forecastCategory: "pipeline",
    closed: false,
  },
  {
    id: 5,
    name: "Soylent — Marketing Stack",
    owner: "Alice Johnson",
    value: 88000,
    stage: "won",
    probability: 1,
    daysInStage: 0,
    age: 44,
    forecastCategory: "closed",
    closed: true,
  },
  {
    id: 6,
    name: "Hooli — Data Platform",
    owner: "Bob Smith",
    value: 180000,
    stage: "lost",
    probability: 0,
    daysInStage: 0,
    age: 73,
    forecastCategory: "closed",
    closed: true,
  },
];

function currency(n) {
  return `$${n.toLocaleString()}`;
}

export default function RevenueIntelligence() {
  const [ownerFilter, setOwnerFilter] = useState("all");

  const filtered = useMemo(() => {
    return DEALS.filter((d) => (ownerFilter === "all" ? true : d.owner === ownerFilter));
  }, [ownerFilter]);

  const metrics = useMemo(() => {
    const open = filtered.filter((d) => !d.closed);
    const won = filtered.filter((d) => d.stage === "won");
    const lost = filtered.filter((d) => d.stage === "lost");

    const pipelineValue = open.reduce((s, d) => s + d.value, 0);
    const weighted = open.reduce((s, d) => s + d.value * d.probability, 0);
    const winRate =
      won.length + lost.length > 0
        ? Math.round((won.length / (won.length + lost.length)) * 100)
        : 0;

    const avgDealAge =
      open.length > 0
        ? Math.round(open.reduce((s, d) => s + d.age, 0) / open.length)
        : 0;

    return { pipelineValue, weighted, winRate, avgDealAge };
  }, [filtered]);

  const byStage = useMemo(() => {
    const map = {};
    STAGES.forEach((s) => (map[s] = { count: 0, value: 0 }));
    filtered.forEach((d) => {
      if (!map[d.stage]) return;
      map[d.stage].count += 1;
      map[d.stage].value += d.value;
    });
    return map;
  }, [filtered]);

  const byOwner = useMemo(() => {
    const map = {};
    filtered.forEach((d) => {
      if (!map[d.owner]) {
        map[d.owner] = { open: 0, won: 0, value: 0 };
      }
      if (d.stage === "won") map[d.owner].won += 1;
      if (!d.closed) map[d.owner].open += 1;
      map[d.owner].value += d.value;
    });
    return map;
  }, [filtered]);

  const riskDeals = useMemo(() => {
    return filtered.filter((d) => !d.closed && (d.daysInStage > 14 || d.age > 60));
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Revenue Intelligence</h1>
        <p className="text-slate-500">
          Forecast accuracy, deal health, execution risk, and performance intelligence.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-slate-500" />
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
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPI icon={BarChart3} label="Open Pipeline" value={currency(metrics.pipelineValue)} />
        <KPI icon={Target} label="Weighted Forecast" value={currency(Math.round(metrics.weighted))} />
        <KPI icon={TrendingUp} label="Win Rate" value={`${metrics.winRate}%`} />
        <KPI icon={CalendarClock} label="Avg Deal Age (days)" value={metrics.avgDealAge} />
      </div>

      {/* Forecast Categories */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ForecastBox title="Commit" value={currency(filtered.filter(d => d.forecastCategory === "commit").reduce((s,d)=>s+d.value,0))} />
        <ForecastBox title="Best Case" value={currency(filtered.filter(d => d.forecastCategory === "best").reduce((s,d)=>s+d.value,0))} />
        <ForecastBox title="Pipeline" value={currency(filtered.filter(d => d.forecastCategory === "pipeline").reduce((s,d)=>s+d.value,0))} />
        <ForecastBox title="Closed" value={currency(filtered.filter(d => d.closed).reduce((s,d)=>s+d.value,0))} />
      </div>

      {/* Stage Conversion & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Stage Distribution" icon={PieChart}>
          <div className="space-y-3">
            {STAGES.map((s) => (
              <div key={s} className="flex items-center justify-between text-sm">
                <span className="capitalize text-slate-600 dark:text-slate-400">{s}</span>
                <span className="font-medium">
                  {byStage[s].count} deals · {currency(byStage[s].value)}
                </span>
              </div>
            ))}
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
          </div>
        </Panel>
      </div>

      {/* Risk Radar */}
      <Panel title="Execution Risk Radar" icon={AlertTriangle}>
        {riskDeals.length === 0 ? (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm">
            <CheckCircle2 className="h-4 w-4" /> No high-risk deals detected
          </div>
        ) : (
          <div className="space-y-2">
            {riskDeals.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded border p-3 bg-amber-50 dark:bg-amber-900/20"
              >
                <div>
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-slate-500">
                    {d.owner} · Stage: {d.stage} · Age: {d.age} days
                  </div>
                </div>
                <div className="text-amber-600 dark:text-amber-400 flex items-center gap-1 text-sm">
                  <TrendingDown className="h-4 w-4" /> Risk
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Forecast Accuracy (Historical-style) */}
      <Panel title="Forecast Accuracy (Simulated)" icon={Target}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <AccuracyBox label="Last Quarter Commit Accuracy" value="92%" good />
          <AccuracyBox label="Last Quarter Best Case Accuracy" value="81%" />
          <AccuracyBox label="Pipeline Slippage Rate" value="14%" warn />
        </div>
      </Panel>
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

function AccuracyBox({ label, value, good, warn }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div
        className={`text-2xl font-semibold mt-1 ${
          good
            ? "text-emerald-600"
            : warn
            ? "text-amber-600"
            : "text-indigo-600"
        }`}
      >
        {value}
      </div>
    </div>
  );
}