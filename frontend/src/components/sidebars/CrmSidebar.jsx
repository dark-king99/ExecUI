import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SOLUTIONS, colorOf } from "../../apps/crm/solutions.config";
import { Users, ArrowLeft, LayoutGrid, ChevronDown, ChevronRight, ChevronLeft, Building } from "lucide-react";

import { canAccessSolution } from "../../lib/access";
import { useUser } from "../../context/UserContext";
import { useCrmSolutions } from "../../context/IndustryContext";

function PageLink({ page, active, color, onNavigate }) {
  const Icon = page.icon;
  const c = colorOf(color);
  return (
    <button
      onClick={() => onNavigate(page.path)}
      className={`w-full flex items-center gap-2 text-left px-2.5 py-1.5 rounded-lg text-sm transition ${
        active
          ? `${c.soft} ${c.softText} font-medium`
          : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200"
      }`}
    >
      <Icon size={13} className="shrink-0" />
      <span className="truncate">{page.label}</span>
    </button>
  );
}

function SolutionGroup({ solution, pathname, collapsed, onNavigate }) {
  const root = solution.pages[0].path;
  const isActive = pathname === root || pathname.startsWith(root + "/");
  const [open, setOpen] = useState(isActive);
  const c = colorOf(solution.color);
  const Icon = solution.icon;

  useEffect(() => { if (isActive) setOpen(true); }, [isActive]);

  if (collapsed) {
    return (
      <button
        onClick={() => onNavigate(root)}
        title={solution.name}
        className={`flex items-center justify-center w-full px-2.5 py-2 rounded-lg transition ${
          isActive ? c.soft : "hover:bg-slate-50 dark:hover:bg-slate-800/70"
        }`}
      >
        <Icon size={16} className={isActive ? c.text : "text-slate-400 dark:text-slate-500"} />
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`relative flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-sm font-medium transition ${
          isActive
            ? `${c.soft} ${c.softText}`
            : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70"
        }`}
      >
        {isActive && <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 ${c.bg} rounded-r-full`} />}
        <span className="flex items-center gap-2.5 min-w-0">
          <Icon size={15} className={isActive ? c.text : "text-slate-400 dark:text-slate-500"} />
          <span className="truncate">{solution.name}</span>
        </span>
        {open ? <ChevronDown size={13} className="text-slate-400 shrink-0" /> : <ChevronRight size={13} className="text-slate-400 shrink-0" />}
      </button>

      {open && (
        <div className="ml-4 pl-3 border-l border-slate-100 dark:border-slate-800 space-y-0.5 mt-0.5 mb-1">
          {solution.pages.map((p) => (
            <PageLink
              key={p.id}
              page={p}
              color={solution.color}
              active={pathname === p.path || (p.path !== root && pathname.startsWith(p.path + "/"))}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CrmSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useUser();


  const solutions = useCrmSolutions();

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("crm-sidebar-collapsed");
    if (saved) setCollapsed(JSON.parse(saved));
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("crm-sidebar-collapsed", JSON.stringify(next));
  };

  const onHome = pathname === "/crm";

  return (
    <aside
      className={`${collapsed ? "w-[60px]" : "w-60"} shrink-0 flex flex-col h-full bg-white dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800/80 transition-all duration-250`}
    >
      {/* Header */}
      <div className="flex items-center h-14 px-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
        <div className={`flex items-center gap-2.5 flex-1 min-w-0 ${collapsed ? "justify-center" : ""}`}>
          <div className="h-7 w-7 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/25">
            <img src="/remote.png" />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-none">
              Sales Cloud
            </span>
          )}
        </div>
        <button
          onClick={toggleCollapse}
          className="ml-auto p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* Back to main */}
      <div className="px-2 pt-2">
        <button
          onClick={() => navigate("/overview")}
          className={`flex items-center ${collapsed ? "justify-center" : "gap-2"} w-full px-2.5 py-2 rounded-lg text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition`}
        >
          <ArrowLeft size={13} />
          {!collapsed && "Back to main"}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3 pt-1 space-y-0.5">
        {/* Solutions launcher */}
        <button
          onClick={() => navigate("/crm")}
          title={collapsed ? "All Solutions" : undefined}
          className={`relative flex items-center ${collapsed ? "justify-center" : "gap-2.5"} w-full px-2.5 py-2 rounded-lg text-sm font-medium transition ${
            onHome
              ? "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70"
          }`}
        >
          {onHome && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-orange-500 rounded-r-full" />}
          <LayoutGrid size={15} className={onHome ? "text-orange-500 dark:text-orange-400" : "text-slate-400 dark:text-slate-500"} />
          {!collapsed && "All Solutions"}
        </button>

        {!collapsed && (
          <p className="px-2.5 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600 select-none">
            Solutions
          </p>
        )}
        {collapsed && <div className="my-1.5 border-t border-slate-100 dark:border-slate-800/60" />}

        <div className="space-y-0.5">
         <div>
          {SOLUTIONS.filter((s) => canAccessSolution(user, "crm", s.id)).map((s) => (
            <SolutionGroup key={s.id} solution={s} pathname={pathname} collapsed={collapsed} onNavigate={navigate} />
          ))}
        </div>

          {solutions
            .filter((s) => s.isIndustry || canAccessSolution(user, "crm", s.id))
            .map((s) => (
              <SolutionGroup key={s.id} solution={s} pathname={pathname} collapsed={collapsed} onNavigate={navigate} />
            ))}
        </div>

        {/* Industry setup */}
        {!collapsed && (
          <p className="px-2.5 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600 select-none">
            Configure
          </p>
        )}
        {collapsed && <div className="my-1.5 border-t border-slate-100 dark:border-slate-800/60" />}
        <button
          onClick={() => navigate("/crm/industry-setup")}
          title={collapsed ? "Industry" : undefined}
          className={`relative flex items-center ${collapsed ? "justify-center" : "gap-2.5"} w-full px-2.5 py-2 rounded-lg text-sm font-medium transition ${
            pathname === "/crm/industry-setup"
              ? "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70"
          }`}
        >
          <Building size={15} className={pathname === "/crm/industry-setup" ? "text-orange-500 dark:text-orange-400" : "text-slate-400 dark:text-slate-500"} />
          {!collapsed && "Industry"}
        </button>
      </nav>
    </aside>
  );
}
