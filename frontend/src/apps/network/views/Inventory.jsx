import { useState, useMemo } from "react";
import { useApi } from "../../../hooks/useApi";
import { network } from "../../../services/api";
import { SkeletonTable } from "../../../components/ui/Skeleton";
import { Search, RefreshCw, AlertTriangle } from "lucide-react";

function StatusBadge({ status }) {
  let color = "bg-slate-400";
  if (status === "Online")  color = "bg-green-500";
  if (status === "Warning") color = "bg-amber-500";
  if (status === "Offline") color = "bg-red-500";
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {status}
    </span>
  );
}

export default function Inventory() {
  const [search,       setSearch]       = useState("");
  const [filterType,   setFilterType]   = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const {
    data: devices,
    loading,
    error,
    refetch,
  } = useApi(
    () => network.devices.list({ limit: 500 }),
    [],
    { pollingInterval: 30000 }
  );

  const filteredDevices = useMemo(() => {
    if (!devices) return [];
    return devices.filter((d) => {
      const matchesSearch =
        d.name?.toLowerCase().includes(search.toLowerCase()) ||
        d.ip?.includes(search);
      const matchesType   = filterType   === "All" || d.type   === filterType;
      const matchesStatus = filterStatus === "All" || d.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [devices, search, filterType, filterStatus]);

  // Derive available type options from live data
  const typeOptions = useMemo(() => {
    if (!devices) return [];
    return [...new Set(devices.map((d) => d.type).filter(Boolean))];
  }, [devices]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-slate-900 dark:text-white font-semibold">Network Inventory</h1>
          <p className="text-slate-500">Manage and track all devices, servers, endpoints, and cloud nodes.</p>
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded px-3 py-2 bg-white dark:bg-slate-900">
          <Search size={16} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or IP..."
            className="outline-none bg-transparent text-sm"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border border-slate-200 dark:border-slate-800 rounded px-3 py-2 text-sm bg-white dark:bg-slate-900"
        >
          <option value="All">All Types</option>
          {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-slate-200 dark:border-slate-800 rounded px-3 py-2 text-sm bg-white dark:bg-slate-900"
        >
          <option value="All">All Status</option>
          <option value="Online">Online</option>
          <option value="Warning">Warning</option>
          <option value="Offline">Offline</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={8} />
      ) : (
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
              <tr className="text-left">
                {["Name","Type","Status","IP","Location","Last Seen"].map((h) => (
                  <th key={h} className="p-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredDevices.length > 0 ? (
                filteredDevices.map((d) => (
                  <tr key={d.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition">
                    <td className="p-3 font-medium">{d.name}</td>
                    <td className="p-3">{d.type}</td>
                    <td className="p-3"><StatusBadge status={d.status} /></td>
                    <td className="p-3 font-mono text-xs">{d.ip}</td>
                    <td className="p-3">{d.location}</td>
                    <td className="p-3 text-slate-500">{d.lastSeen ?? "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    {devices?.length === 0 ? "No devices discovered yet." : "No devices match the current filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && devices?.length > 0 && (
        <p className="text-xs text-slate-400">
          Showing {filteredDevices.length} of {devices.length} devices · Auto-refreshing every 30s
        </p>
      )}
    </div>
  );
}
