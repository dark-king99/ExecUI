import { Megaphone, Wand2, Database, BarChart3, Bot, ShoppingCart } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, Section, Loading, fmtMoney, fmtNum } from "../../components/an-ui";

const CHIP = {
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  pink: "bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400",
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
};

function SolCard({ icon: Icon, name, color, stats }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${CHIP[color] ?? CHIP.violet}`}>
          <Icon size={17} />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{name}</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 text-center">
            <div className="text-base font-bold text-slate-900 dark:text-white truncate">{s.value}</div>
            <div className="text-[10px] text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Solutions() {
  const { data: campaigns, loading } = useApi(() => marketing.campaigns.summary(), [], { pollingInterval: 120000 });
  const { data: personalization } = useApi(() => marketing.personalization.metrics(), [], { pollingInterval: 120000 });
  const { data: cdp } = useApi(() => marketing.cdp.metrics(), [], { pollingInterval: 120000 });
  const { data: analytics } = useApi(() => marketing.analytics.summary(), [], { pollingInterval: 120000 });
  const { data: experiments } = useApi(() => marketing.experiments.list(), [], { pollingInterval: 120000 });
  const { data: commerce } = useApi(() => marketing.commerce.metrics(), [], { pollingInterval: 120000 });

  const c = campaigns ?? {};
  const p = personalization ?? {};
  const d = cdp ?? {};
  const a = analytics ?? {};
  const exp = experiments ?? [];
  const cm = commerce ?? {};

  const cards = [
    { icon: Megaphone, name: "Engagement", color: "violet", stats: [{ label: "Active", value: fmtNum(c.active ?? 0) }, { label: "Total", value: fmtNum(c.total ?? 0) }] },
    { icon: Wand2, name: "Personalization", color: "pink", stats: [{ label: "Active", value: fmtNum(p.active ?? 0) }, { label: "Avg Lift", value: p.lift != null ? `+${p.lift}%` : "—" }] },
    { icon: Database, name: "Data Cloud", color: "indigo", stats: [{ label: "Profiles", value: fmtNum(d.totalProfiles ?? 0) }, { label: "Sources", value: fmtNum(d.activeSources ?? 0) }] },
    { icon: BarChart3, name: "Intelligence", color: "amber", stats: [{ label: "Revenue", value: a.totalRevenueFmt ?? fmtMoney(a.totalRevenue) }, { label: "ROAS", value: a.roas != null ? `${a.roas}×` : "—" }] },
    { icon: Bot, name: "Einstein", color: "emerald", stats: [{ label: "Experiments", value: fmtNum(exp.length) }, { label: "Running", value: fmtNum(exp.filter((e) => e.status === "running").length) }] },
    { icon: ShoppingCart, name: "Commerce", color: "rose", stats: [{ label: "Orders", value: fmtNum(cm.totalOrders ?? 0) }, { label: "Revenue", value: cm.totalRevenueFmt ?? fmtMoney(cm.totalRevenue) }] },
  ];

  return (
    <SolutionShell solutionId="marketing" title="Solutions Breakdown" subtitle="Key metrics for every Marketing Cloud solution">
      <Section title="Marketing Cloud Solutions" icon={BarChart3} pad={false}>
        {loading && !campaigns ? <div className="p-5"><Loading rows={6} /></div> : (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => <SolCard key={card.name} {...card} />)}
          </div>
        )}
      </Section>
    </SolutionShell>
  );
}
