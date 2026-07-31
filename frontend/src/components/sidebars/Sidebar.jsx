import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Server, Home, Users, TrendingUp, BarChart3, UserLock, Building2,
  ChevronLeft, ChevronRight, Settings, Layers, Activity, LayoutDashboard, Trophy, CheckCircle2,
  FileText, FileSignature, UserCog, LifeBuoy
} from "lucide-react";
import { visible } from "../../lib/visibility";
import { useUser } from "../../context/UserContext";
import AnimatedLogo from "../AnimatedLogo";
import { useBranding } from "../../hooks/useBranding";

/**
 * The whole primary nav, declared. Each entry says what it needs; `canSee`
 * decides. Nothing is rendered that the viewer can't open — an entry that would
 * bounce them somewhere else is noise, and an entry naming something their plan
 * doesn't include or their role doesn't allow tells them something they weren't
 * meant to be told.
 */
const OVERVIEW = [
  { label: "Home",               path: "/home",      icon: Home },
  { label: "Executive Overview", path: "/overview",  icon: LayoutDashboard },
  { label: "Approvals",          path: "/approvals", icon: CheckCircle2 },
  { label: "Documents",          path: "/documents", icon: FileText },
  // The contract register commits the organization legally.
  { label: "Contracts",          path: "/contracts", icon: FileSignature, adminOnly: true },
  // People operations — employment records, compensation, leave, payroll. An
  // employee's own details live under Account, not here, so this entry is
  // administrators only and simply doesn't exist for anybody else.
  { label: "HR",                 path: "/people",    icon: UserCog, adminOnly: true },
  { label: "Rewards",            path: "/rewards",   icon: Trophy },
  { label: "Account",            path: "/account",   icon: UserLock },
];

const MODULES = [
  { section: "crm",       label: "CRM",       path: "/crm",       icon: Users },
  { section: "crm",       label: "Helpdesk",  path: "/helpdesk",  icon: LifeBuoy },
  { section: "marketing", label: "Marketing", path: "/marketing", icon: TrendingUp },
  { section: "network",   label: "Network",   path: "/network",   icon: Server },
  { section: "analytics", label: "Analytics", path: "/analytics", icon: BarChart3 },
  { section: "services",  label: "Services",  path: "/services",  icon: Layers },
];

function NavBtn({ icon: Icon, label, path, current, collapsed }) {
  const navigate = useNavigate();
  const active = current?.startsWith(path);

  return (
    <button
      onClick={() => navigate(path)}
      title={collapsed ? label : undefined}
      className={`relative flex items-center ${
        collapsed ? "justify-center" : "gap-2.5"
      } w-full px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 group ${
        active
          ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
          : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-600 dark:bg-indigo-400 rounded-r-full" />
      )}
      <Icon
        size={16}
        className={`shrink-0 transition-colors ${
          active
            ? "text-indigo-600 dark:text-indigo-400"
            : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
        }`}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

function SectionLabel({ label, collapsed }) {
  if (collapsed) return <div className="my-2 border-t border-slate-100 dark:border-slate-800/60" />;
  return (
    <p className="px-2.5 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600 select-none">
      {label}
    </p>
  );
}

export default function Sidebar() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { user, role } = useUser();
  const branding = useBranding();
  const modules = visible(user, MODULES, role);

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
      className={`${
        collapsed ? "w-[60px]" : "w-56"
      } shrink-0 flex flex-col h-full bg-white dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800/80 transition-all duration-250 ease-in-out`}
    >
      {/* ── Logo row ──────────────────────────────────────────────────── */}
      <div
        className={`flex items-center h-14 px-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        {!collapsed && (
          // A white-labelled tenant shows their own mark; everyone else gets the
          // transparent-ground wordmark, animated with a light sweep. The
          // fallback is the default, so an install that hasn't set a logo — or
          // whose plan doesn't include branding — looks exactly as it did.
          branding.logoUrl
            ? <img src={branding.logoUrl} alt={branding.organizationName ?? branding.productName}
                className="h-8 max-w-[150px] object-contain" />
            : <AnimatedLogo className="h-8" />
        )}
        <button
          onClick={toggleCollapse}
          className={`${collapsed ? "" : "ml-auto"} p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition`}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* ── Nav ───────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        <SectionLabel label="Overview" collapsed={collapsed} />

        {visible(user, OVERVIEW, role).map((e) => (
          <NavBtn key={e.path} icon={e.icon} label={e.label} path={e.path} current={pathname} collapsed={collapsed} />
        ))}

        {/* No modules, no heading — an empty section label is a promise of
            something that isn't there. */}
        {modules.length > 0 && <SectionLabel label="Modules" collapsed={collapsed} />}

        {modules.map((m) => (
          <NavBtn key={m.path} icon={m.icon} label={m.label} path={m.path} current={pathname} collapsed={collapsed} />
        ))}
      </nav>

      {/* ── Bottom ────────────────────────────────────────────────────── */}
      <div className="px-2 pb-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <NavBtn
          icon={Settings}
          label="Settings"
          path="/account/security"
          current={pathname}
          collapsed={collapsed}
        />
      </div>
    </aside>
  );
}
