import { TrendingUp, Target, ShieldCheck, Layers, DollarSign } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, BarList, Loading, fmtMoney } from "../../components/crm-ui";

const CATEGORY_LABEL = { commit: "Commit", bestCase: "Best Case", pipeline: "Pipeline", omitted: "Omitted" };

export default function Summary() {
  const { data: summary, loading } = useApi(() => crm.forecast.summary(), [], { pollingInterval: 60000 });
  const { data: categories } = useApi(() => crm.forecast.categories(), [], { pollingInterval: 60000 });

  const s = summary ?? {};
  const cats = categories ?? [];
  const attainment = s.target ? Math.round((s.committed / s.target) * 100) : 0;

  const metrics = [
    { label: "Quota Target", value: s.targetFmt ?? "—", icon: Target, color: "emerald" },
    { label: "Committed", value: s.committedFmt ?? "—", icon: ShieldCheck, color: "sky" },
    { label: "Best Case", value: s.bestCaseFmt ?? "—", icon: TrendingUp, color: "violet" },
    { label: "Total Pipeline", value: s.pipelineFmt ?? "—", icon: Layers, color: "amber" },
  ];

  return (
    <SolutionShell solutionId="forecasting" title="Forecast Summary" subtitle="Roll up your pipeline into a committed forecast">
      <MetricGrid items={metrics} cols={4} loading={loading && !summary} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Attainment vs Target" icon={Target}>
          {loading && !summary ? <Loading rows={2} /> : (
            <div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">{attainment}%</span>
                <span className="text-sm text-slate-400">{s.committedFmt} of {s.targetFmt}</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className={`h-full rounded-full ${attainment >= 100 ? "bg-emerald-500" : attainment >= 70 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${Math.min(100, attainment)}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[["Committed", s.committedFmt], ["Best Case", s.bestCaseFmt], ["Pipeline", s.pipelineFmt]].map(([l, v]) => (
                  <div key={l} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="text-base font-bold text-slate-900 dark:text-white">{v ?? "—"}</div>
                    <div className="text-[11px] text-slate-500">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        <Section title="Forecast Categories" subtitle="Pipeline by commit category" icon={DollarSign}>
          {!categories ? <Loading rows={3} /> : (
            <BarList items={cats.map((c) => ({ label: CATEGORY_LABEL[c.name] ?? c.name, value: c.value }))} color="emerald" format={fmtMoney} />
          )}
        </Section>
      </div>
    </SolutionShell>
  );
}
