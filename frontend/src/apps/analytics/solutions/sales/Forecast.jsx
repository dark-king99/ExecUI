import { TrendingUp, Target, ShieldCheck, Users } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, BarList, Loading, fmtMoney, fmtNum } from "../../components/an-ui";

const CATEGORY_LABEL = { commit: "Commit", bestCase: "Best Case", pipeline: "Pipeline", omitted: "Omitted" };

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

export default function Forecast() {
  const { data: summary, loading } = useApi(() => crm.forecast.summary(), [], { pollingInterval: 120000 });
  const { data: categories } = useApi(() => crm.forecast.categories(), [], { pollingInterval: 120000 });
  const { data: reps } = useApi(() => crm.forecast.byRep(), [], { pollingInterval: 120000 });

  const s = summary ?? {};
  const cats = categories ?? [];
  const all = reps ?? [];
  const attainment = s.target ? Math.round((s.committed / s.target) * 100) : 0;

  const metrics = [
    { label: "Quota Target", value: s.targetFmt ?? "—", icon: Target, color: "orange" },
    { label: "Committed", value: s.committedFmt ?? "—", icon: ShieldCheck, color: "emerald" },
    { label: "Best Case", value: s.bestCaseFmt ?? "—", icon: TrendingUp, color: "amber" },
    { label: "Reps", value: fmtNum(all.length), icon: Users, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="sales" title="Forecast" subtitle="Commit, categories, and per-rep attainment">
      <MetricGrid items={metrics} cols={4} loading={loading && !summary} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Attainment vs Target" icon={Target}>
          {loading && !summary ? <Loading rows={2} /> : (
            <>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">{attainment}%</span>
                <span className="text-sm text-slate-400">{s.committedFmt} of {s.targetFmt}</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className={`h-full rounded-full ${attainment >= 100 ? "bg-emerald-500" : attainment >= 70 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${Math.min(100, attainment)}%` }} />
              </div>
            </>
          )}
        </Section>
        <Section title="Forecast Categories" icon={TrendingUp}>
          {!categories ? <Loading rows={3} /> : <BarList items={cats.map((c) => ({ label: CATEGORY_LABEL[c.name] ?? c.name, value: c.value }))} color="orange" format={fmtMoney} />}
        </Section>
      </div>

      <Section title="By Rep" icon={Users} pad={false}>
        {!reps ? <Loading table /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Rep", "Quota", "Commit", "Deals", "Attainment"].map((h) => (
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
