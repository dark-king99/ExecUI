const variants = {
  success:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  warning:  "bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400",
  danger:   "bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400",
  info:     "bg-sky-100    text-sky-700    dark:bg-sky-900/30    dark:text-sky-400",
  neutral:  "bg-slate-100  text-slate-600  dark:bg-slate-800     dark:text-slate-400",
  indigo:   "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
};

const dots = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger:  "bg-red-500",
  info:    "bg-sky-500",
  neutral: "bg-slate-400",
  indigo:  "bg-indigo-500",
};

export default function StatusBadge({ label, variant = "neutral", dot = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dots[variant]}`} />}
      {label}
    </span>
  );
}
