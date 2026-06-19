import { TrendingUp, Trophy, Clock, DollarSign, Sparkles, ThumbsDown } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, BarList, Loading, fmtMoney, fmtNum } from "../../components/crm-ui";

export default function DealInsights() {
  const { data: summary, loading } = useApi(() => crm.analytics.summary(), [], { pollingInterval: 120000 });
  const { data: winLoss } = useApi(() => crm.analytics.winLoss(), [], { pollingInterval: 120000 });
  const { data: ai } = useApi(() => crm.ai.summaries(), [], { pollingInterval: 300000 });

  const s = summary ?? {};
  const wl = winLoss ?? {};
  const winRate = wl.won + wl.lost ? Math.round((wl.won / (wl.won + wl.lost)) * 100) : 0;

  const metrics = [
    { label: "Win Rate", value: s.winRate ?? "—", icon: Trophy, color: "emerald" },
    { label: "Avg Sales Cycle", value: s.avgSalesCycle ?? "—", icon: Clock, color: "sky" },
    { label: "Avg Deal Size", value: s.avgDealSizeFmt ?? "—", icon: DollarSign, color: "violet" },
    { label: "Pipeline Velocity", value: s.pipelineVelocity ?? "—", icon: TrendingUp, color: "amber" },
  ];

  return (
    <SolutionShell solutionId="einstein" title="Deal Insights" subtitle="AI-surfaced revenue intelligence across your pipeline">
      {ai?.summary && (
        <div className="rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 p-5 text-white flex items-start gap-3">
          <Sparkles size={18} className="shrink-0 mt-0.5" />
          <div>
            <div className="text-xs uppercase tracking-wide opacity-80">Einstein insight</div>
            <p className="text-sm font-medium mt-1">{ai.summary}</p>
          </div>
        </div>
      )}

      <MetricGrid items={metrics} cols={4} loading={loading && !summary} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Win / Loss" subtitle={`${winRate}% win rate`} icon={Trophy}>
          {!winLoss ? <Loading rows={2} /> : (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{fmtNum(wl.won)}</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">Won · {fmtMoney(wl.wonValue)}</div>
              </div>
              <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-rose-700 dark:text-rose-400">{fmtNum(wl.lost)}</div>
                <div className="text-xs text-rose-600 dark:text-rose-500 mt-0.5">Lost · {fmtMoney(wl.lostValue)}</div>
              </div>
            </div>
          )}
        </Section>

        <Section title="Loss Reasons" subtitle="Why deals are lost" icon={ThumbsDown}>
          {!winLoss ? <Loading rows={3} /> : (
            <BarList items={(wl.reasons ?? []).map((r) => ({ label: r.reason, value: r.pct }))} color="rose" format={(v) => `${v}%`} />
          )}
        </Section>
      </div>
    </SolutionShell>
  );
}
