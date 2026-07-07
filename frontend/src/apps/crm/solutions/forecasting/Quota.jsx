import { Gauge, Users, Target, Trophy } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, fmtNum } from "../../components/crm-ui";

function AttainmentBar({ pct }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-28 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className={`text-xs font-semibold ${pct >= 100 ? "text-emerald-600" : pct >= 70 ? "text-amber-600" : "text-rose-600"}`}>{pct}%</span>
    </div>
  );
}

export default function Quota() {
  const { data: summary, loading } = useApi(() => crm.reps.summary(), [], { pollingInterval: 60000 });
  const { data: reps } = useApi(() => crm.reps.list(), [], { pollingInterval: 60000 });

  const s = summary ?? {};
  const all = reps ?? [];

  const metrics = [
    { label: "Team Quota", value: s.quotaFmt ?? "—", icon: Target, color: "emerald" },
    { label: "Committed", value: s.committedFmt ?? "—", icon: Trophy, color: "sky" },
    { label: "Team Attainment", value: s.attainment != null ? `${s.attainment}%` : "—", icon: Gauge, color: "amber" },
    { label: "Reps", value: fmtNum(s.total ?? all.length), icon: Users, color: "violet" },
  ];

  return (
    <SolutionShell solutionId="forecasting" title="Quota Attainment" subtitle="How the whole team is tracking against quota">
      <MetricGrid items={metrics} cols={4} loading={loading && !summary} />

      <Section title="Rep Attainment" icon={Gauge} pad={false}>
        {!reps ? <Loading table /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Rep", "Department", "Pipeline", "Quota", "Win Rate", "Attainment"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {all.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-500">No reps found.</td></tr>
                ) : all.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{r.name}</div>
                      <div className="text-xs text-slate-400">{r.email}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{r.department}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{r.pipelineFmt}</td>
                    <td className="px-5 py-3 text-slate-500">{r.quotaFmt}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{r.winRate}%</td>
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
