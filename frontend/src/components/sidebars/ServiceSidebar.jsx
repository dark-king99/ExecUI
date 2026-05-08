import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, DollarSign, Settings2, Target,
  Megaphone, Users, ArrowLeft, ChevronRight, ChevronLeft, Layers
} from "lucide-react";

const menuItems = [
  { id: "dashboard",  label: "Dashboard",            icon: LayoutDashboard, path: "/services/dashboard",  color: "text-indigo-500",  activeBg: "bg-indigo-50 dark:bg-indigo-500/10",  activeBar: "bg-indigo-600 dark:bg-indigo-400" },
  { id: "financial",  label: "Financial Management", icon: DollarSign,      path: "/services/financial",  color: "text-emerald-500", activeBg: "bg-emerald-50 dark:bg-emerald-500/10", activeBar: "bg-emerald-500 dark:bg-emerald-400" },
  { id: "operations", label: "Operations & Systems", icon: Settings2,       path: "/services/operation",  color: "text-sky-500",     activeBg: "bg-sky-50 dark:bg-sky-500/10",         activeBar: "bg-sky-500 dark:bg-sky-400" },
  { id: "strategic",  label: "Strategic Planning",   icon: Target,          path: "/services/strategic",  color: "text-purple-500",  activeBg: "bg-purple-50 dark:bg-purple-500/10",  activeBar: "bg-purple-500 dark:bg-purple-400" },
  { id: "marketing",  label: "Marketing & Sales",    icon: Megaphone,       path: "/services/marketing",  color: "text-rose-500",    activeBg: "bg-rose-50 dark:bg-rose-500/10",      activeBar: "bg-rose-500 dark:bg-rose-400" },
  { id: "team",       label: "Team & Projects",      icon: Users,           path: "/services/team",       color: "text-amber-500",   activeBg: "bg-amber-50 dark:bg-amber-500/10",    activeBar: "bg-amber-500 dark:bg-amber-400" },
];

export const ServiceSidebar = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("service-sidebar-collapsed");
    if (saved) setCollapsed(JSON.parse(saved));
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("service-sidebar-collapsed", JSON.stringify(next));
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
          <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/25">
            <Layers size={14} className="text-white" />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-none">
              Services
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
            Management
          </p>
        )}
        {collapsed && <div className="my-1 border-t border-slate-100 dark:border-slate-800/60" />}

        {menuItems.map(({ id, label, icon: Icon, path, color, activeBg, activeBar }) => {
          const active = pathname === path || pathname.startsWith(path + "/");
          return (
            <button
              key={id}
              onClick={() => navigate(path)}
              title={collapsed ? label : undefined}
              className={`relative flex items-center ${
                collapsed ? "justify-center" : "gap-2.5"
              } w-full px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 group ${
                active
                  ? `${activeBg} text-slate-800 dark:text-slate-200`
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {active && (
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 ${activeBar} rounded-r-full`} />
              )}
              <Icon
                size={15}
                className={`shrink-0 ${
                  active
                    ? color
                    : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                }`}
              />
              {!collapsed && <span className="truncate">{label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default ServiceSidebar;
