import { useMemo } from "react";
import { Target, Award, TrendingUp, Filter } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, BarList, Loading, fmtNum } from "../../components/mkt-ui";

const grade = (score) => (score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : "D");
const GRADE_COLOR = { A: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30", B: "text-sky-600 bg-sky-50 dark:bg-sky-900/30", C: "text-amber-600 bg-amber-50 dark:bg-amber-900/30", D: "text-slate-500 bg-slate-100 dark:bg-slate-800" };

const RULES = [
  { rule: "Visited pricing page", points: "+15" },
  { rule: "Requested a demo", points: "+25" },
  { rule: "Opened 3+ emails", points: "+10" },
  { rule: "Title: Director or above", points: "+20" },
  { rule: "No activity in 30 days", points: "−15" },
];

export default function Scoring() {
  const { data: accounts, loading } = useApi(() => marketing.b2b.accounts.list({ limit: 50 }), [], { pollingInterval: 120000 });
  const all = accounts ?? [];

  const ranked = useMemo(() => [...all].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)), [all]);
  const dist = ["A", "B", "C", "D"].map((g) => ({ label: `Grade ${g}`, value: all.filter((a) => grade(a.score ?? 0) === g).length }));
  const avg = all.length ? Math.round(all.reduce((s, a) => s + (a.score ?? 0), 0) / all.length) : 0;
  const hot = all.filter((a) => (a.score ?? 0) >= 85).length;

  const metrics = [
    { label: "Scored Accounts", value: fmtNum(all.length), icon: Target, color: "sky" },
    { label: "Grade A (Sales-ready)", value: fmtNum(hot), icon: Award, color: "emerald" },
    { label: "Average Score", value: avg || "—", icon: TrendingUp, color: "violet" },
    { label: "Grading Rules", value: RULES.length, icon: Filter, color: "amber" },
  ];

  return (
    <SolutionShell solutionId="account-engagement" title="Scoring & Grading" subtitle="Prioritize prospects with behavioral scoring and firmographic grading">
      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Grade Distribution" icon={Award}>
          {loading && all.length === 0 ? <Loading rows={3} /> : <BarList items={dist} color="sky" format={fmtNum} />}
        </Section>

        <Section title="Scoring Rules" subtitle="How points are assigned" icon={Filter}>
          <div className="space-y-2">
            {RULES.map((r) => (
              <div key={r.rule} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 dark:border-slate-800 last:border-0">
                <span className="text-slate-600 dark:text-slate-300">{r.rule}</span>
                <span className={`font-semibold ${r.points.startsWith("−") ? "text-red-500" : "text-emerald-600"}`}>{r.points}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Top Scored Prospects" icon={Target} pad={false}>
          {loading && all.length === 0 ? <Loading rows={3} /> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
              {ranked.slice(0, 8).map((a) => {
                const g = grade(a.score ?? 0);
                return (
                  <div key={a.id} className="px-5 py-2.5 flex items-center gap-3">
                    <span className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold ${GRADE_COLOR[g]}`}>{g}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{a.name}</div>
                      <div className="text-xs text-slate-400 truncate">{a.industry} · {a.size}</div>
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{a.score}</span>
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
