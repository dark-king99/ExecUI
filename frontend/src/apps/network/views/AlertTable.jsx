import { useMemo } from "react";
import { AlertTriangle, Info, ShieldAlert, CheckCircle2, Loader2 } from "lucide-react";
import { SkeletonTable } from "../../../components/ui/Skeleton";

/**
 * Props:
 *  - alerts: Alert[]
 *  - loading: boolean
 *  - search: string
 *  - filterSeverity: "All"|"Critical"|"Warning"|"Info"
 *  - filterStatus: "All"|"Open"|"Acknowledged"|"Resolved"
 *  - onRowClick?: (alert) => void
 *  - onAcknowledge?: (alert) => void
 *  - onResolve?: (alert) => void
 */
export default function AlertTable({
  alerts = [],
  loading = false,
  search = "",
  filterSeverity = "All",
  filterStatus = "All",
  onRowClick,
  onAcknowledge,
  onResolve,
}) {
  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      const matchesSearch =
        (a.device ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (a.message ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesSeverity = filterSeverity === "All" || a.severity === filterSeverity;
      const matchesStatus   = filterStatus   === "All" || a.status   === filterStatus;
      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [alerts, search, filterSeverity, filterStatus]);

  if (loading) return <SkeletonTable rows={6} />;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60">
          <tr className="text-left">
            <th className="p-3 text-xs font-semibold uppercase text-slate-400">Time</th>
            <th className="p-3 text-xs font-semibold uppercase text-slate-400">Device</th>
            <th className="p-3 text-xs font-semibold uppercase text-slate-400">Message</th>
            <th className="p-3 text-xs font-semibold uppercase text-slate-400">Severity</th>
            <th className="p-3 text-xs font-semibold uppercase text-slate-400">Status</th>
            {(onAcknowledge || onResolve) && (
              <th className="p-3 text-xs font-semibold uppercase text-slate-400">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {filtered.length > 0 ? (
            filtered.map((a) => (
              <tr
                key={a.id}
                onClick={() => onRowClick?.(a)}
                className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
              >
                <td className="p-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {a.time ?? a.timestamp ?? "—"}
                </td>
                <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{a.device ?? "—"}</td>
                <td className="p-3 text-slate-700 dark:text-slate-200">{a.message ?? "—"}</td>
                <td className="p-3"><SeverityBadge severity={a.severity} /></td>
                <td className="p-3"><StatusBadge status={a.status} /></td>
                {(onAcknowledge || onResolve) && (
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      {onAcknowledge && a.status === "Open" && (
                        <button
                          onClick={() => onAcknowledge(a)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Acknowledge
                        </button>
                      )}
                      {onResolve && a.status !== "Resolved" && (
                        <button
                          onClick={() => onResolve(a)}
                          className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={(onAcknowledge || onResolve) ? 6 : 5}
                className="p-8 text-center text-slate-500 dark:text-slate-400"
              >
                {alerts.length === 0 ? "No alerts — system is healthy." : "No alerts match the current filters."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SeverityBadge({ severity }) {
  if (severity === "Critical") {
    return (
      <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium text-xs">
        <ShieldAlert size={13} /> Critical
      </span>
    );
  }
  if (severity === "Warning") {
    return (
      <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium text-xs">
        <AlertTriangle size={13} /> Warning
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium text-xs">
      <Info size={13} /> Info
    </span>
  );
}

function StatusBadge({ status }) {
  if (status === "Resolved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-xs">
        <CheckCircle2 size={13} /> Resolved
      </span>
    );
  }
  if (status === "Acknowledged") {
    return (
      <span className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium text-xs">
        Acknowledged
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium text-xs">
      Open
    </span>
  );
}
