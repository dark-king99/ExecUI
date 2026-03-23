import { useState, useMemo } from "react";
import { Search, AlertTriangle, Info, ShieldAlert, CheckCircle2 } from "lucide-react";

/**
 * Props:
 *  - alerts: Array of {
 *      id, time, device, message, severity: "Critical"|"Warning"|"Info",
 *      status: "Open"|"Acknowledged"|"Resolved"
 *    }
 *  - search: string
 *  - filterSeverity: "All" | "Critical" | "Warning" | "Info"
 *  - filterStatus: "All" | "Open" | "Acknowledged" | "Resolved"
 *  - onRowClick?: (alert) => void
 */
export default function AlertTable({
  alerts = [],
  search = "",
  filterSeverity = "All",
  filterStatus = "All",
  onRowClick,
}) {
  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      const matchesSearch =
        a.device.toLowerCase().includes(search.toLowerCase()) ||
        a.message.toLowerCase().includes(search.toLowerCase());

      const matchesSeverity =
        filterSeverity === "All" || a.severity === filterSeverity;

      const matchesStatus =
        filterStatus === "All" || a.status === filterStatus;

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [alerts, search, filterSeverity, filterStatus]);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60">
          <tr className="text-left">
            <th className="p-3 font-medium text-slate-600 dark:text-slate-300">Time</th>
            <th className="p-3 font-medium text-slate-600 dark:text-slate-300">Device</th>
            <th className="p-3 font-medium text-slate-600 dark:text-slate-300">Message</th>
            <th className="p-3 font-medium text-slate-600 dark:text-slate-300">Severity</th>
            <th className="p-3 font-medium text-slate-600 dark:text-slate-300">Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((a) => (
            <tr
              key={a.id}
              onClick={() => onRowClick?.(a)}
              className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
            >
              <td className="p-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {a.time}
              </td>
              <td className="p-3 font-medium text-slate-900 dark:text-slate-100">
                {a.device}
              </td>
              <td className="p-3 text-slate-700 dark:text-slate-200">
                {a.message}
              </td>
              <td className="p-3">
                <SeverityBadge severity={a.severity} />
              </td>
              <td className="p-3">
                <StatusBadge status={a.status} />
              </td>
            </tr>
          ))}

          {filtered.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="p-6 text-center text-slate-500 dark:text-slate-400"
              >
                No alerts match your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* --- Badges --- */

function SeverityBadge({ severity }) {
  if (severity === "Critical") {
    return (
      <span className="inline-flex items-center gap-2 text-red-600 dark:text-red-400 font-medium">
        <ShieldAlert size={14} /> Critical
      </span>
    );
  }
  if (severity === "Warning") {
    return (
      <span className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
        <AlertTriangle size={14} /> Warning
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
      <Info size={14} /> Info
    </span>
  );
}

function StatusBadge({ status }) {
  if (status === "Resolved") {
    return (
      <span className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
        <CheckCircle2 size={14} /> Resolved
      </span>
    );
  }
  if (status === "Acknowledged") {
    return (
      <span className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium">
        Acknowledged
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-red-600 dark:text-red-400 font-medium">
      Open
    </span>
  );
}


