import { FileBarChart, Users, Trophy, DollarSign } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, BarList, Loading, fmtMoney, fmtNum } from "../../components/crm-ui";

export default function Reports() {
  const { data: owners, loading } = useApi(() => crm.pipeline.owners(), [], { pollingInterval: 120000 });
  const { data: funnel } = useApi(() => crm.analytics.funnel(), [], { pollingInterval: 120000 });
  const { data: winLoss } = useApi(() => crm.analytics.winLoss(), [], { pollingInterval: 120000 });

  const reps = owners ?? [];
  const f = funnel ?? [];
  const wl = winLoss ?? {};

  const metrics = [
    { label: "Reps Reporting", value: fmtNum(reps.length), icon: Users, color: "blue" },
    { label: "Pipeline (all reps)", value: fmtMoney(reps.reduce((s, r) => s + (r.pipelineValue ?? 0), 0)), icon: DollarSign, color: "emerald" },
    { label: "Won Deals", value: fmtNum(wl.won ?? 0), icon: Trophy, color: "amber" },
    { label: "Avg Win Rate", value: reps.length ? `${Math.round(reps.reduce((s, r) => s + (r.winRate ?? 0), 0) / reps.length)}%` : "—", icon: Trophy, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="analytics" title="Reports" subtitle="Saved cross-team reports and leaderboards">
      <MetricGrid items={metrics} cols={4} loading={loading && reps.length === 0} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Pipeline by Stage" icon={FileBarChart}>
          {!funnel ? <Loading rows={3} /> : <BarList items={f.map((x) => ({ label: x.stage, value: x.value }))} color="blue" format={fmtMoney} />}
        </Section>
        <Section title="Pipeline by Owner" icon={Users}>
          {!owners ? <Loading rows={3} /> : <BarList items={reps.map((r) => ({ label: r.name, value: r.pipelineValue }))} color="emerald" format={fmtMoney} />}
        </Section>
      </div>

      <Section title="Rep Leaderboard" icon={Trophy} pad={false}>
        {!owners ? <Loading table /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Rep", "Open Deals", "Pipeline", "Avg Deal", "Win Rate"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reps.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-500">No data.</td></tr>
                ) : [...reps].sort((a, b) => (b.pipelineValue ?? 0) - (a.pipelineValue ?? 0)).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{r.name}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{fmtNum(r.openDeals)}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{r.pipelineFmt}</td>
                    <td className="px-5 py-3 text-slate-500">{fmtMoney(r.avgDeal)}</td>
                    <td className="px-5 py-3"><span className={`font-semibold ${r.winRate >= 50 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}>{r.winRate}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </SolutionShell>
  );
}
