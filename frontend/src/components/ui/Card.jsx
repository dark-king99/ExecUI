export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon: Icon, actions }) {
  return (
    <div className="flex items-start justify-between p-5 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="h-9 w-9 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
            <Icon size={18} className="text-orange-600 dark:text-orange-400" />
          </div>
        )}
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ children, className = "" }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function Stat({ label, value, delta, icon: Icon, color = "orange" }) {
  const colors = {
    orange:  "text-orange-600  dark:text-orange-400  bg-orange-50  dark:bg-orange-900/30",
    indigo:  "text-indigo-600  dark:text-indigo-400  bg-indigo-50  dark:bg-indigo-900/30",
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30",
    amber:   "text-amber-600   dark:text-amber-400   bg-amber-50   dark:bg-amber-900/30",
    red:     "text-red-600     dark:text-red-400     bg-red-50     dark:bg-red-900/30",
    sky:     "text-sky-600     dark:text-sky-400     bg-sky-50     dark:bg-sky-900/30",
    violet:  "text-violet-600  dark:text-violet-400  bg-violet-50  dark:bg-violet-900/30",
  };
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
        {Icon && (
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${colors[color] ?? colors.orange}`}>
            <Icon size={16} />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
      {delta !== undefined && (
        <div className={`text-xs mt-1 font-medium ${delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {delta >= 0 ? "+" : ""}{delta}% vs last period
        </div>
      )}
    </div>
  );
}
