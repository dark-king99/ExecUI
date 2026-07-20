import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const icons = {
  success: <CheckCircle size={16} className="text-emerald-500" />,
  error:   <XCircle    size={16} className="text-red-500" />,
  warning: <AlertTriangle size={16} className="text-amber-500" />,
  info:    <Info       size={16} className="text-sky-500" />,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback(({ message, type = "info", duration = 3500 }) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // The context value is callable — toast({ message, type }) — AND exposes
  // shorthand methods — toast.success("…") / .error / .warning / .info — so both
  // call styles used across the app work against a single toast system.
  const toast = useMemo(() => {
    const fn = (opts) => push(typeof opts === "string" ? { message: opts } : opts);
    for (const t of ["success", "error", "warning", "info"]) {
      fn[t] = (message, opts = {}) => push({ message, type: t, ...opts });
    }
    return fn;
  }, [push]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg px-4 py-3 min-w-[260px] max-w-sm"
          >
            {icons[t.type]}
            <span className="text-sm text-slate-800 dark:text-slate-200 flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
