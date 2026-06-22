import { useNavigate } from "react-router-dom";
import { ArrowRight, Server, Wifi, Bell, AlertTriangle } from "lucide-react";
import Greeting from "../../components/Greeting";
import { useApi } from "../../hooks/useApi";
import { network } from "../../services/api";
import { SOLUTIONS, colorOf } from "./solutions.config";
import { MetricGrid, fmtNum } from "./components/net-ui";

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

export default function NetworkSolutions() {
  const { data: monitor, loading: l1 } = useApi(() => network.monitor.overview(), [], { pollingInterval: 60000 });
  const { data: servers, loading: l2 } = useApi(() => network.servers.metrics(), [], { pollingInterval: 60000 });

  const sum = monitor?.summary ?? {};
  const sv = servers ?? {};

  const metrics = [
    { label: "Managed Nodes", value: fmtNum(sum.total ?? 0), icon: Wifi, color: "indigo" },
    { label: "Online", value: fmtNum(sum.online ?? 0), icon: Server, color: "emerald" },
    { label: "Open Alerts", value: fmtNum((sum.warning ?? 0) + (sum.critical ?? 0)), icon: Bell, color: "amber" },
    { label: "Open Incidents", value: fmtNum(sum.openIncidents ?? 0), icon: AlertTriangle, color: "red" },
  ];

  return (
    <div className="space-y-7">
      <Greeting product="Network Ops" subtitle="Monitor, map, and manage your network." />

      <MetricGrid items={metrics} cols={4} loading={(l1 || l2) && !monitor && !servers} />

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
