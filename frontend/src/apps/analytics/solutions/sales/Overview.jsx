import { Trophy, Clock, DollarSign, Briefcase, Target } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, BarList, Loading, fmtMoney, fmtNum } from "../../components/an-ui";

export default function Overview() {
  const { data: analytics, loading } = useApi(() => crm.analytics.summary(), [], { pollingInterval: 120000 });
  const { data: pipeline } = useApi(() => crm.pipeline.summary(), [], { pollingInterval: 120000 });
  const { data: opps } = useApi(() => crm.opportunities.summary(), [], { pollingInterval: 120000 });

  const a = analytics ?? {};
  const p = pipeline ?? {};
  const o = opps ?? {};
  const stages = (p.stages ?? []).filter((s) => !["Closed Won", "Closed Lost"].includes(s.stage));

  const metrics = [
    { label: "Open Pipeline", value: p.totalPipelineFmt ?? "—", icon: Briefcase, color: "orange" },
    { label: "Won Revenue", value: p.wonRevenueFmt ?? "—", icon: DollarSign, color: "emerald" },
    { label: "Win Rate", value: a.winRate ?? "—", icon: Trophy, color: "amber" },
    { label: "Avg Sales Cycle", value: a.avgSalesCycle ?? "—", icon: Clock, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="sales" title="Sales Overview" subtitle="Pipeline and performance across the CRM">
      <MetricGrid items={metrics} cols={4} loading={loading && !analytics} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Pipeline by Stage" subtitle="Open opportunity value" icon={Briefcase}>
          {!pipeline ? <Loading rows={3} /> : <BarList items={stages.map((s) => ({ label: s.stage, value: s.value, sub: `${s.count} deals` }))} color="orange" format={fmtMoney} />}
        </Section>
        <Section title="Key Metrics" icon={Target}>
          <div className="grid grid-cols-2 gap-3">
            {[["Open Opportunities", fmtNum(o.total ?? 0)], ["Pipeline Velocity", a.pipelineVelocity ?? "—"], ["Avg Deal Size", a.avgDealSizeFmt ?? "—"], ["Won", fmtNum(o.won ?? 0)]].map(([l, v]) => (
              <div key={l} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-center">
                <div className="text-xl font-bold text-slate-900 dark:text-white">{v}</div>
                <div className="text-xs text-slate-500 mt-1">{l}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </SolutionShell>
  );
}
