import { useState, useMemo } from "react";
import { Bell, Search, RefreshCw, AlertCircle, CheckCircle, X, Clock, AlertTriangle } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader";
import { Stat, Card } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../../components/ui/Skeleton";
import { useToast } from "../../../components/ui/Toast";
import { useApi, useMutation } from "../../../hooks/useApi";
import { network } from "../../../services/api";

const SEV_VARIANT = { Critical: "danger", Warning: "warning", Info: "info", critical: "danger", warning: "warning", info: "info" };
const STATUS_VARIANT = { Open: "danger", Acknowledged: "warning", Resolved: "success", open: "danger", acknowledged: "warning", resolved: "success" };

export default function Alerts() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const { data: alerts, loading, error, refetch } = useApi(() => network.alerts.list({ limit: 200 }), [], { pollingInterval: 15000 });

  const { mutate: acknowledge } = useMutation((id) => network.alerts.acknowledge(id), {
    onSuccess: () => { refetch(); toast({ message: "Alert acknowledged", type: "success" }); },
    onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }),
  });
  const { mutate: resolve } = useMutation((id) => network.alerts.resolve(id), {
    onSuccess: () => { refetch(); toast({ message: "Alert resolved", type: "success" }); },
    onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }),
  });

  const all = alerts ?? [];
  const filtered = useMemo(() => all.filter(a => {
    const matchSearch = !search || a.title?.toLowerCase().includes(search.toLowerCase()) || a.message?.toLowerCase().includes(search.toLowerCase()) || a.device?.toLowerCase().includes(search.toLowerCase());
    const matchSev = sevFilter === "All" || a.severity === sevFilter;
    const matchStatus = statusFilter === "All" || a.status === statusFilter;
    return matchSearch && matchSev && matchStatus;
  }), [all, search, sevFilter, statusFilter]);

  const openCount = all.filter(a => a.status === "Open" || a.status === "open").length;
  const ackCount = all.filter(a => a.status === "Acknowledged" || a.status === "acknowledged").length;
  const critCount = all.filter(a => a.severity === "Critical" || a.severity === "critical").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Network Alerts" subtitle="Monitor and triage issues across your infrastructure"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Auto-refresh 15s</span>
            <button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh</button>
          </div>
        }
      />

      {loading && all.length === 0 ? (
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Open Alerts" value={openCount} icon={Bell} color="red" />
          <Stat label="Acknowledged" value={ackCount} icon={CheckCircle} color="amber" />
          <Stat label="Critical" value={critCount} icon={AlertTriangle} color="red" />
        </div>
      )}

      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 flex-1 max-w-72">
          <Search size={14} className="text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search alerts…" className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white" />
        </div>
        <select value={sevFilter} onChange={e => setSevFilter(e.target.value)} className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
          {["All", "Critical", "Warning", "Info"].map(s => <option key={s} value={s}>{s === "All" ? "All Severities" : s}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
          {["All", "Open", "Acknowledged", "Resolved"].map(s => <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>)}
        </select>
      </div>

      <Card>
        {loading && all.length === 0 ? <div className="p-5"><SkeletonTable rows={8} /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Severity", "Alert", "Device / Source", "Time", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-500">{all.length === 0 ? "No alerts detected. Network is clear." : "No alerts match filters."}</td></tr>
                ) : filtered.map((a, i) => (
                  <tr key={a.id ?? i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="p-4"><StatusBadge label={a.severity ?? "info"} variant={SEV_VARIANT[a.severity] ?? "neutral"} /></td>
                    <td className="p-4">
                      <div className="font-medium text-slate-900 dark:text-white">{a.title ?? a.message ?? a.description ?? "—"}</div>
                      {a.details && <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{a.details}</div>}
                    </td>
                    <td className="p-4 text-slate-500">{a.device ?? a.source ?? "—"}</td>
                    <td className="p-4 text-slate-400 text-xs">
                      <div className="flex items-center gap-1"><Clock size={11} />{a.time ?? a.timestamp ?? a.createdAt ?? "—"}</div>
                    </td>
                    <td className="p-4"><StatusBadge label={a.status ?? "open"} variant={STATUS_VARIANT[a.status] ?? "neutral"} dot /></td>
                    <td className="p-4">
                      <div className="flex gap-1.5">
                        {(a.status === "Open" || a.status === "open") && (
                          <button onClick={() => acknowledge(a.id)} className="text-xs px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 transition">Ack</button>
                        )}
                        {a.status !== "Resolved" && a.status !== "resolved" && (
                          <button onClick={() => resolve(a.id)} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition">Resolve</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
