import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  DollarSign,
  Settings2,
  Target,
  Megaphone,
  Users,
  ArrowLeft,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';


const menuItems = [
  { id: 'dashboard',  label: 'Dashboard',             icon: LayoutDashboard, path: '/services/dashboard'  },
  { id: 'financial',  label: 'Financial Management',  icon: DollarSign,      path: '/services/financial'  },
  { id: 'operations', label: 'Operations & Systems',  icon: Settings2,       path: '/services/operation'  },
  { id: 'strategic',  label: 'Strategic Planning',    icon: Target,          path: '/services/strategic'  },
  { id: 'marketing',  label: 'Marketing & Sales',     icon: Megaphone,       path: '/services/marketing'  },
  { id: 'team',       label: 'Team & Projects',       icon: Users,           path: '/services/team'       },
];

const accentColors = {
  dashboard: 'text-indigo-500',
  financial: 'text-emerald-500',
  operations: 'text-blue-500',
  strategic: 'text-purple-500',
  marketing: 'text-rose-500',
  team: 'text-amber-500',
};

const bgAccentColors = {
  dashboard: 'bg-indigo-500/10',
  financial: 'bg-emerald-500/10',
  operations: 'bg-blue-500/10',
  strategic: 'bg-purple-500/10',
  marketing: 'bg-rose-500/10',
  team: 'bg-amber-500/10',
};

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
        collapsed ? "w-20" : "w-64"
      } bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800
      text-slate-900 dark:text-slate-100 p-4 flex flex-col gap-4 overflow-y-auto transition-all duration-300`}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between mb-2">
        {!collapsed && (
          <span className="text-lg font-semibold uppercase tracking-wider text-slate-400 px-2">
            Management Services
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
      {menuItems.map(({ id, label, icon: Icon, path }) => {
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
};

export default ServiceSidebar;
