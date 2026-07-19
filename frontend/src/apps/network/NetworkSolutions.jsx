import { useNavigate } from "react-router-dom";
import { ArrowRight, Server, Wifi, Bell, AlertTriangle, Globe, Gauge, Settings2 } from "lucide-react";
import Greeting from "../../components/Greeting";
import { useApi } from "../../hooks/useApi";
import { network } from "../../services/api";
import { colorOf } from "./solutions.config";
import { MetricGrid, fmtNum } from "./components/net-ui";
import { useNetwork, useNetworkSolutions } from "../../context/NetworkContext";

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
  const navigate = useNavigate();
  const { profile } = useNetwork();
  const solutions = useNetworkSolutions();
  const isOffice = profile === "office";

  const { data: monitor, loading: l1 } = useApi(() => network.monitor.overview(), [], { pollingInterval: 60000 });
  const { data: conn, loading: l2 } = useApi(() => network.connectivity.summary(), [], { pollingInterval: 60000 });

  const sum = monitor?.summary ?? {};
  const cs = conn ?? {};

  // Office mode leads with internet + devices; datacenter mode leads with nodes.
  const metrics = isOffice
    ? [
        { label: "Internet Links", value: cs.links ? `${cs.linksUp ?? 0}/${cs.links} up` : "0", icon: Globe, color: "sky" },
        { label: "Bandwidth", value: cs.totalDownMbps ? `${fmtNum(cs.totalDownMbps)}↓ Mbps` : "—", icon: Gauge, color: "violet" },
        { label: "Devices Online", value: `${fmtNum(cs.devicesUp ?? 0)}/${fmtNum(cs.devicesTotal ?? 0)}`, icon: Wifi, color: "emerald" },
        { label: "Active Alerts", value: fmtNum(cs.alertsActive ?? (sum.warning ?? 0) + (sum.critical ?? 0)), icon: Bell, color: "amber" },
      ]
    : [
        { label: "Managed Nodes", value: fmtNum(sum.total ?? 0), icon: Wifi, color: "indigo" },
        { label: "Online", value: fmtNum(sum.online ?? 0), icon: Server, color: "emerald" },
        { label: "Open Alerts", value: fmtNum((sum.warning ?? 0) + (sum.critical ?? 0)), icon: Bell, color: "amber" },
        { label: "Open Incidents", value: fmtNum(sum.openIncidents ?? 0), icon: AlertTriangle, color: "red" },
      ];

  return (
    <div className="space-y-7">
      <Greeting product="Network Ops" subtitle={isOffice ? "Monitor your office internet, devices and traffic." : "Monitor, map, and manage your network."} />

      <MetricGrid items={metrics} cols={4} loading={(l1 || l2) && !monitor && !conn} />

      <div>
        <p className="px-1 pb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Solutions
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {solutions.map((s) => <SolutionCard key={s.id} solution={s} />)}

          {/* Profile setup */}
          <button
            onClick={() => navigate("/network/profile-setup")}
            className="group text-left bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-5 hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Settings2 size={20} className="text-slate-500 dark:text-slate-400" /></div>
              <ArrowRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:translate-x-0.5 transition" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Network profile</h3>
            <p className="text-xs font-medium mt-0.5 text-slate-500 dark:text-slate-400">{isOffice ? "Small office mode" : "Enterprise mode"}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">Switch between a small-office (internet + routers) and full enterprise (servers + datacenter) view.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
