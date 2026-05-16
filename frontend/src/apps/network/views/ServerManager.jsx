import { useState } from "react";
import { useApi, useMutation } from "../../../hooks/useApi";
import { useToast } from "../../../components/ui/Toast";
import api from "../../../services/api";
import PageHeader from "../../../components/ui/PageHeader";
import { Stat } from "../../../components/ui/Stat";
import { Card, CardHeader, CardBody } from "../../../components/ui/Card";
import { SkeletonTable } from "../../../components/ui/Skeleton";
import StatusBadge from "../../../components/ui/StatusBadge";
import {
  Server, Plus, Trash2, RotateCcw, RefreshCw, Search,
  Cpu, MemoryStick, HardDrive, X, ChevronDown, ChevronUp
} from "lucide-react";

const ENVIRONMENTS = ["prod", "staging", "dev", "test"];
const STATUSES = ["online", "offline", "maintenance", "rebooting"];
const OS_OPTS = ["linux", "windows", "freebsd", "other"];

const statusColor = {
  online: "success", offline: "danger", maintenance: "warning", rebooting: "info"
};

function UtilBar({ value, label }) {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-0.5">
        <span>{label}</span><span>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const EMPTY = { name: "", hostname: "", ip_address: "", os: "linux", cores: 4, ram_gb: 8, disk_gb: 100, environment: "prod", region: "", tags: "" };

export default function ServerManager() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEnv, setFilterEnv] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: servers = [], loading, refetch } = useApi(() => api.network.servers.list(), []);
  const { data: metrics } = useApi(() => api.network.servers.metrics(), []);

  const createMut = useMutation((d) => api.network.servers.create(d), {
    onSuccess: () => { toast({ message: "Server added", type: "success" }); setShowAdd(false); setForm(EMPTY); refetch(); },
    onError: (e) => toast({ message: e.message, type: "error" }),
  });

  const deleteMut = useMutation((id) => api.network.servers.delete(id), {
    onSuccess: () => { toast({ message: "Server removed", type: "success" }); refetch(); },
    onError: (e) => toast({ message: e.message, type: "error" }),
  });

  const restartMut = useMutation((id) => api.network.servers.restart(id), {
    onSuccess: () => { toast({ message: "Restart initiated", type: "success" }); refetch(); },
    onError: (e) => toast({ message: e.message, type: "error" }),
  });

  const syncMut = useMutation((id) => api.network.servers.sync(id), {
    onSuccess: () => { toast({ message: "Metrics synced", type: "success" }); refetch(); },
    onError: (e) => toast({ message: e.message, type: "error" }),
  });

  const filtered = servers.filter((s) => {
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (filterEnv !== "all" && s.environment !== filterEnv) return false;
    if (search && !s.name?.toLowerCase().includes(search.toLowerCase()) && !s.hostname?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const online = servers.filter((s) => s.status === "online").length;
  const offline = servers.filter((s) => s.status === "offline").length;
  const maintenance = servers.filter((s) => s.status === "maintenance").length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Server Manager"
        subtitle="Add, remove, and monitor your enterprise servers"
        icon={Server}
        iconColor="emerald"
        actions={
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition"
          >
            <Plus size={15} /> Add Server
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Total Servers" value={servers.length} color="emerald" />
          <Stat label="Online" value={online} color="emerald" />
          <Stat label="Offline" value={offline} color="red" />
          <Stat label="Maintenance" value={maintenance} color="amber" />
        </div>

        {/* Filters */}
        <Card>
          <CardBody>
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search servers..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              >
                <option value="all">All Status</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={filterEnv}
                onChange={(e) => setFilterEnv(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              >
                <option value="all">All Environments</option>
                {ENVIRONMENTS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </CardBody>
        </Card>

        {/* Server list */}
        <Card>
          <CardHeader title={`Servers (${filtered.length})`} />
          <CardBody noPadding>
            {loading ? (
              <SkeletonTable rows={5} cols={6} />
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-sm">
                No servers found. Add your first server to get started.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((srv) => (
                  <div key={srv.id}>
                    <div
                      className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                      onClick={() => setExpanded(expanded === srv.id ? null : srv.id)}
                    >
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                        <Server size={16} className="text-slate-500 dark:text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{srv.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{srv.hostname} · {srv.ip_address}</p>
                      </div>
                      <div className="hidden sm:flex items-center gap-6">
                        <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{srv.environment}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{srv.os}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{srv.cores}C / {srv.ram_gb}GB</span>
                      </div>
                      <StatusBadge status={statusColor[srv.status] ?? "default"} label={srv.status} />
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => syncMut.mutate(srv.id)}
                          title="Sync metrics"
                          className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={() => restartMut.mutate(srv.id)}
                          title="Restart server"
                          className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition"
                        >
                          <RotateCcw size={14} />
                        </button>
                        <button
                          onClick={() => deleteMut.mutate(srv.id)}
                          title="Remove server"
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {expanded === srv.id ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </div>

                    {expanded === srv.id && (
                      <div className="px-4 pb-4 pt-2 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl">
                          <UtilBar value={srv.cpu_util} label="CPU" />
                          <UtilBar value={srv.mem_util} label="Memory" />
                          <UtilBar value={srv.disk_util} label="Disk" />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                          {srv.region && <span>Region: <span className="text-slate-700 dark:text-slate-300">{srv.region}</span></span>}
                          <span>Disk: <span className="text-slate-700 dark:text-slate-300">{srv.disk_gb} GB</span></span>
                          {srv.tags && <span>Tags: <span className="text-slate-700 dark:text-slate-300">{srv.tags}</span></span>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Aggregate metrics */}
        {metrics && (
          <Card>
            <CardHeader title="Aggregate Metrics" />
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                  <Cpu size={18} className="text-emerald-500" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Avg CPU Utilization</p>
                    <UtilBar value={metrics.avgCpu} label="" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MemoryStick size={18} className="text-blue-500" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Avg Memory Utilization</p>
                    <UtilBar value={metrics.avgMem} label="" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <HardDrive size={18} className="text-amber-500" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Avg Disk Utilization</p>
                    <UtilBar value={metrics.avgDisk} label="" />
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Add Server Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Add Server</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                {[["name", "Server Name"], ["hostname", "Hostname"], ["ip_address", "IP Address"], ["region", "Region (optional)"], ["tags", "Tags (optional)"]].map(([k, label]) => (
                  <div key={k} className={k === "name" || k === "ip_address" ? "col-span-2" : ""}>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
                    <input
                      value={form[k]}
                      onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                ))}
                {[["os", "OS", OS_OPTS], ["environment", "Environment", ENVIRONMENTS]].map(([k, label, opts]) => (
                  <div key={k}>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
                    <select
                      value={form[k]}
                      onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                {[["cores", "CPU Cores", "number"], ["ram_gb", "RAM (GB)", "number"], ["disk_gb", "Disk (GB)", "number"]].map(([k, label, type]) => (
                  <div key={k}>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
                    <input
                      type={type}
                      value={form[k]}
                      onChange={(e) => setForm((f) => ({ ...f, [k]: type === "number" ? Number(e.target.value) : e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition">Cancel</button>
              <button
                onClick={() => createMut.mutate(form)}
                disabled={createMut.loading || !form.name || !form.hostname || !form.ip_address}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
              >
                {createMut.loading ? "Adding..." : "Add Server"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
