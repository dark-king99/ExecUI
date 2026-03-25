import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, User, ShieldCheck, Key, Bell, Users, CreditCard, FileText,
} from "lucide-react";

const items = [
  { id: "profile",       label: "Profile",          icon: User,        path: "/account/profile" },
  { id: "security",      label: "Security",         icon: ShieldCheck, path: "/account/security" },
  { id: "api-keys",      label: "API Keys",         icon: Key,         path: "/account/api-keys" },
  { id: "notifications", label: "Notifications",    icon: Bell,        path: "/account/notifications" },
  { id: "team",          label: "Team Permissions", icon: Users,       path: "/account/team" },
  { id: "billing",       label: "Billing",          icon: CreditCard,  path: "/account/billing" },
  { id: "audit",         label: "Audit Logs",       icon: FileText,    path: "/account/audit" },
];

export default function AccountSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <aside className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-4 flex flex-col gap-8 overflow-y-auto">
      <button
        onClick={() => navigate("/home")}
        className="flex items-center gap-2 w-full p-2 rounded-lg text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 mb-3 transition"
      >
        <ArrowLeft size={16} /> Back to Main
      </button>

      <div className="px-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Account</span>
      </div>

      {items.map(({ id, label, icon: Icon, path }) => {
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
    </aside>
  );
}
