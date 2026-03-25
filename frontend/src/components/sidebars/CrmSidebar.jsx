import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Database, Grid2x2Check, Briefcase, CalendarSync,
  BotMessageSquare, Boxes, Handshake, AlignEndHorizontal, ArrowLeft,
  BotIcon, UserPlus, ChevronDown, ChevronRight, Users, Target,
  TrendingUp, RefreshCw, BookOpen, BarChart3,
} from "lucide-react";

const mainItems = [
  { id: "stream",              label: "Stream",               icon: LayoutDashboard,  path: "/crm/stream" },
  { id: "leads",               label: "Leads & Contacts",     icon: UserPlus,         path: "/crm/leads" },
  { id: "opportunities",       label: "Opportunities",        icon: Target,           path: "/crm/opportunities" },
  { id: "tasks",               label: "Task & Cadence",       icon: CalendarSync,     path: "/crm/tasks" },
  { id: "pipeline",            label: "Pipeline Tracking",    icon: Briefcase,        path: "/crm/pipeline" },
  { id: "deals",               label: "Deals",                icon: BotIcon,          path: "/crm/deals" },
  { id: "forecasting",         label: "Forecasting & Quota",  icon: TrendingUp,       path: "/crm/forecasting" },
  { id: "renewals",            label: "Renewals & Expansion", icon: RefreshCw,        path: "/crm/renewals" },
  { id: "account360",          label: "Account 360",          icon: UserPlus,         path: "/crm/account360" },
  { id: "revenue-intelligence",label: "Revenue Intelligence", icon: BotIcon,          path: "/crm/revenue-intelligence" },
  { id: "smart-crm",           label: "SmartCRM AI",          icon: BotMessageSquare, path: "/crm/smart-crm" },
  { id: "playbooks",           label: "Playbooks",            icon: BookOpen,         path: "/crm/playbooks" },
  { id: "analytics",           label: "CRM Analytics",        icon: BarChart3,        path: "/crm/analytics" },
  { id: "reports",             label: "Reports",              icon: AlignEndHorizontal, path: "/crm/reports" },
  { id: "service-integration", label: "Service Integration",  icon: Grid2x2Check,     path: "/crm/service-integration" },
  { id: "team",                label: "Team",                 icon: Boxes,            path: "/crm/team" },
  { id: "team-manager",        label: "Team Manager",         icon: Users,            path: "/crm/team-manager" },
  { id: "database",            label: "Database",             icon: Database,         path: "/crm/database" },
];

const partnerItems = [
  { id: "partners",       label: "Partners",               path: "/crm/partners" },
  { id: "partners/board", label: "Board Voting",           path: "/crm/partners/board" },
];

export default function CrmSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [partnersOpen, setPartnersOpen] = useState(pathname.startsWith("/crm/partners"));

  return (
    <aside className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-4 flex flex-col gap-4 overflow-y-auto">
      <button
        onClick={() => navigate("/home")}
        className="flex items-center gap-2 w-full p-2 rounded-lg text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 mb-3 transition"
      >
        <ArrowLeft size={16} /> Back to Main
      </button>

      <div className="px-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">CRM</span>
      </div>

      {mainItems.map(({ id, label, icon: Icon, path }) => {
        const active = pathname === path;
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

      {/* Partners expandable group */}
      <div>
        <button
          onClick={() => setPartnersOpen(o => !o)}
          className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <span className="flex items-center gap-2"><Handshake size={16} /> Partners</span>
          {partnersOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {partnersOpen && (
          <div className="ml-5 flex flex-col gap-0.5 mt-0.5">
            {partnerItems.map(({ id, label, path }) => {
              const active = pathname === path;
              return (
                <button
                  key={id}
                  onClick={() => navigate(path)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition ${
                    active
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
