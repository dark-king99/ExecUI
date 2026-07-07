import { Wand2, Sparkles, Eye, TrendingUp, Users } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, BarList, Loading, fmtNum } from "../../components/mkt-ui";

export default function Overview() {
  const { data: metricsData, loading } = useApi(() => marketing.personalization.metrics(), [], { pollingInterval: 120000 });
  const { data: experiences } = useApi(() => marketing.personalization.list(), [], { pollingInterval: 120000 });

  const m = metricsData ?? {};
  const exp = experiences ?? [];

  const metrics = [
    { label: "Active Experiences", value: fmtNum(m.active ?? 0), icon: Sparkles, color: "pink" },
    { label: "Impressions", value: fmtNum(m.impressions ?? 0), icon: Eye, color: "violet" },
    { label: "Avg Lift", value: m.lift != null ? `+${m.lift}%` : "—", icon: TrendingUp, color: "emerald" },
    { label: "Estimated Reach", value: fmtNum(m.estimatedReach ?? 0), icon: Users, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="personalization" title="Personalization Overview" subtitle="Real-time individualized experiences across web and app">
      <MetricGrid items={metrics} cols={4} loading={loading && !metricsData} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Lift by Experience" icon={TrendingUp} className="lg:col-span-2">
          {!experiences ? <Loading rows={3} /> : (
            <BarList items={exp.map((e) => ({ label: e.name, value: e.lift ?? 0 }))} color="pink" format={(v) => `+${v}%`} />
          )}
        </Section>

        <Section title="Audience Context" subtitle="Who you're personalizing for" icon={Wand2}>
          <div className="space-y-3">
            {[
              ["Top Lifecycle Stage", m.topLifecycleStage],
              ["Last Visit Window", m.lastVisitWindow],
              ["Top Industry", m.topIndustry],
              ["Variants Live", m.variants],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 dark:border-slate-800 last:border-0">
                <span className="text-slate-500">{label}</span>
                <span className="font-medium text-slate-900 dark:text-white">{value ?? "—"}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </SolutionShell>
  );
}
