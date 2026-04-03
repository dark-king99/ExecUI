import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, BarChart3, Activity, Search, Users,
  TrendingUp, Database, ChevronLeft, ChevronRight
} from "lucide-react";

const items = [
  { id: "executive", label: "Executive Overview", icon: BarChart3, path: "/analytics/executive" },
  { id: "operational", label: "Operational Metrics", icon: Activity, path: "/analytics/operational" },
  { id: "explorer", label: "Self-Serve Explorer", icon: Search, path: "/analytics/explorer" },
  { id: "cohort", label: "Cohort & Retention", icon: Users, path: "/analytics/cohort" },
  { id: "revenue", label: "Revenue Intelligence", icon: TrendingUp, path: "/analytics/revenue" },
  { id: "quality", label: "Data Quality Monitor", icon: Database, path: "/analytics/quality" },
];

export default function AnalyticsSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // ✅ collapse state
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("analytics-sidebar-collapsed");
    if (saved) setCollapsed(JSON.parse(saved));
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("analytics-sidebar-collapsed", JSON.stringify(next));
  };

  return (
    <aside
      className={`${
        collapsed ? "w-20" : "w-64"
      } bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800
      text-slate-900 dark:text-slate-100 p-4 flex flex-col gap-6 overflow-y-auto transition-all duration-300`}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between mb-2">
        {!collapsed && (
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-2">
            Analytics
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

      {/* NAV ITEMS */}
      {items.map(({ id, label, icon: Icon, path }) => {
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
    </aside>
  );
}