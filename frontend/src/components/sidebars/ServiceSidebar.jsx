import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, ClipboardList, CheckSquare,
  Gauge, FileBarChart2, Users, Settings, ArrowLeft,
  ChevronLeft, ChevronRight,
} from "lucide-react";

const items = [
  { id: "dashboard",  label: "Dashboard",       icon: LayoutDashboard, path: "/service/dashboard" },
  { id: "catalog",    label: "Service Catalog",  icon: BookOpen,        path: "/service/catalog"  },
  { id: "requests",   label: "My Requests",      icon: ClipboardList,   path: "/service/requests" },
  { id: "approvals",  label: "Approvals",        icon: CheckSquare,     path: "/service/approvals"},
  { id: "sla",        label: "SLA Tracker",      icon: Gauge,           path: "/service/sla"      },
  { id: "knowledge",  label: "Knowledge Base",   icon: BookOpen,        path: "/service/knowledge"},
  { id: "reports",    label: "Reports",          icon: FileBarChart2,   path: "/service/reports"  },
  { id: "team",       label: "Team",             icon: Users,           path: "/service/team"     },
  { id: "settings",   label: "Settings",         icon: Settings,        path: "/service/settings" },
];

export default function ServiceSidebar() {
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
    <aside className={`${collapsed ? "w-20" : "w-64"} bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-4 flex flex-col gap-2 overflow-y-auto transition-all duration-300`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        {!collapsed && (
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-2">
            Managerial Services
          </span>
        )}
        <button onClick={toggleCollapse} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Back */}
      <button
        onClick={() => navigate("/home")}
        className={`flex items-center ${collapsed ? "justify-center" : "gap-2"} w-full p-2 rounded-lg text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition mb-2`}
      >
        <ArrowLeft size={16} />
        {!collapsed && "Back to Main"}
      </button>

      {/* Nav items */}
      {items.map(({ id, label, icon: Icon, path }) => {
        const active = pathname === path || pathname.startsWith(path + "/");
        return (
          <button
            key={id}
            onClick={() => navigate(path)}
            className={`flex items-center ${collapsed ? "justify-center" : "gap-2"} w-full px-3 py-2 rounded-lg text-sm transition ${
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
