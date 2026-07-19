import { useMemo } from "react";
import { Target, Flame, TrendingUp, Filter } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, BarList, Loading, fmtNum } from "../../components/crm-ui";

const grade = (s) => (s >= 85 ? "A" : s >= 70 ? "B" : s >= 55 ? "C" : "D");
const GRADE_COLOR = { A: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30", B: "text-sky-600 bg-sky-50 dark:bg-sky-900/30", C: "text-amber-600 bg-amber-50 dark:bg-amber-900/30", D: "text-slate-500 bg-slate-100 dark:bg-slate-800" };

const RULES = [
  { rule: "Stage advanced to Qualified", points: "+25" },
  { rule: "Demo booked", points: "+20" },
  { rule: "Engaged 3+ times", points: "+15" },
  { rule: "Enterprise company size", points: "+15" },
  { rule: "Stale for 14+ days", points: "−10" },
];

export default function Scoring() {
  const { data: leads, loading } = useApi(() => crm.leads.list(), [], { pollingInterval: 60000 });
  const all = leads ?? [];

  const ranked = useMemo(() => [...all].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)), [all]);
  const dist = ["A", "B", "C", "D"].map((g) => ({ label: `Grade ${g}`, value: all.filter((l) => grade(l.score ?? 0) === g).length }));
  const avg = all.length ? Math.round(all.reduce((s, l) => s + (l.score ?? 0), 0) / all.length) : 0;
  const hot = all.filter((l) => (l.score ?? 0) >= 85).length;

  const metrics = [
    { label: "Scored Leads", value: fmtNum(all.length), icon: Target, color: "amber" },
    { label: "Sales-Ready (A)", value: fmtNum(hot), icon: Flame, color: "emerald" },
    { label: "Average Score", value: avg || "—", icon: TrendingUp, color: "violet" },
    { label: "Scoring Rules", value: RULES.length, icon: Filter, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="leads" title="Lead Scoring" subtitle="Prioritize follow-up with behavioral and firmographic scoring">
      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Grade Distribution" icon={Target}>
          {loading && all.length === 0 ? <Loading rows={3} /> : <BarList items={dist} color="amber" format={fmtNum} />}
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

        <Section title="Top Scored Leads" icon={Flame} pad={false}>
          {loading && all.length === 0 ? <div className="p-4"><Loading rows={3} /></div> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
              {ranked.slice(0, 8).map((l) => {
                const g = grade(l.score ?? 0);
                return (
                  <div key={l.id} className="px-5 py-2.5 flex items-center gap-3">
                    <span className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold ${GRADE_COLOR[g]}`}>{g}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{l.name}</div>
                      <div className="text-xs text-slate-400 truncate">{l.stage} · {l.value}</div>
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{l.score}</span>
                  </div>
                );
              })}
              {ranked.length === 0 && <div className="py-10 text-center text-sm text-slate-400">No leads.</div>}
            </div>
          )}
        </Section>
      </div>
    </SolutionShell>
  );
}
