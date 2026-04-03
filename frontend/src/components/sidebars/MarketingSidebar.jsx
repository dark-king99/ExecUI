import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, DatabaseBackup, Activity, ShoppingCart,
  Laptop2, BotIcon, ScreenShareIcon, ArrowLeft,
  ChevronDown, ChevronRight, ChevronLeft,
  FlaskConical, Users, BarChart3, Image, DollarSign, Crosshair,
} from "lucide-react";

const topItems = [
  { id: "stream", label: "Stream", icon: LayoutDashboard, path: "/marketing/stream" },
  { id: "ai", label: "Marketing AI", icon: BotIcon, path: "/marketing/ai" },
  { id: "emma", label: "E.M.M.A", icon: Laptop2, path: "/marketing/emma" },
  { id: "audience", label: "Audience Studio", icon: Crosshair, path: "/marketing/audience" },
  { id: "personalization", label: "Personalization", icon: Activity, path: "/marketing/personalization" },
  { id: "b2b", label: "B2B Marketing", icon: ScreenShareIcon, path: "/marketing/b2b" },
  { id: "experimentation", label: "Experimentation Lab", icon: FlaskConical, path: "/marketing/experimentation" },
  { id: "attribution", label: "Attribution & ROI", icon: DollarSign, path: "/marketing/attribution" },
  { id: "creative", label: "Creative Assets", icon: Image, path: "/marketing/creative" },
  { id: "analytics", label: "Marketing Analytics", icon: BarChart3, path: "/marketing/analytics" },
  { id: "cdp", label: "Customer Data Platform", icon: DatabaseBackup, path: "/marketing/cdp" },
  { id: "commerce", label: "Commerce Command", icon: ShoppingCart, path: "/marketing/commerce" },
  { id: "team", label: "Team", icon: Users, path: "/marketing/team" },
];

const campaignSubItems = [
  { id: "campaign/overview", label: "Overview", path: "/marketing/campaign/overview" },
  { id: "campaign/builder", label: "Builder", path: "/marketing/campaign/builder" },
  { id: "campaign/analytics", label: "Analytics", path: "/marketing/campaign/analytics" },
  { id: "campaign/scheduler", label: "Schedule", path: "/marketing/campaign/scheduler" },
];

export default function MarketingSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const campaignActive = pathname.startsWith("/marketing/campaign");
  const [campaignOpen, setCampaignOpen] = useState(campaignActive);

  // ✅ collapse state
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
        collapsed ? "w-20" : "w-64"
      } bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800
      text-slate-900 dark:text-slate-100 p-4 flex flex-col gap-4 overflow-y-auto transition-all duration-300`}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between mb-2">
        {!collapsed && (
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-2">
            Marketing
          </span>
        )}

        <button
          onClick={toggleCollapse}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* BACK BUTTON */}
      <button
        onClick={() => navigate("/home")}
        className={`flex items-center ${
          collapsed ? "justify-center" : "gap-2"
        } w-full p-2 rounded-lg text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition`}
      >
        <ArrowLeft size={16} />
        {!collapsed && "Back to Main"}
      </button>

      {/* MAIN ITEMS */}
      {topItems.map(({ id, label, icon: Icon, path }) => {
        const active = pathname === path;

        return (
          <button
            key={id}
            onClick={() => navigate(path)}
            className={`flex items-center ${
              collapsed ? "justify-center" : "gap-2"
            } w-full px-3 py-2 rounded-lg text-sm transition ${
              active
                ? "bg-indigo-600 text-white"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Icon size={16} />
            {!collapsed && label}
          </button>
        );
      })}

      {/* CAMPAIGN GROUP */}
      <div>
        <button
          onClick={() => setCampaignOpen((o) => !o)}
          className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition ${
            campaignActive && !campaignOpen
              ? "bg-indigo-600 text-white"
              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <span className={`flex items-center ${collapsed ? "justify-center w-full" : "gap-2"}`}>
            <ScreenShareIcon size={16} />
            {!collapsed && "Campaign"}
          </span>

          {!collapsed && (campaignOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
        </button>

        {!collapsed && campaignOpen && (
          <div className="ml-5 flex flex-col gap-0.5 mt-0.5">
            {campaignSubItems.map(({ id, label, path }) => {
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