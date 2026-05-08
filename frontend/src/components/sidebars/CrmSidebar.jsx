import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Database, Grid2x2Check, Briefcase, CalendarSync,
  BotMessageSquare, Boxes, Handshake, AlignEndHorizontal, ArrowLeft,
  BotIcon, UserPlus, ChevronDown, ChevronRight, Users, Target,
  TrendingUp, RefreshCw, BookOpen, BarChart3, ChevronLeft, Users2
} from "lucide-react";

const mainItems = [
  { id: "stream",               label: "Stream",               icon: LayoutDashboard, path: "/crm/stream" },
  { id: "leads",                label: "Leads & Contacts",     icon: UserPlus,        path: "/crm/leads" },
  { id: "opportunities",        label: "Opportunities",        icon: Target,          path: "/crm/opportunities" },
  { id: "tasks",                label: "Task & Cadence",       icon: CalendarSync,    path: "/crm/tasks" },
  { id: "pipeline",             label: "Pipeline Tracking",    icon: Briefcase,       path: "/crm/pipeline" },
  { id: "deals",                label: "Deals",                icon: BotIcon,         path: "/crm/deals" },
  { id: "forecasting",          label: "Forecasting & Quota",  icon: TrendingUp,      path: "/crm/forecasting" },
  { id: "renewals",             label: "Renewals & Expansion", icon: RefreshCw,       path: "/crm/renewals" },
  { id: "account360",           label: "Account 360",          icon: Users2,          path: "/crm/account360" },
  { id: "revenue-intelligence", label: "Revenue Intelligence", icon: BotIcon,         path: "/crm/revenue-intelligence" },
  { id: "smart-crm",            label: "SmartCRM AI",          icon: BotMessageSquare, path: "/crm/smart-crm" },
  { id: "playbooks",            label: "Playbooks",            icon: BookOpen,        path: "/crm/playbooks" },
  { id: "analytics",            label: "CRM Analytics",        icon: BarChart3,       path: "/crm/analytics" },
  { id: "reports",              label: "Reports",              icon: AlignEndHorizontal, path: "/crm/reports" },
  { id: "service-integration",  label: "Service Integration",  icon: Grid2x2Check,    path: "/crm/service-integration" },
  { id: "team",                 label: "Team",                 icon: Boxes,           path: "/crm/team" },
  { id: "team-manager",         label: "Team Manager",         icon: Users,           path: "/crm/team-manager" },
  { id: "database",             label: "Database",             icon: Database,        path: "/crm/database" },
];

const partnerItems = [
  { id: "partners",       label: "Partners",      path: "/crm/partners" },
  { id: "partners/board", label: "Board Voting",  path: "/crm/partners/board" },
];

function NavBtn({ icon: Icon, label, path, current, collapsed }) {
  const navigate = useNavigate();
  const active = current === path;

  return (
    <button
      onClick={() => navigate(path)}
      title={collapsed ? label : undefined}
      className={`relative flex items-center ${
        collapsed ? "justify-center" : "gap-2.5"
      } w-full px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 group ${
        active
          ? "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400"
          : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-orange-500 dark:bg-orange-400 rounded-r-full" />
      )}
      <Icon
        size={15}
        className={`shrink-0 ${
          active
            ? "text-orange-500 dark:text-orange-400"
            : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
        }`}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

export default function CrmSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [partnersOpen, setPartnersOpen] = useState(pathname.startsWith("/crm/partners"));
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("crm-sidebar-collapsed");
    if (saved) setCollapsed(JSON.parse(saved));
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("crm-sidebar-collapsed", JSON.stringify(next));
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
          <div className="h-7 w-7 rounded-lg bg-orange-500 flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/25">
            <Users size={14} className="text-white" />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-none">
              CRM Hub
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
            CRM
          </p>
        )}
        {collapsed && <div className="my-1 border-t border-slate-100 dark:border-slate-800/60" />}

        {mainItems.map(({ id, label, icon, path }) => (
          <NavBtn key={id} icon={icon} label={label} path={path} current={pathname} collapsed={collapsed} />
        ))}

        {/* Partners group */}
        {!collapsed && (
          <p className="px-2.5 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-600 select-none">
            Partners
          </p>
        )}

        <button
          onClick={() => setPartnersOpen((o) => !o)}
          className={`flex items-center ${
            collapsed ? "justify-center" : "justify-between"
          } w-full px-2.5 py-2 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200 transition`}
        >
          <span className={`flex items-center ${collapsed ? "" : "gap-2.5"}`}>
            <Handshake size={15} className="text-slate-400 dark:text-slate-500 shrink-0" />
            {!collapsed && "Partners"}
          </span>
          {!collapsed && (
            partnersOpen
              ? <ChevronDown size={13} className="text-slate-400" />
              : <ChevronRight size={13} className="text-slate-400" />
          )}
        </button>

        {!collapsed && partnersOpen && (
          <div className="ml-4 pl-3 border-l border-slate-100 dark:border-slate-800 space-y-0.5 mt-0.5">
            {partnerItems.map(({ id, label, path }) => {
              const active = pathname === path;
              return (
                <button
                  key={id}
                  onClick={() => navigate(path)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition ${
                    active
                      ? "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 font-medium"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </nav>
    </aside>
  );
}
