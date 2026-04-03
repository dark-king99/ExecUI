import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Server, Home, Users, TrendingUp, BarChart3, UserLock, Building2,
  ChevronLeft, ChevronRight, User, Settings
} from "lucide-react";


function NavBtn({ icon: Icon, label, path, current, collapsed }) {
  const navigate = useNavigate();
  const active = current?.startsWith(path);

  return (
    <button
      onClick={() => navigate(path)}
      className={`flex items-center ${
        collapsed ? "justify-center" : "gap-2"
      } w-full p-2 rounded-lg text-sm transition ${
        active
          ? "bg-indigo-600 text-white"
          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
      }`}
    >
      <Icon size={18} />
      {!collapsed && <span>{label}</span>}
    </button>
  );
}

export default function Sidebar() {
  const { pathname } = useLocation();

  const [collapsed, setCollapsed] = useState(false);

  const bottomNavItems = [
    { path: "/profile", icon: User, label: "Profile" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

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
      className={`${collapsed ? "w-20" : "w-64"} bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800
      text-slate-900 dark:text-slate-100 p-4 flex flex-col justify-between transition-all duration-300`}
    >
      {/* TOP */}
      <div className="flex flex-col gap-6">
        {/* HEADER */}
        <div className="flex items-center justify-between px-2 py-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Building2 size={16} />
            </div>

            {!collapsed && (
              <div className="text-sm font-semibold truncate">
                My Enterprise
              </div>
            )}
          </div>

          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* MAIN NAV */}
        <NavBtn icon={Home} label="Home" path="/home" current={pathname} collapsed={collapsed} />
        <NavBtn icon={UserLock} label="Account" path="/account" current={pathname} collapsed={collapsed} />
        <NavBtn icon={Users} label="CRM" path="/crm" current={pathname} collapsed={collapsed} />
        <NavBtn icon={TrendingUp} label="Marketing" path="/marketing" current={pathname} collapsed={collapsed} />
        <NavBtn icon={Server} label="Networks" path="/network" current={pathname} collapsed={collapsed} />
        <NavBtn icon={BarChart3} label="Analytics" path="/analytics" current={pathname} collapsed={collapsed} />
      </div>

      {/* BOTTOM NAV */}
      <div className="flex flex-col gap-1 border-t border-slate-200 dark:border-slate-800 pt-4">
        {bottomNavItems.map(({ path, icon, label }) => (
          <NavBtn
            key={path}
            icon={icon}
            label={label}
            path={path}
            current={pathname}
            collapsed={collapsed} />
        ))}
      </div>
    </aside> 
  );
}