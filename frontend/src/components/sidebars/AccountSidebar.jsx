import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, User, ShieldCheck, Key, Bell, Users,
  CreditCard, FileText, ChevronLeft, ChevronRight
} from "lucide-react";

const items = [
  { id: "profile", label: "Profile", icon: User, path: "/account/profile" },
  { id: "security", label: "Security", icon: ShieldCheck, path: "/account/security" },
  { id: "api-keys", label: "API Keys", icon: Key, path: "/account/api-keys" },
  { id: "notifications", label: "Notifications", icon: Bell, path: "/account/notifications" },
  { id: "team", label: "Team Permissions", icon: Users, path: "/account/team" },
  { id: "billing", label: "Billing", icon: CreditCard, path: "/account/billing" },
  { id: "audit", label: "Audit Logs", icon: FileText, path: "/account/audit" },
];

export default function AccountSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // ✅ collapse state
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("account-sidebar-collapsed");
    if (saved) setCollapsed(JSON.parse(saved));
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("account-sidebar-collapsed", JSON.stringify(next));
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
            Account
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