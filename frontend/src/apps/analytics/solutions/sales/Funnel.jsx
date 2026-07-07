import { Filter, Clock, DollarSign, Trophy, ThumbsDown } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, BarList, Loading, fmtMoney, fmtNum } from "../../components/an-ui";

export default function Funnel() {
  const { data: funnel, loading } = useApi(() => crm.analytics.funnel(), [], { pollingInterval: 120000 });
  const { data: velocity } = useApi(() => crm.analytics.velocity(), [], { pollingInterval: 120000 });
  const { data: winLoss } = useApi(() => crm.analytics.winLoss(), [], { pollingInterval: 120000 });

  const f = funnel ?? [];
  const v = velocity ?? {};
  const wl = winLoss ?? {};
  const top = f[0]?.count || 1;
  const winRate = wl.won + wl.lost ? Math.round((wl.won / (wl.won + wl.lost)) * 100) : 0;

  const metrics = [
    { label: "Avg Deal Size", value: v.avgDealSizeFmt ?? "—", icon: DollarSign, color: "orange" },
    { label: "Avg Cycle", value: v.avgCycleDays != null ? `${v.avgCycleDays}d` : "—", icon: Clock, color: "sky" },
    { label: "Win Rate", value: v.winRate != null ? `${v.winRate}%` : "—", icon: Trophy, color: "emerald" },
    { label: "Stages", value: fmtNum(f.length), icon: Filter, color: "amber" },
  ];

  return (
    <SolutionShell solutionId="sales" title="Funnel & Velocity" subtitle="Conversion through each stage and win/loss breakdown">
      <MetricGrid items={metrics} cols={4} loading={loading && !funnel} />

      <Section title="Conversion Funnel" icon={Filter}>
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
                    <span className="text-slate-400">{fmtNum(stage.count)} · {fmtMoney(stage.value)}{conv != null && <span className="ml-2 text-orange-500">{conv}%</span>}</span>
                  </div>
                  <div className="h-7 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 flex items-center px-3" style={{ width: `${width}%` }}>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Win / Loss" subtitle={`${winRate}% win rate`} icon={Trophy}>
          {!winLoss ? <Loading rows={2} /> : (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{fmtNum(wl.won)}</div>
                <div className="text-xs text-emerald-600 mt-0.5">Won · {fmtMoney(wl.wonValue)}</div>
              </div>
              <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-rose-700 dark:text-rose-400">{fmtNum(wl.lost)}</div>
                <div className="text-xs text-rose-600 mt-0.5">Lost · {fmtMoney(wl.lostValue)}</div>
              </div>
            </div>
          )}
        </Section>
        <Section title="Loss Reasons" icon={ThumbsDown}>
          {!winLoss ? <Loading rows={3} /> : <BarList items={(wl.reasons ?? []).map((r) => ({ label: r.reason, value: r.pct }))} color="orange" format={(x) => `${x}%`} />}
        </Section>
      </div>
    </SolutionShell>
  );
}
