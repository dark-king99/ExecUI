import { useNavigate } from "react-router-dom";
import { ArrowRight, Megaphone, DollarSign, Users, TrendingUp } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { useApi } from "../../hooks/useApi";
import { marketing } from "../../services/api";
import { SOLUTIONS, colorOf } from "./solutions.config";
import { MetricGrid, fmtMoney, fmtNum } from "./components/mkt-ui";
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';

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

export default function MarketingSolutions() {
  const { data: campaignSummary, loading: l1 } = useApi(() => marketing.campaigns.summary(), [], { pollingInterval: 120000 });
  const { data: analytics, loading: l2 } = useApi(() => marketing.analytics.summary(), [], { pollingInterval: 120000 });

  const cs = campaignSummary ?? {};
  const an = analytics ?? {};
  const metrics = [
    { label: "Active Campaigns", value: fmtNum(cs.active ?? 0), icon: Megaphone, color: "violet" },
    { label: "Revenue Attributed", value: an.totalRevenueFmt ?? fmtMoney(an.totalRevenue), icon: DollarSign, color: "emerald" },
    { label: "Live Contacts", value: fmtNum(cs.liveContacts ?? an.liveContacts ?? 0), icon: Users, color: "sky" },
    { label: "Blended ROAS", value: an.roas != null ? `${an.roas}×` : "—", icon: TrendingUp, color: "amber" },
  ];
  const employee = JSON.parse(localStorage.getItem('user') || 'null');
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="space-y-7">
    <div className="w-full">
      <div className="flex w-full items-start justify-between">
         <div className="flex flex-col gap-1"> 
            <h1 className={'text-2xl sm:text-3xl font-semibold dark:text-white text-slate-900'}> 
              Marketing Cloud
        </h1>
        <p className="text-sm font-body text-slate-400 dark:text-slate-500">Every marketing solution in one place. Pick a solution to dive into its tools.
        </p>
       </div>
          
      <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 shrink-0 border-2 border-orange-500/30">
            <AvatarImage src={employee?.avatar_url} alt={employee?.name} />
              <AvatarFallback className="font-heading text-xl text-orange-400 bg-slate-200">
               {employee?.name?.split(' ').map((n) => n[0]).join('') || '?'}
              </AvatarFallback>
          </Avatar>
                    
          <div>
             <div className="flex items-baseline gap-2 min-w-0 text-right pt-1 pr-40">
                <span className={`text-2xl sm:text-3xl font-semibold tracking-tight font-heading dark:text-white text-slate-900`} >
                {getGreeting()}
                </span>
              <h1
                className="flex-1 min-w-0 text-2xl sm:text-3xl font-semibold truncate">
                {employee?.name ?? '—'} 
              </h1>
             </div>
          
          <p className="text-sm text-slate-500 truncate">
            {employee?.role} — {employee?.department}
          </p>
        </div>
        </div>  
      </div>
    </div>
      <MetricGrid items={metrics} cols={4} loading={(l1 || l2) && !campaignSummary && !analytics} />

      <div>
        <p className="px-1 pb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Solutions
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SOLUTIONS.map((s) => <SolutionCard key={s.id} solution={s} />)}
        </div>
      </div>
    </div>
  );
}
