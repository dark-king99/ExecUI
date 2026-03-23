import { useMemo, useState } from "react";
import {
  Users,
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  CalendarClock,
  Filter,
  Map,
} from "lucide-react";

// --- Mock Enterprise Team Dataset ---
const REPS = [
  {
    id: 1,
    name: "Alice Johnson",
    territory: "North America",
    quota: 800000,
    closed: 520000,
    pipeline: 340000,
    dealsWon: 12,
    dealsOpen: 7,
    avgCycle: 38,
    velocity: 4.2,
    coaching: "good", // good | watch | risk
  },
  {
    id: 2,
    name: "Bob Smith",
    territory: "EMEA",
    quota: 600000,
    closed: 310000,
    pipeline: 220000,
    dealsWon: 7,
    dealsOpen: 9,
    avgCycle: 54,
    velocity: 2.9,
    coaching: "watch",
  },
  {
    id: 3,
    name: "Dana Patel",
    territory: "APAC",
    quota: 500000,
    closed: 460000,
    pipeline: 180000,
    dealsWon: 14,
    dealsOpen: 5,
    avgCycle: 31,
    velocity: 4.8,
    coaching: "good",
  },
  {
    id: 4,
    name: "Charlie Davis",
    territory: "Enterprise Strategic",
    quota: 1000000,
    closed: 420000,
    pipeline: 510000,
    dealsWon: 6,
    dealsOpen: 11,
    avgCycle: 67,
    velocity: 2.1,
    coaching: "risk",
  },
];

function currency(n) {
  return `$${n.toLocaleString()}`;
}

export default function Team() {
  const [territoryFilter, setTerritoryFilter] = useState("all");

  const filtered = useMemo(() => {
    return REPS.filter((r) =>
      territoryFilter === "all" ? true : r.territory === territoryFilter
    );
  }, [territoryFilter]);

  const metrics = useMemo(() => {
    const totalQuota = filtered.reduce((s, r) => s + r.quota, 0);
    const totalClosed = filtered.reduce((s, r) => s + r.closed, 0);
    const totalPipeline = filtered.reduce((s, r) => s + r.pipeline, 0);
    const avgVelocity =
      filtered.length > 0
        ? (
            filtered.reduce((s, r) => s + r.velocity, 0) / filtered.length
          ).toFixed(1)
        : 0;

    const attainment =
      totalQuota > 0 ? Math.round((totalClosed / totalQuota) * 100) : 0;

    return { totalQuota, totalClosed, totalPipeline, avgVelocity, attainment };
  }, [filtered]);

  const territories = useMemo(
    () => ["all", ...new Set(REPS.map((r) => r.territory))],
    []
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Sales Team Performance</h1>
        <p className="text-slate-500">
          Quota attainment, execution velocity, coaching signals, and territory health.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-slate-500" />
        <select
          value={territoryFilter}
          onChange={(e) => setTerritoryFilter(e.target.value)}
          className="px-3 py-2 rounded border bg-white dark:bg-slate-900"
        >
          {territories.map((t) => (
            <option key={t} value={t}>
              {t === "all" ? "All Territories" : t}
            </option>
          ))}
        </select>
      </div>

      {/* Exec KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPI icon={Target} label="Total Quota" value={currency(metrics.totalQuota)} />
        <KPI icon={TrendingUp} label="Closed Revenue" value={currency(metrics.totalClosed)} />
        <KPI icon={Gauge} label="Pipeline Coverage" value={currency(metrics.totalPipeline)} />
        <KPI icon={CalendarClock} label="Avg Velocity" value={`${metrics.avgVelocity}`} />
        <KPI
          icon={Users}
          label="Attainment"
          value={`${metrics.attainment}%`}
        />
      </div>

      {/* Territory Health */}
      <Panel title="Territory Health" icon={Map}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          {territories
            .filter((t) => t !== "all")
            .map((t) => {
              const reps = REPS.filter((r) => r.territory === t);
              const quota = reps.reduce((s, r) => s + r.quota, 0);
              const closed = reps.reduce((s, r) => s + r.closed, 0);
              const attainment = quota > 0 ? Math.round((closed / quota) * 100) : 0;

              return (
                <div key={t} className="rounded-lg border p-4">
                  <div className="font-medium">{t}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Quota: {currency(quota)}
                  </div>
                  <div className="text-xs text-slate-500">
                    Closed: {currency(closed)}
                  </div>
                  <div
                    className={`mt-2 font-semibold ${
                      attainment >= 90
                        ? "text-emerald-600"
                        : attainment >= 70
                        ? "text-amber-600"
                        : "text-red-600"
                    }`}
                  >
                    {attainment}% Attainment
                  </div>
                </div>
              );
            })}
        </div>
      </Panel>

      {/* Rep Scorecards */}
      <Panel title="Rep Scorecards" icon={Users}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800 text-left">
              <tr>
                <th className="p-3">Rep</th>
                <th className="p-3">Territory</th>
                <th className="p-3">Quota</th>
                <th className="p-3">Closed</th>
                <th className="p-3">Pipeline</th>
                <th className="p-3">Attainment</th>
                <th className="p-3">Velocity</th>
                <th className="p-3">Cycle (days)</th>
                <th className="p-3">Coaching</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const attainment = Math.round((r.closed / r.quota) * 100);
                return (
                  <tr
                    key={r.id}
                    className="border-t hover:bg-slate-50 dark:hover:bg-slate-950"
                  >
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3">{r.territory}</td>
                    <td className="p-3">{currency(r.quota)}</td>
                    <td className="p-3">{currency(r.closed)}</td>
                    <td className="p-3">{currency(r.pipeline)}</td>
                    <td className="p-3">
                      <span
                        className={
                          attainment >= 90
                            ? "text-emerald-600"
                            : attainment >= 70
                            ? "text-amber-600"
                            : "text-red-600"
                        }
                      >
                        {attainment}%
                      </span>
                    </td>
                    <td className="p-3">{r.velocity}</td>
                    <td className="p-3">{r.avgCycle}</td>
                    <td className="p-3">
                      {r.coaching === "good" && (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" /> On Track
                        </span>
                      )}
                      {r.coaching === "watch" && (
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <AlertTriangle className="h-4 w-4" /> Needs Focus
                        </span>
                      )}
                      {r.coaching === "risk" && (
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <TrendingDown className="h-4 w-4" /> At Risk
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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