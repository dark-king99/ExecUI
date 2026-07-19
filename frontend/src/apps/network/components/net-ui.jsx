import { NavLink } from "react-router-dom";
import { Stat } from "../../../components/ui/Card";
import { SkeletonCard, SkeletonTable } from "../../../components/ui/Skeleton";
import { AlertCircle } from "lucide-react";
import { SOLUTIONS, getSolutionByPath, colorOf } from "../solutions.config";

const SOLUTIONS_BY_ID = Object.fromEntries(SOLUTIONS.map((s) => [s.id, s]));

/**
 * SolutionShell — chrome every Network Ops solution page renders inside: the
 * solution identity, a tab strip for its sibling pages, and a page header.
 * Modelled on Auvik: one solution, many tabs.
 */
export function SolutionShell({ solutionId, title, subtitle, actions, children }) {
  const solution = SOLUTIONS_BY_ID[solutionId];
  if (!solution) return <div className="space-y-6">{children}</div>;
  const c = colorOf(solution.color);
  const Icon = solution.icon;

  return (
    <div className="space-y-6">
      <div className="-mt-1">
        <div className="flex items-center gap-3 mb-3">
          <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${c.grad} flex items-center justify-center shadow-sm`}>
            <Icon size={17} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{solution.name}</h2>
              <span className={`hidden sm:inline text-[10px] font-medium px-1.5 py-0.5 rounded ${c.chip}`}>Network Ops</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{solution.tagline}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800 -mx-1 px-1">
          {solution.pages.map((p) => {
            const PageIcon = p.icon;
            return (
              <NavLink
                key={p.id}
                to={p.path}
                end={p.path === solution.pages[0].path}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition ${
                    isActive
                      ? `${c.text} border-current`
                      : "text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200"
                  }`
                }
              >
                <PageIcon size={14} />
                {p.label}
              </NavLink>
            );
          })}
        </div>
      </div>

      {(title || actions) && (
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h1>}
            {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}

      {children}
    </div>
  );
}

export function MetricGrid({ items, cols = 4, loading }) {
  const colClass = { 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4", 5: "md:grid-cols-5", 6: "md:grid-cols-6" }[cols] ?? "md:grid-cols-4";
  if (loading) {
    return <div className={`grid grid-cols-2 ${colClass} gap-4`}>{Array.from({ length: cols }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  }
  return (
    <div className={`grid grid-cols-2 ${colClass} gap-4`}>
      {items.map((m) => <Stat key={m.label} label={m.label} value={m.value} delta={m.delta} icon={m.icon} color={m.color} />)}
    </div>
  );
}

export function Section({ title, subtitle, icon: Icon, actions, children, className = "", pad = true }) {
  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && <Icon size={16} className="text-slate-400 shrink-0" />}
            <div className="min-w-0">
              {title && <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={pad ? "p-5" : ""}>{children}</div>
    </div>
  );
}

/** Horizontal bar list. items: [{ label, value, sub?, max? }] */
export function BarList({ items, color = "emerald", format = (v) => v }) {
  const max = Math.max(...items.map((i) => i.max ?? i.value ?? 0), 1);
  const c = colorOf(color);
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div key={it.label}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-600 dark:text-slate-300 font-medium truncate">{it.label}</span>
            <span className="text-slate-500 dark:text-slate-400 shrink-0 ml-2">{format(it.value)}{it.sub && <span className="text-slate-400 ml-1.5">{it.sub}</span>}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className={`h-full rounded-full ${c.bg}`} style={{ width: `${Math.max(2, ((it.value ?? 0) / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Utilization bar that color-shifts on thresholds. */
export function UtilBar({ value }) {
  const v = Math.round(value ?? 0);
  const color = v >= 90 ? "bg-red-500" : v >= 75 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, v)}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-9 text-right">{v}%</span>
    </div>
  );
}

export function ErrorNote({ error }) {
  if (!error) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <AlertCircle size={15} /> {error}
    </div>
  );
}

export function Loading({ table = false, rows = 6 }) {
  if (table) return <div className="p-1"><SkeletonTable rows={rows} /></div>;
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{Array.from({ length: rows }).map((_, i) => <SkeletonCard key={i} />)}</div>;
}

export function Pill({ children, color = "slate" }) {
  const map = {
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
    red: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${map[color] ?? map.slate}`}>{children}</span>;
}

export function Modal({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-slate-700">{footer}</div>}
      </div>
    </div>
  );
}

const fieldCls = "w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500";
export function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
      {children}
    </div>
  );
}
export function TextInput(props) { return <input {...props} className={fieldCls} />; }
export function SelectInput({ children, ...props }) { return <select {...props} className={fieldCls}>{children}</select>; }

export function PrimaryBtn({ children, color = "emerald", ...props }) {
  const c = colorOf(color);
  return <button {...props} className={`text-sm px-4 py-2 rounded-lg ${c.bg} hover:opacity-90 disabled:opacity-60 text-white transition flex items-center gap-1.5`}>{children}</button>;
}
export function GhostBtn({ children, ...props }) {
  return <button {...props} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5">{children}</button>;
}

export const fmtNum = (v) => (v == null || isNaN(v) ? "—" : Number(v).toLocaleString());
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");
export const timeAgo = (d) => {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export { getSolutionByPath };
