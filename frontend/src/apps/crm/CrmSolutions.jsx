import { useNavigate } from "react-router-dom";


import { SOLUTIONS } from "./solutions.config";
import { ArrowRight, Briefcase, DollarSign, Target, TrendingUp, Building, Settings2 } from "lucide-react";
import Greeting from "../../components/Greeting";
import { useApi } from "../../hooks/useApi";
import { crm } from "../../services/api";
import { colorOf } from "./solutions.config";
import { MetricGrid, fmtNum } from "./components/crm-ui";
import { canAccessSolution } from "../../lib/access";
import { useUser } from "../../context/UserContext";
import { useCrmSolutions, useIndustry } from "../../context/IndustryContext";


function SolutionCard({ solution }) {
  const navigate = useNavigate();
  const c = colorOf(solution.color);
  const Icon = solution.icon;
  return (
    <button
      onClick={() => navigate(solution.pages[0].path)}
      className="group text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`h-11 w-11 rounded-xl bg-linear-to-br ${c.grad} flex items-center justify-center shadow-sm`}>
          <Icon size={20} className="text-white" />
        </div>
        <ArrowRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:translate-x-0.5 group-hover:text-slate-400 transition" />
      </div>
      <h3 className="font-semibold text-slate-900 dark:text-white">{solution.name}</h3>
      <p className={`text-xs font-medium mt-0.5 ${c.text}`}>{solution.tagline}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed line-clamp-3">{solution.description}</p>
      <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        {solution.pages.map((p) => (
          <span key={p.id} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            {p.label}
          </span>
        ))}
      </div>
    </button>
  );
}

export default function CrmSolutions() {
  const { user } = useUser();

  const navigate = useNavigate();
  const solutions = useCrmSolutions();
  const { industryId } = useIndustry();

  const { data: pipeline, loading: l1 } = useApi(() => crm.pipeline.summary(), [], { pollingInterval: 120000 });
  const { data: opps, loading: l2 } = useApi(() => crm.opportunities.summary(), [], { pollingInterval: 120000 });
  const { data: analytics } = useApi(() => crm.analytics.summary(), [], { pollingInterval: 120000 });

  const p = pipeline ?? {};
  const o = opps ?? {};
  const a = analytics ?? {};

  const metrics = [
    { label: "Open Pipeline", value: p.totalPipelineFmt ?? "—", icon: Briefcase, color: "violet" },
    { label: "Won Revenue", value: p.wonRevenueFmt ?? "—", icon: DollarSign, color: "emerald" },
    { label: "Open Opportunities", value: fmtNum(o.total ?? 0), icon: Target, color: "amber" },
    { label: "Win Rate", value: a.winRate ?? "—", icon: TrendingUp, color: "sky" },
  ];

  return (
    <div className="space-y-7">
      <Greeting product="Sales Cloud" subtitle="Your complete CRM in one place." />

      <MetricGrid items={metrics} cols={4} loading={(l1 || l2) && !pipeline && !opps} />

      <div>
        <p className="px-1 pb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Solutions
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {solutions
            .filter((s) => s.isIndustry || canAccessSolution(user, "crm", s.id))
            .map((s) => <SolutionCard key={s.id} solution={s} />)}

          {/* Industry setup entry */}
          <button
            onClick={() => navigate("/industry/industry-setup")}
            className="group text-left bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-5 hover:border-orange-400 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Building size={20} className="text-slate-500 dark:text-slate-400" />
              </div>
              <Settings2 size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Industry</h3>
            <p className="text-xs font-medium mt-0.5 text-slate-500 dark:text-slate-400">
              {industryId && industryId !== "general" ? "Change your sector module" : "Add a sector module"}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Unlock telecom, banking, FMCG, hotel and more — layered on top of your core CRM.
            </p>
          </button>

        </div>
      </div>
    </div>
  );
}
