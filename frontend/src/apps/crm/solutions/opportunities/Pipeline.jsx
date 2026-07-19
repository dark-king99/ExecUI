import { useMemo } from "react";
import { Briefcase, DollarSign, Trophy, Users } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, MetricGrid, Loading, fmtNum } from "../../components/crm-ui";

const STAGE_ORDER = ["Discovery", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];
const STAGE_ACCENT = {
  Discovery: "border-t-slate-400", Qualified: "border-t-sky-500", Proposal: "border-t-violet-500",
  Negotiation: "border-t-amber-500", "Closed Won": "border-t-emerald-500", "Closed Lost": "border-t-rose-500",
};

export default function Pipeline() {
  const { data: summary, loading } = useApi(() => crm.pipeline.summary(), [], { pollingInterval: 60000 });
  const { data: deals, loading: dLoading } = useApi(() => crm.deals.list(), [], { pollingInterval: 60000 });

  const s = summary ?? {};
  const all = deals ?? [];
  const byStage = useMemo(() => {
    const map = Object.fromEntries(STAGE_ORDER.map((st) => [st, []]));
    all.forEach((d) => { if (map[d.stage]) map[d.stage].push(d); });
    return map;
  }, [all]);
  const stageMeta = Object.fromEntries((s.stages ?? []).map((st) => [st.stage, st]));

  const metrics = [
    { label: "Open Pipeline", value: s.totalPipelineFmt ?? "—", icon: Briefcase, color: "violet" },
    { label: "Won Revenue", value: s.wonRevenueFmt ?? "—", icon: DollarSign, color: "emerald" },
    { label: "Active Reps", value: fmtNum(s.activeReps ?? 0), icon: Users, color: "sky" },
    { label: "Total Deals", value: fmtNum(all.length), icon: Trophy, color: "amber" },
  ];

  return (
    <SolutionShell solutionId="opportunities" title="Pipeline" subtitle="Drag your deals through every stage of the sales process">
      <MetricGrid items={metrics} cols={4} loading={loading && !summary} />

      {dLoading && all.length === 0 ? <Loading rows={6} /> : (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-max">
            {STAGE_ORDER.map((stage) => {
              const cards = byStage[stage] ?? [];
              const meta = stageMeta[stage];
              return (
                <div key={stage} className={`w-64 shrink-0 bg-slate-50 dark:bg-slate-900/50 rounded-xl border-t-2 ${STAGE_ACCENT[stage]} border border-slate-200 dark:border-slate-800`}>
                  <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{stage}</span>
                      <span className="text-xs text-slate-400">{cards.length}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{meta?.valueFmt ?? "$0"}</div>
                  </div>
                  <div className="p-2 space-y-2 max-h-[30rem] overflow-y-auto">
                    {cards.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">No deals</div>
                    ) : cards.map((d) => (
                      <div key={d.id} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
                        <div className="text-sm font-medium text-slate-900 dark:text-white leading-snug">{d.name}</div>
                        <div className="text-xs text-slate-400 mt-1">{d.account}</div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">{d.value}</span>
                          <span className="text-[11px] text-slate-400">{d.probability}%</span>
                        </div>
                        {d.owner && <div className="text-[11px] text-slate-400 mt-1.5 truncate">{d.owner}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </SolutionShell>
  );
}
