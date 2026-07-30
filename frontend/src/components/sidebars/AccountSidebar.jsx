import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import {

  ArrowLeft, User, ShieldCheck, Key, KeyRound, Bell, Users, Plug, MessagesSquare,
  CreditCard, FileText, ChevronLeft, ChevronRight, Building2, IdCard, Webhook, Zap, Scale,

  BadgeCheck,
} from "lucide-react";

const personalItems = [
  { id: "profile",       label: "Profile",       icon: User,           path: "/account/profile" },
  // Your own employment details, leave, timesheet and payslips. This is *your*
  // record, not the HR console — which is why it belongs beside your profile
  // rather than in a People Ops module you have no business opening.
  { id: "my-hr",         label: "My HR",         icon: BadgeCheck,     path: "/account/my-hr" },
  { id: "messaging",     label: "Messaging",     icon: MessagesSquare, path: "/account/messaging" },
  { id: "security",      label: "Security",      icon: ShieldCheck,    path: "/account/security" },
  { id: "notifications", label: "Notifications", icon: Bell,           path: "/account/notifications" },
];

const orgItems = [
  { id: "organization", label: "Organization",        icon: Building2,   path: "/account/organization" },
  { id: "members",      label: "Members",             icon: Users,       path: "/account/members" },
  { id: "team",         label: "Roles & Permissions", icon: ShieldCheck, path: "/account/team" },
  { id: "sso",          label: "Single Sign-On",      icon: KeyRound,    path: "/account/sso" },
  { id: "integrations", label: "Integrations",        icon: Plug,        path: "/account/integrations" },
  { id: "billing",      label: "Billing",             icon: CreditCard,  path: "/account/billing" },
  { id: "workflows",    label: "Automation",          icon: Zap,         path: "/account/workflows" },
  { id: "developer",    label: "Developer",           icon: Webhook,     path: "/account/developer" },
  { id: "compliance",   label: "Compliance",          icon: Scale,       path: "/account/compliance" },
  { id: "audit",        label: "Audit Logs",          icon: FileText,    path: "/account/audit" },
];


function NavBtn({ icon: Icon, label, path, current, collapsed, onNavigate }) {
  const active = current === path;
  return (
    <button
      onClick={() => onNavigate(path)}
      title={collapsed ? label : undefined}
      className={`relative flex items-center ${collapsed ? "justify-center" : "gap-2.5"} w-full px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 group ${
        active
          ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200"
      }`}
    >
      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-slate-600 dark:bg-slate-400 rounded-r-full" />}
      <Icon size={15} className={`shrink-0 ${active ? "text-slate-700 dark:text-slate-300" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`} />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

export default function AccountSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const { user: signedIn, isAdmin } = useUser();
  const user = signedIn ?? {};
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Account";

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
    <aside className={`${collapsed ? "w-[60px]" : "w-60"} shrink-0 flex flex-col h-full bg-white dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800/80 transition-all duration-250`}>
      {/* Header */}
      <div className="flex items-center h-14 px-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
        <div className={`flex items-center gap-2.5 flex-1 min-w-0 ${collapsed ? "justify-center" : ""}`}>
          <div className="h-7 w-7 rounded-lg bg-slate-700 flex items-center justify-center shrink-0 shadow-sm">
            <User size={14} className="text-white" />
          </div>
          {!collapsed && <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-none">Account</span>}
        </div>
        <button onClick={toggleCollapse} className="ml-auto p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* Identity block */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{fullName}</div>
            <div className="text-xs text-slate-400 truncate">{user.email}</div>
            <div className="flex items-center gap-3 mt-2 text-[11px]">
              {user.enterprise && <span className="inline-flex items-center gap-1 text-slate-500 truncate"><Building2 size={11} />{user.enterprise}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Back button */}
      <div className="px-2 pt-2">
        <button onClick={() => navigate("/overview")} className={`flex items-center ${collapsed ? "justify-center" : "gap-2"} w-full px-2.5 py-2 rounded-lg text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition`}>
          <ArrowLeft size={13} />
          {!collapsed && "Back to main"}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 pt-1 space-y-0.5">
        {!collapsed && <p className="px-2.5 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-600 select-none">Personal</p>}
        {collapsed && <div className="my-1.5 border-t border-slate-100 dark:border-slate-800/60" />}
        {personalItems.map((it) => (
          <NavBtn key={it.id} {...it} current={pathname} collapsed={collapsed} onNavigate={navigate} />
        ))}

        {isAdmin && (
          <>
            {!collapsed && <p className="px-2.5 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-600 select-none">Organization</p>}
            {collapsed && <div className="my-1.5 border-t border-slate-100 dark:border-slate-800/60" />}
            {orgItems.map((it) => (
              <NavBtn key={it.id} {...it} current={pathname} collapsed={collapsed} onNavigate={navigate} />
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
