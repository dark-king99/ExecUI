import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Server, Home, Users, TrendingUp, BarChart3, UserLock, Building2,
  ChevronLeft, ChevronRight, Settings, Layers, Activity
} from "lucide-react";

function NavBtn({ icon: Icon, label, path, current, collapsed }) {
  const navigate = useNavigate();
  const active = current?.startsWith(path);

  return (
    <button
      onClick={() => navigate(path)}
      title={collapsed ? label : undefined}
      className={`relative flex items-center ${
        collapsed ? "justify-center" : "gap-2.5"
      } w-full px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 group ${
        active
          ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
          : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-600 dark:bg-indigo-400 rounded-r-full" />
      )}
      <Icon
        size={16}
        className={`shrink-0 transition-colors ${
          active
            ? "text-indigo-600 dark:text-indigo-400"
            : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
        }`}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

function SectionLabel({ label, collapsed }) {
  if (collapsed) return <div className="my-2 border-t border-slate-100 dark:border-slate-800/60" />;
  return (
    <p className="px-2.5 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-600 select-none">
      {label}
    </p>
  );
}

export default function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) setCollapsed(JSON.parse(saved));
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", JSON.stringify(next));
  };

  return (
    <aside
      className={`${
        collapsed ? "w-[60px]" : "w-56"
      } shrink-0 flex flex-col h-full bg-white dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800/80 transition-all duration-250 ease-in-out`}
    >
      {/* ── Logo row ──────────────────────────────────────────────────── */}
      <div className="flex items-center h-14 px-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
        <div
          className={`flex items-center gap-2.5 flex-1 min-w-0 ${collapsed ? "justify-center" : ""}`}
        >
          <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/25">
            <Building2 size={14} className="text-white" />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-none">
              ExecUI
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

      {/* ── Nav ───────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        <SectionLabel label="Overview" collapsed={collapsed} />

        <NavBtn icon={Home}     label="Home"    path="/home"    current={pathname} collapsed={collapsed} />
        <NavBtn icon={UserLock} label="Account" path="/account" current={pathname} collapsed={collapsed} />

        <SectionLabel label="Modules" collapsed={collapsed} />

        <NavBtn icon={Users}      label="CRM"       path="/crm"       current={pathname} collapsed={collapsed} />
        <NavBtn icon={TrendingUp} label="Marketing"  path="/marketing"  current={pathname} collapsed={collapsed} />
        <NavBtn icon={Server}     label="Network"    path="/network"    current={pathname} collapsed={collapsed} />
        <NavBtn icon={BarChart3}  label="Analytics"  path="/analytics"  current={pathname} collapsed={collapsed} />
        <NavBtn icon={Layers}     label="Services"   path="/services"   current={pathname} collapsed={collapsed} />
      </nav>

      {/* ── Bottom ────────────────────────────────────────────────────── */}
      <div className="px-2 pb-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <NavBtn
          icon={Settings}
          label="Settings"
          path="/account/security"
          current={pathname}
          collapsed={collapsed}
        />
      </div>
    </aside>
  );
}
