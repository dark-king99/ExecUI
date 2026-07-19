import { BarChart3, Users, ShieldCheck, Briefcase } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, fmtNum } from "../../components/crm-ui";

function AttainmentBar({ pct }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className={`text-xs font-semibold ${pct >= 100 ? "text-emerald-600" : pct >= 70 ? "text-amber-600" : "text-rose-600"}`}>{pct}%</span>
    </div>
  );
}

export default function ByRep() {
  const { data: reps, loading } = useApi(() => crm.forecast.byRep(), [], { pollingInterval: 60000 });
  const all = reps ?? [];

  const totalCommit = all.reduce((s, r) => s + (r.commitRaw ?? r.commit ?? 0), 0);
  const totalPipeline = all.reduce((s, r) => s + (r.pipelineRaw ?? r.pipeline ?? 0), 0);
  const avgAtt = all.length ? Math.round(all.reduce((s, r) => s + (r.attainment ?? 0), 0) / all.length) : 0;

  const metrics = [
    { label: "Reps Forecasting", value: fmtNum(all.length), icon: Users, color: "emerald" },
    { label: "Total Commit", value: all.length ? all.reduce((s, r) => s + (r.commitRaw ?? 0), 0) >= 1000 ? `$${Math.round(totalCommit / 1000)}k` : `$${totalCommit}` : "—", icon: ShieldCheck, color: "sky" },
    { label: "Total Pipeline", value: totalPipeline >= 1000 ? `$${Math.round(totalPipeline / 1000)}k` : `$${totalPipeline}`, icon: Briefcase, color: "violet" },
    { label: "Avg Attainment", value: `${avgAtt}%`, icon: BarChart3, color: "amber" },
  ];

  return (
    <SolutionShell solutionId="forecasting" title="Forecast by Rep" subtitle="Per-rep commit, pipeline, and quota attainment">
      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <Section title="Rep Roll-up" icon={Users} pad={false}>
        {loading && all.length === 0 ? <Loading table /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Rep", "Quota", "Commit", "Open Deals", "Attainment"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {all.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-500">No rep forecasts.</td></tr>
                ) : all.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{r.name}</td>
                    <td className="px-5 py-3 text-slate-500">{r.quotaFmt}</td>
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{r.commitFmt}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{fmtNum(r.deals)}</td>
                    <td className="px-5 py-3"><AttainmentBar pct={r.attainment ?? 0} /></td>
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
