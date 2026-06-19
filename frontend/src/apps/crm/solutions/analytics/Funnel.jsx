import { LineChart, Clock, DollarSign, Trophy, Filter } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, fmtMoney, fmtNum } from "../../components/crm-ui";

export default function Funnel() {
  const { data: funnel, loading } = useApi(() => crm.analytics.funnel(), [], { pollingInterval: 120000 });
  const { data: velocity } = useApi(() => crm.analytics.velocity(), [], { pollingInterval: 120000 });

  const f = funnel ?? [];
  const v = velocity ?? {};
  const top = f[0]?.count || 1;

  const metrics = [
    { label: "Avg Deal Size", value: v.avgDealSizeFmt ?? "—", icon: DollarSign, color: "blue" },
    { label: "Avg Cycle", value: v.avgCycleDays != null ? `${v.avgCycleDays}d` : "—", icon: Clock, color: "sky" },
    { label: "Win Rate", value: v.winRate != null ? `${v.winRate}%` : "—", icon: Trophy, color: "emerald" },
    { label: "Stages", value: fmtNum(f.length), icon: Filter, color: "amber" },
  ];

  return (
    <SolutionShell solutionId="analytics" title="Funnel & Velocity" subtitle="Conversion through each stage and how fast deals move">
      <MetricGrid items={metrics} cols={4} loading={loading && !funnel} />

      <Section title="Conversion Funnel" subtitle="Deal count by stage with stage-to-stage conversion" icon={LineChart}>
        {loading && !funnel ? <Loading rows={4} /> : (
          <div className="space-y-3">
            {f.map((stage, i) => {
              const width = Math.max(8, (stage.count / top) * 100);
              const prev = f[i - 1]?.count;
              const conv = prev ? Math.round((stage.count / prev) * 100) : null;
              return (
                <div key={stage.stage}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-600 dark:text-slate-300">{stage.stage}</span>
                    <span className="text-slate-400">{fmtNum(stage.count)} deals · {fmtMoney(stage.value)}{conv != null && <span className="ml-2 text-blue-500">{conv}%</span>}</span>
                  </div>
                  <div className="h-7 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center px-3" style={{ width: `${width}%` }}>
                      <span className="text-[11px] font-semibold text-white">{fmtNum(stage.count)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {f.length === 0 && <div className="py-6 text-center text-sm text-slate-400">No funnel data.</div>}
          </div>
        )}
      </Section>
    </SolutionShell>
  );
}
