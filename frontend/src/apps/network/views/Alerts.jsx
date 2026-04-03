import { useState } from "react";
import AlertTable from "./AlertTable";
import { useApi, useMutation } from "../../../hooks/useApi";
import { network } from "../../../services/api";
import { useToast } from "../../../components/ui/Toast";
import { Search, RefreshCw, AlertTriangle } from "lucide-react";

export default function Alerts() {
  const toast = useToast();
  const [search,          setSearch]          = useState("");
  const [filterSeverity,  setFilterSeverity]  = useState("All");
  const [filterStatus,    setFilterStatus]    = useState("All");

  const {
    data: alerts,
    loading,
    error,
    refetch,
  } = useApi(
    () => network.alerts.list({ limit: 200 }),
    [],
    { pollingInterval: 15000 }
  );

  const { mutate: acknowledge } = useMutation(
    (id) => network.alerts.acknowledge(id),
    {
      onSuccess: () => { refetch(); toast({ message: "Alert acknowledged.", type: "success" }); },
      onError:   (err) => toast({ message: err?.message ?? "Failed.", type: "error" }),
    }
  );

  const { mutate: resolve } = useMutation(
    (id) => network.alerts.resolve(id),
    {
      onSuccess: () => { refetch(); toast({ message: "Alert resolved.", type: "success" }); },
      onError:   (err) => toast({ message: err?.message ?? "Failed.", type: "error" }),
    }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-slate-900 dark:text-white font-semibold">Network Alerts</h1>
          <p className="text-slate-500">Monitor and triage issues across your network.</p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && alerts && (
            <span className="text-xs text-slate-400">
              {alerts.filter((a) => a.status === "Open").length} open · auto-refresh 15s
            </span>
          )}
          <button
            onClick={refetch}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded px-3 py-2 bg-white dark:bg-slate-900">
          <Search size={16} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts..."
            className="outline-none bg-transparent text-sm"
          />
        </div>

        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="border border-slate-200 dark:border-slate-800 rounded px-3 py-2 text-sm bg-white dark:bg-slate-900"
        >
          <option value="All">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="Warning">Warning</option>
          <option value="Info">Info</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-slate-200 dark:border-slate-800 rounded px-3 py-2 text-sm bg-white dark:bg-slate-900"
        >
          <option value="All">All Statuses</option>
          <option value="Open">Open</option>
          <option value="Acknowledged">Acknowledged</option>
          <option value="Resolved">Resolved</option>
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <AlertTable
        alerts={alerts ?? []}
        loading={loading}
        search={search}
        filterSeverity={filterSeverity}
        filterStatus={filterStatus}
        onAcknowledge={(a) => acknowledge(a.id)}
        onResolve={(a) => resolve(a.id)}
        onRowClick={(a) => console.info("Alert selected:", a.id)}
      />
    </div>
  );
}
