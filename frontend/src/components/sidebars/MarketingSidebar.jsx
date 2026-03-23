import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, DatabaseBackup, Activity, Settings, ShoppingCart,
  Laptop2, BotIcon, ScreenShareIcon, ArrowLeft, ChevronDown, ChevronRight,
  FlaskConical, Users, BarChart3, Image, DollarSign, Crosshair,
} from "lucide-react";

const topItems = [
  { id: "stream",         label: "Stream",              icon: LayoutDashboard,  path: "/marketing/stream" },
  { id: "ai",             label: "Marketing AI",        icon: BotIcon,          path: "/marketing/ai" },
  { id: "emma",           label: "E.M.M.A",             icon: Laptop2,          path: "/marketing/emma" },
  { id: "audience",       label: "Audience Studio",     icon: Crosshair,        path: "/marketing/audience" },
  { id: "personalization",label: "Personalization",     icon: Activity,         path: "/marketing/personalization" },
  { id: "b2b",            label: "B2B Marketing",       icon: ScreenShareIcon,  path: "/marketing/b2b" },
  { id: "experimentation",label: "Experimentation Lab", icon: FlaskConical,     path: "/marketing/experimentation" },
  { id: "attribution",    label: "Attribution & ROI",   icon: DollarSign,       path: "/marketing/attribution" },
  { id: "creative",       label: "Creative Assets",     icon: Image,            path: "/marketing/creative" },
  { id: "analytics",      label: "Marketing Analytics", icon: BarChart3,        path: "/marketing/analytics" },
  { id: "cdp",            label: "Customer Data Platform", icon: DatabaseBackup, path: "/marketing/cdp" },
  { id: "commerce",       label: "Commerce Command",    icon: ShoppingCart,     path: "/marketing/commerce" },
  { id: "team",           label: "Team",                icon: Users,            path: "/marketing/team" },
];

const campaignSubItems = [
  { id: "campaign/overview",   label: "Overview",    path: "/marketing/campaign/overview" },
  { id: "campaign/builder",    label: "Builder",     path: "/marketing/campaign/builder" },
  { id: "campaign/analytics",  label: "Analytics",   path: "/marketing/campaign/analytics" },
  { id: "campaign/scheduler",  label: "Schedule",    path: "/marketing/campaign/scheduler" },
];

export default function MarketingSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const campaignActive = pathname.startsWith("/marketing/campaign");
  const [campaignOpen, setCampaignOpen] = useState(campaignActive);

  return (
    <aside className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-4 flex flex-col gap-1 overflow-y-auto">
      <button
        onClick={() => navigate("/home")}
        className="flex items-center gap-2 w-full p-2 rounded-lg text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 mb-3 transition"
      >
        <ArrowLeft size={16} /> Back to Main
      </button>

      <div className="px-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Marketing</span>
      </div>

      {topItems.map(({ id, label, icon: Icon, path }) => {
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

      {/* Campaign expandable group */}
      <div>
        <button
          onClick={() => setCampaignOpen(o => !o)}
          className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition ${
            campaignActive && !campaignOpen
              ? "bg-indigo-600 text-white"
              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <span className="flex items-center gap-2"><ScreenShareIcon size={16} /> Campaign</span>
          {campaignOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {campaignOpen && (
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
