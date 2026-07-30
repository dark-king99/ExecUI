import { useNavigate } from "react-router-dom";
import { ArrowRight, DollarSign, Briefcase, Wifi, Activity } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { useApi } from "../../hooks/useApi";
import { marketing, crm, network } from "../../services/api";
import { SOLUTIONS, colorOf } from "./solutions.config";
import { MetricGrid, Section, fmtNum } from "./components/an-ui";
import { useUser } from "../../context/UserContext";
import { canSee } from "../../lib/visibility";

function ServiceCard({ solution, stats }) {
  const navigate = useNavigate();
  const c = colorOf(solution.color);
  const Icon = solution.icon;
  return (
    <button
      onClick={() => navigate(solution.pages[0].path)}
      className="group text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${c.grad} flex items-center justify-center shadow-sm`}>
            <Icon size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{solution.name}</h3>
            <p className={`text-xs font-medium ${c.text}`}>{solution.tagline}</p>
          </div>
        </div>
        <ArrowRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:translate-x-0.5 group-hover:text-slate-400 transition" />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2">
        {stats.map((s) => (
          <div key={s.label} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-base font-bold text-slate-900 dark:text-white truncate">{s.value}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </button>
  );
}

export default function AnalyticsSolutions() {
  // Only fetch the slices this organization's plan actually holds data for. The
  // launcher used to poll every slice on a timer regardless — so a plan without
  // Network Ops made two requests a minute, forever, that the API correctly
  // refused with a 403. Nothing broke; it just logged errors and burned requests
  // asking for something it was never going to be given.
  const { user, role } = useUser();
  const has = (slice) => canSee(user, { section: "analytics", module: "analytics", solution: slice }, role);
  const skip = () => Promise.resolve(null);

  const { data: mktSummary } = useApi(() => (has("marketing") ? marketing.analytics.summary() : skip()), [], { pollingInterval: 120000 });
  const { data: mktCampaigns } = useApi(() => (has("marketing") ? marketing.campaigns.summary() : skip()), [], { pollingInterval: 120000 });
  const { data: crmPipeline } = useApi(() => (has("sales") ? crm.pipeline.summary() : skip()), [], { pollingInterval: 120000 });
  const { data: crmAnalytics } = useApi(() => (has("sales") ? crm.analytics.summary() : skip()), [], { pollingInterval: 120000 });
  const { data: crmOpps } = useApi(() => (has("sales") ? crm.opportunities.summary() : skip()), [], { pollingInterval: 120000 });
  const { data: netMonitor } = useApi(() => (has("network") ? network.monitor.overview() : skip()), [], { pollingInterval: 60000 });
  const { data: netServers } = useApi(() => (has("network") ? network.servers.metrics() : skip()), [], { pollingInterval: 60000 });

  const mkt = mktSummary ?? {};
  const mc = mktCampaigns ?? {};
  const pipe = crmPipeline ?? {};
  const ca = crmAnalytics ?? {};
  const co = crmOpps ?? {};
  const nm = netMonitor?.summary ?? {};
  const ns = netServers ?? {};

  const uptime = nm.total ? Math.round((nm.online / nm.total) * 100) : null;

  const headline = [
    { label: "Marketing Revenue", value: mkt.totalRevenueFmt ?? "—", icon: DollarSign, color: "violet" },
    { label: "Open Pipeline", value: pipe.totalPipelineFmt ?? "—", icon: Briefcase, color: "orange" },
    { label: "Network Uptime", value: uptime != null ? `${uptime}%` : "—", icon: Wifi, color: "emerald" },
    { label: "Open Incidents", value: fmtNum(nm.openIncidents ?? 0), icon: Activity, color: "red" },
  ];

  const statsBySolution = {
    marketing: [
      { label: "Revenue", value: mkt.totalRevenueFmt ?? "—" },
      { label: "ROAS", value: mkt.roas != null ? `${mkt.roas}×` : "—" },
      { label: "Active", value: fmtNum(mc.active ?? 0) },
    ],
    sales: [
      { label: "Pipeline", value: pipe.totalPipelineFmt ?? "—" },
      { label: "Win Rate", value: ca.winRate ?? "—" },
      { label: "Open Opps", value: fmtNum(co.total ?? 0) },
    ],
    network: [
      { label: "Nodes", value: fmtNum(nm.total ?? 0) },
      { label: "Online", value: fmtNum(nm.online ?? 0) },
      { label: "Avg CPU", value: ns.avgCpu != null ? `${ns.avgCpu}%` : "—" },
    ],
  };

  return (
    <div className="space-y-7">
      <PageHeader
        title="Analytics"
        subtitle="A unified data overview across Marketing, Sales, and Network — and their solutions."
      />

      <MetricGrid items={headline} cols={4} />

      <Section title="Core Services" subtitle="Dive into analytics for each service and its solutions" pad={false}>
        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* The launcher offers only the slices the plan includes — a card for a
              dashboard that would refuse to open is the definition of clutter. */}
          {SOLUTIONS.filter((s) => has(s.id)).map((s) => <ServiceCard key={s.id} solution={s} stats={statsBySolution[s.id] ?? []} />)}
        </div>
      </Section>
    </div>
  );
}
