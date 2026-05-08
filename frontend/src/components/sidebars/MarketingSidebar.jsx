import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, DatabaseBackup, Activity, ShoppingCart,
  Laptop2, BotIcon, Megaphone, ArrowLeft,
  ChevronDown, ChevronRight, ChevronLeft,
  FlaskConical, Users, BarChart3, Image, DollarSign, Crosshair,
} from "lucide-react";

const topItems = [
  { id: "stream",           label: "Stream",               icon: LayoutDashboard, path: "/marketing/stream" },
  { id: "ai",               label: "Marketing AI",         icon: BotIcon,         path: "/marketing/ai" },
  { id: "emma",             label: "E.M.M.A",              icon: Laptop2,         path: "/marketing/emma" },
  { id: "audience",         label: "Audience Studio",      icon: Crosshair,       path: "/marketing/audience" },
  { id: "personalization",  label: "Personalization",      icon: Activity,        path: "/marketing/personalization" },
  { id: "b2b",              label: "B2B Marketing",        icon: Users,           path: "/marketing/b2b" },
  { id: "experimentation",  label: "Experimentation Lab",  icon: FlaskConical,    path: "/marketing/experimentation" },
  { id: "attribution",      label: "Attribution & ROI",    icon: DollarSign,      path: "/marketing/attribution" },
  { id: "creative",         label: "Creative Assets",      icon: Image,           path: "/marketing/creative" },
  { id: "analytics",        label: "Marketing Analytics",  icon: BarChart3,       path: "/marketing/analytics" },
  { id: "cdp",              label: "Customer Data Platform", icon: DatabaseBackup, path: "/marketing/cdp" },
  { id: "commerce",         label: "Commerce Command",     icon: ShoppingCart,    path: "/marketing/commerce" },
  { id: "team",             label: "Team",                 icon: Users,           path: "/marketing/team" },
];

const campaignSubItems = [
  { id: "campaign/overview",   label: "Overview",   path: "/marketing/campaign/overview" },
  { id: "campaign/builder",    label: "Builder",    path: "/marketing/campaign/builder" },
  { id: "campaign/analytics",  label: "Analytics",  path: "/marketing/campaign/analytics" },
  { id: "campaign/scheduler",  label: "Schedule",   path: "/marketing/campaign/scheduler" },
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
          ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400"
          : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-500 dark:bg-violet-400 rounded-r-full" />
      )}
      <Icon
        size={15}
        className={`shrink-0 ${
          active
            ? "text-violet-500 dark:text-violet-400"
            : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
        }`}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

export default function MarketingSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const campaignActive = pathname.startsWith("/marketing/campaign");
  const [campaignOpen, setCampaignOpen] = useState(campaignActive);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("marketing-sidebar-collapsed");
    if (saved) setCollapsed(JSON.parse(saved));
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("marketing-sidebar-collapsed", JSON.stringify(next));
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
          <div className="h-7 w-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0 shadow-sm shadow-violet-600/25">
            <Megaphone size={14} className="text-white" />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-none">
              Marketing Hub
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
            Marketing
          </p>
        )}
        {collapsed && <div className="my-1 border-t border-slate-100 dark:border-slate-800/60" />}

        {topItems.map(({ id, label, icon, path }) => (
          <NavBtn key={id} icon={icon} label={label} path={path} current={pathname} collapsed={collapsed} />
        ))}

        {/* Campaign group */}
        <button
          onClick={() => setCampaignOpen((o) => !o)}
          title={collapsed ? "Campaigns" : undefined}
          className={`relative flex items-center ${
            collapsed ? "justify-center" : "justify-between"
          } w-full px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
            campaignActive
              ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          {campaignActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-500 dark:bg-violet-400 rounded-r-full" />
          )}
          <span className={`flex items-center ${collapsed ? "" : "gap-2.5"}`}>
            <Megaphone size={15} className={campaignActive ? "text-violet-500 dark:text-violet-400" : "text-slate-400 dark:text-slate-500"} />
            {!collapsed && "Campaign"}
          </span>
          {!collapsed && (
            campaignOpen
              ? <ChevronDown size={13} className="text-slate-400" />
              : <ChevronRight size={13} className="text-slate-400" />
          )}
        </button>

        {!collapsed && campaignOpen && (
          <div className="ml-4 pl-3 border-l border-slate-100 dark:border-slate-800 space-y-0.5 mt-0.5">
            {campaignSubItems.map(({ id, label, path }) => {
              const active = pathname === path;
              return (
                <button
                  key={id}
                  onClick={() => navigate(path)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition ${
                    active
                      ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 font-medium"
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
