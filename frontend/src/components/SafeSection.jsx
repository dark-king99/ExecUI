import ErrorBoundary from "./ErrorBoundary";

export default function SafeSection({ label, children }) {
  return (
    <section
      className="
        bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6
      "
    >
      {label && (
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
          {label}
        </h3>
      )}
    <ErrorBoundary>{children}</ErrorBoundary>
    </section>
  );
}
