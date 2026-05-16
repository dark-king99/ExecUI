import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Database, Bell, Activity, ArrowLeft, Library,
  Settings, Map, AlertTriangle, GitBranch,
  ShieldCheck, TrendingUp, HeartPulse, Bot,
  ChevronLeft, ChevronRight, Server, Monitor, Lock, ShieldAlert
} from "lucide-react";

const items = [
  { id: "dashboard",    label: "Dashboard",          icon: LayoutDashboard, path: "/network/dashboard" },
  { id: "inventory",    label: "Inventory",           icon: Database,        path: "/network/inventory" },
  { id: "servers",      label: "Server Manager",      icon: Server,          path: "/network/servers" },
  { id: "monitor",      label: "Visual Monitor",      icon: Monitor,         path: "/network/monitor" },
  { id: "incidents",    label: "Incident Center",     icon: AlertTriangle,   path: "/network/incidents" },
  { id: "changes",      label: "Change Management",   icon: GitBranch,       path: "/network/changes" },
  { id: "policy",       label: "Policy & Compliance", icon: ShieldCheck,     path: "/network/policy" },
  { id: "capacity",     label: "Capacity Planning",   icon: TrendingUp,      path: "/network/capacity" },
  { id: "slo",          label: "Service Health",      icon: HeartPulse,      path: "/network/slo" },
  { id: "automation",   label: "Automation Jobs",     icon: Bot,             path: "/network/automation" },
  { id: "map",          label: "Topology",            icon: Map,             path: "/network/map" },
  { id: "alerts",       label: "Alerts",              icon: Bell,            path: "/network/alerts" },
  { id: "traffic",      label: "Traffic",             icon: Activity,        path: "/network/traffic" },
  { id: "restrictions", label: "User Restrictions",   icon: Lock,            path: "/network/restrictions" },
  { id: "firewall",     label: "Firewall Setup",      icon: ShieldAlert,     path: "/network/firewall" },
  { id: "docs",         label: "Documentation",       icon: Library,         path: "/network/docs" },
  { id: "settings",     label: "Settings",            icon: Settings,        path: "/network/settings" },
];

function NavBtn({ icon: Icon, label, path, current, collapsed }) {
  const navigate = useNavigate();
  const active = current === path || current.startsWith(path + "/");

  return (
    <button
      onClick={() => navigate(path)}
      title={collapsed ? label : undefined}
      className={`relative flex items-center ${
        collapsed ? "justify-center" : "gap-2.5"
      } w-full px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 group ${
        active
          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-500 dark:bg-emerald-400 rounded-r-full" />
      )}
      <Icon
        size={15}
        className={`shrink-0 ${
          active
            ? "text-emerald-500 dark:text-emerald-400"
            : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
        }`}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

export default function NetworkSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("network-sidebar-collapsed");
    if (saved) setCollapsed(JSON.parse(saved));
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("network-sidebar-collapsed", JSON.stringify(next));
  };

  return (
    <aside
      className={`${
        collapsed ? "w-[60px]" : "w-60"
      } shrink-0 flex flex-col h-full bg-white dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800/80 transition-all duration-250`}
    >
      {/* Header */}
      <div className="flex items-center h-14 px-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
        <div className={`flex items-center gap-2.5 flex-1 min-w-0 ${collapsed ? "justify-center" : ""}`}>
          <div className="h-7 w-7 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/25">
            <Server size={14} className="text-white" />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-none">
              Network Ops
            </span>
          )}
        </div>
        <button
          onClick={toggleCollapse}
          className="ml-auto p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* Back button */}
      <div className="px-2 pt-2">
        <button
          onClick={() => navigate("/home")}
          className={`flex items-center ${
            collapsed ? "justify-center" : "gap-2"
          } w-full px-2.5 py-2 rounded-lg text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition`}
        >
          <ArrowLeft size={13} />
          {!collapsed && "Back to main"}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 pt-1 space-y-0.5">
        {!collapsed && (
          <p className="px-2.5 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-600 select-none">
            Network
          </p>
        )}
        {collapsed && <div className="my-1 border-t border-slate-100 dark:border-slate-800/60" />}

        {items.map(({ id, label, icon, path }) => (
          <NavBtn key={id} icon={icon} label={label} path={path} current={pathname} collapsed={collapsed} />
        ))}
      </nav>
    </aside>
  );
}
