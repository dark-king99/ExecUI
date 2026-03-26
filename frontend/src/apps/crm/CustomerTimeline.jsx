import { AlertCircle } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { crm } from "../../services/api";

const BADGE = {
  email:  "bg-blue-100 text-blue-700",
  call:   "bg-green-100 text-green-700",
  ticket: "bg-amber-100 text-amber-700",
  note:   "bg-slate-100 text-slate-700",
};

export default function CustomerTimeline() {
  const { data, loading, error } = useApi(
    () => crm.customers.list({ limit: 5, includeTimeline: true }),
    [],
    { pollingInterval: 30000 }
  );

  const customers = Array.isArray(data) ? data : [];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white">Customer Timeline</h3>
        <p className="text-sm text-slate-500">Recent interactions across email, calls, tickets, and notes</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {loading && customers.length === 0 && (
        <div className="space-y-4 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
        </div>
      )}

      {!loading && !error && customers.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-4">No customer timeline data available.</p>
      )}

      {customers.map(block => (
        <div key={block.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <p className="font-medium text-slate-900 dark:text-white mb-3">{block.name}</p>
          {block.timeline?.length > 0 ? (
            <ul className="space-y-2">
              {block.timeline.map((event, idx) => (
                <li key={event.id ?? idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${BADGE[event.type] ?? BADGE.note}`}>
                      {event.type}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">{event.text ?? event.title}</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {event.daysAgo != null ? `${event.daysAgo}d ago` : event.date}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">No recent events.</p>
          )}
        </div>
      ))}
    </div>
  );
}
