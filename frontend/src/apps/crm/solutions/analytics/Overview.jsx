import { BarChart3, Trophy, Clock, DollarSign, Target } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, BarList, Loading, fmtMoney, fmtNum } from "../../components/crm-ui";

export default function Overview() {
  const { data: summary, loading } = useApi(() => crm.analytics.summary(), [], { pollingInterval: 120000 });
  const { data: funnel } = useApi(() => crm.analytics.funnel(), [], { pollingInterval: 120000 });

  const s = summary ?? {};
  const f = funnel ?? [];

  const metrics = [
    { label: "Win Rate", value: s.winRate ?? "—", icon: Trophy, color: "blue" },
    { label: "Avg Sales Cycle", value: s.avgSalesCycle ?? "—", icon: Clock, color: "sky" },
    { label: "Avg Deal Size", value: s.avgDealSizeFmt ?? "—", icon: DollarSign, color: "emerald" },
    { label: "Total Opportunities", value: fmtNum(s.totalOpps ?? 0), icon: Target, color: "amber" },
  ];

  return (
    <SolutionShell solutionId="analytics" title="Analytics Overview" subtitle="Headline sales performance metrics at a glance">
      <MetricGrid items={metrics} cols={4} loading={loading && !summary} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Pipeline by Stage — Count" icon={BarChart3}>
          {!funnel ? <Loading rows={3} /> : <BarList items={f.map((x) => ({ label: x.stage, value: x.count }))} color="blue" format={fmtNum} />}
        </Section>
        <Section title="Pipeline by Stage — Value" icon={DollarSign}>
          {!funnel ? <Loading rows={3} /> : <BarList items={f.map((x) => ({ label: x.stage, value: x.value }))} color="sky" format={fmtMoney} />}
        </Section>
      </div>
    </SolutionShell>
  );
}
