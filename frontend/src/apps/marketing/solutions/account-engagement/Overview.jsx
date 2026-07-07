import { Building2, Users, GitBranch, Target, TrendingUp } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, BarList, Loading, fmtNum } from "../../components/mkt-ui";

const STAGES = ["Prospect", "MQL", "SQL", "Customer", "Champion"];

export default function Overview() {
  const { data: accounts, loading } = useApi(() => marketing.b2b.accounts.list({ limit: 50 }), [], { pollingInterval: 120000 });
  const { data: journeys } = useApi(() => marketing.b2b.journeys.list(), [], { pollingInterval: 120000 });

  const all = accounts ?? [];
  const js = journeys ?? [];
  const stageCounts = STAGES.map((st) => ({ label: st, value: all.filter((a) => a.stage === st).length }));
  const avgScore = all.length ? Math.round(all.reduce((s, a) => s + (a.score ?? 0), 0) / all.length) : 0;
  const enrolled = js.reduce((s, j) => s + (j.enrolled ?? 0), 0);

  const metrics = [
    { label: "Prospects", value: fmtNum(all.length), icon: Users, color: "sky" },
    { label: "Marketing Qualified", value: fmtNum(all.filter((a) => ["MQL", "SQL"].includes(a.stage)).length), icon: Target, color: "violet" },
    { label: "Active Programs", value: fmtNum(js.filter((j) => j.status === "active").length), icon: GitBranch, color: "emerald" },
    { label: "Avg Engagement Score", value: avgScore || "—", icon: TrendingUp, color: "amber" },
  ];

  return (
    <SolutionShell solutionId="account-engagement" title="Account Engagement" subtitle="B2B pipeline generation and prospect nurturing">
      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Funnel by Lifecycle Stage" icon={Building2}>
          {loading && all.length === 0 ? <Loading rows={3} /> : <BarList items={stageCounts} color="sky" format={fmtNum} />}
        </Section>

        <Section title="Engagement Programs" subtitle={`${fmtNum(enrolled)} prospects enrolled`} icon={GitBranch} pad={false}>
          {js.length === 0 ? <div className="py-10 text-center text-sm text-slate-400">No programs yet.</div> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {js.map((j) => {
                const rate = j.enrolled ? Math.round((j.converted / j.enrolled) * 100) : 0;
                return (
                  <div key={j.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{j.name}</div>
                      <div className="text-xs text-slate-400">{fmtNum(j.enrolled)} enrolled · {fmtNum(j.converted)} converted</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-sky-600 dark:text-sky-400">{rate}%</div>
                      <div className="text-[10px] text-slate-400">conv. rate</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>
    </SolutionShell>
  );
}
