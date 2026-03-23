import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Database, Bell, Activity, ArrowLeft, Library,
  Settings, Map, ChevronDown, ChevronRight, AlertTriangle, GitBranch,
  ShieldCheck, TrendingUp, HeartPulse, Bot,
} from "lucide-react";

const items = [
  { id: "dashboard",  label: "Dashboard",         icon: LayoutDashboard, path: "/network/dashboard" },
  { id: "inventory",  label: "Inventory",          icon: Database,        path: "/network/inventory" },
  { id: "incidents",  label: "Incident Center",    icon: AlertTriangle,   path: "/network/incidents" },
  { id: "changes",    label: "Change Management",  icon: GitBranch,       path: "/network/changes" },
  { id: "policy",     label: "Policy & Compliance",icon: ShieldCheck,     path: "/network/policy" },
  { id: "capacity",   label: "Capacity Planning",  icon: TrendingUp,      path: "/network/capacity" },
  { id: "slo",        label: "Service Health",     icon: HeartPulse,      path: "/network/slo" },
  { id: "automation", label: "Automation Jobs",    icon: Bot,             path: "/network/automation" },
  { id: "map",        label: "Topology",           icon: Map,             path: "/network/map" },
  { id: "alerts",     label: "Alerts",             icon: Bell,            path: "/network/alerts" },
  { id: "traffic",    label: "Traffic",            icon: Activity,        path: "/network/traffic" },
  { id: "docs",       label: "Documentation",      icon: Library,         path: "/network/docs" },
  { id: "settings",   label: "Settings",           icon: Settings,        path: "/network/settings" },
];

export default function NetworkSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <aside className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-4 flex flex-col gap-1 overflow-y-auto">
      <button
        onClick={() => navigate("/home")}
        className="flex items-center gap-2 w-full p-2 rounded-lg text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 mb-3 transition"
      >
        <ArrowLeft size={16} /> Back to Main
      </button>

      <div className="px-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Network Ops</span>
      </div>

      {items.map(({ id, label, icon: Icon, path }) => {
        const active = pathname === path || pathname.startsWith(path + "/");
        return (
          <button
            key={id}
            onClick={() => navigate(path)}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition ${
              active
                ? "bg-indigo-600 text-white"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        );
      })}
    </aside>
  );
}
