import { HeartPulse, ShieldCheck, AlertTriangle, Activity } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useApi } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, fmtNum } from "../../components/net-ui";

const STATUS_VARIANT = { healthy: "success", "at-risk": "warning", degraded: "warning", breached: "danger" };

export default function ServiceHealth() {
  const { data: services, loading } = useApi(() => network.serviceHealth.list(), [], { pollingInterval: 60000 });
  const all = services ?? [];

  const metrics = [
    { label: "Services", value: fmtNum(all.length), icon: HeartPulse, color: "emerald" },
    { label: "Healthy", value: fmtNum(all.filter((s) => s.status === "healthy").length), icon: ShieldCheck, color: "emerald" },
    { label: "At Risk", value: fmtNum(all.filter((s) => s.status === "at-risk").length), icon: AlertTriangle, color: "amber" },
    { label: "Breached", value: fmtNum(all.filter((s) => s.status === "breached").length), icon: Activity, color: "red" },
  ];

  return (
    <SolutionShell solutionId="performance" title="Service Health" subtitle="SLA / SLO availability and error budgets by service">
      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      {loading && all.length === 0 ? <Loading rows={6} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {all.map((s) => (
            <div key={s.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{s.name}</h3>
                  <p className="text-xs text-slate-400">{s.team} · target {s.sloTarget ?? s.target}</p>
                </div>
                <StatusBadge label={s.status} variant={STATUS_VARIANT[s.status] ?? "neutral"} dot />
              </div>
              <div className="flex items-end justify-between mb-1">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{s.current ?? s.availability}%</span>
                <span className="text-xs text-slate-400">{s.uptime} uptime</span>
              </div>
              <div className="text-xs text-slate-500 mb-1.5">Error budget remaining</div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className={`h-full rounded-full ${(s.errorBudget ?? s.budget) > 50 ? "bg-emerald-500" : (s.errorBudget ?? s.budget) > 20 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, s.errorBudget ?? s.budget ?? 0)}%` }} />
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                <span>MTTR {s.mttr}</span>
                <span>{fmtNum(s.incidents30d ?? s.incidentCount)} incidents / 30d</span>
              </div>
            </div>
          ))}
          {all.length === 0 && <div className="col-span-full py-10 text-center text-sm text-slate-400">No services.</div>}
        </div>
      )}
    </SolutionShell>
  );
}
