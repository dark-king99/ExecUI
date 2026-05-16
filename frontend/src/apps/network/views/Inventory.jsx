import { useState, useMemo } from "react";
import { Server, Search, RefreshCw, AlertCircle, Plus, X, Cpu, HardDrive, Wifi } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../../components/ui/Skeleton";
import { useToast } from "../../../components/ui/Toast";
import { useApi, useMutation } from "../../../hooks/useApi";
import { network } from "../../../services/api";

const STATUS_VARIANT = { Online: "success", online: "success", Warning: "warning", warning: "warning", Offline: "danger", offline: "danger", Maintenance: "neutral", maintenance: "neutral" };
const EMPTY_DEVICE = { name: "", type: "server", ip: "", location: "", os: "" };

function AddDeviceModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_DEVICE);
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => network.devices.update("new", d), {
    onSuccess: () => { toast({ message: "Device added", type: "success" }); onCreated(); onClose(); },
    onError: (e) => setErr(e?.message ?? "Failed to add device"),
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">Add Device</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); setErr(null); if (!form.name.trim()) { setErr("Name required"); return; } mutate(form); }} className="px-6 py-5 space-y-4">
          {err && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Hostname *</label>
              <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="web-server-01" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
              <select value={form.type} onChange={e => set("type", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {["server", "router", "switch", "firewall", "endpoint", "vm", "container", "storage"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">IP Address</label>
              <input value={form.ip} onChange={e => set("ip", e.target.value)} placeholder="192.168.1.1" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Location</label>
              <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="DC-East / us-east-1" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">OS / Platform</label>
              <input value={form.os} onChange={e => set("os", e.target.value)} placeholder="Ubuntu 22.04" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white transition">{loading ? "Adding…" : "Add Device"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data: devices, loading, error, refetch } = useApi(() => network.devices.list({ limit: 500 }), [], { pollingInterval: 30000 });
  const all = devices ?? [];

  const typeOptions = useMemo(() => ["All", ...new Set(all.map(d => d.type).filter(Boolean))], [all]);

  const filtered = useMemo(() => all.filter(d => {
    const matchSearch = !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.ip?.includes(search) || d.hostname?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All" || d.type === typeFilter;
    const matchStatus = statusFilter === "All" || d.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  }), [all, search, typeFilter, statusFilter]);

  const online = all.filter(d => ["Online", "online"].includes(d.status)).length;
  const warning = all.filter(d => ["Warning", "warning"].includes(d.status)).length;
  const offline = all.filter(d => ["Offline", "offline"].includes(d.status)).length;
  const selectedDevice = selected != null ? all.find(d => d.id === selected) : null;

  return (
    <div className="space-y-6">
      {showAdd && <AddDeviceModal onClose={() => setShowAdd(false)} onCreated={refetch} />}
      <PageHeader title="Network Inventory" subtitle="All devices, servers, endpoints, and cloud nodes"
        actions={
          <div className="flex gap-2">
            <button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /></button>
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg transition"><Plus size={14} /> Add Device</button>
          </div>
        }
      />

      {loading && all.length === 0 ? (
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Online" value={online} icon={Server} color="emerald" />
          <Stat label="Warning" value={warning} icon={AlertCircle} color="amber" />
          <Stat label="Offline" value={offline} icon={X} color="red" />
        </div>
      )}

      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 flex-1 max-w-72">
          <Search size={14} className="text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or IP…" className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
          {typeOptions.map(t => <option key={t}>{t === "All" ? "All Types" : t}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
          {["All", "Online", "Warning", "Offline", "Maintenance"].map(s => <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>)}
        </select>
      </div>

      <div className={`grid gap-4 ${selectedDevice ? "grid-cols-1 lg:grid-cols-5" : "grid-cols-1"}`}>
        <div className={selectedDevice ? "lg:col-span-3" : ""}>
          <Card>
            {loading && all.length === 0 ? <div className="p-5"><SkeletonTable rows={8} /></div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      {["Name", "Type", "Status", "IP", "Location", "Last Seen"].map(h => (
                        <th key={h} className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filtered.length === 0 ? (
                      <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-500">{all.length === 0 ? "No devices discovered yet. Add your first device!" : "No devices match filters."}</td></tr>
                    ) : filtered.map((d, i) => (
                      <tr key={d.id ?? i} onClick={() => setSelected(d.id === selected ? null : d.id)} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition ${selected === d.id ? "bg-emerald-50 dark:bg-emerald-900/10" : ""}`}>
                        <td className="p-4 font-medium text-slate-900 dark:text-white">{d.name ?? d.hostname}</td>
                        <td className="p-4 text-slate-500 capitalize">{d.type ?? "—"}</td>
                        <td className="p-4"><StatusBadge label={d.status ?? "unknown"} variant={STATUS_VARIANT[d.status] ?? "neutral"} dot /></td>
                        <td className="p-4 font-mono text-xs text-slate-400">{d.ip ?? "—"}</td>
                        <td className="p-4 text-slate-500">{d.location ?? "—"}</td>
                        <td className="p-4 text-slate-400 text-xs">{d.lastSeen ?? d.last_seen ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          {!loading && all.length > 0 && <p className="text-xs text-slate-400 mt-2">Showing {filtered.length} of {all.length} devices · Auto-refresh 30s</p>}
        </div>

        {selectedDevice && (
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white">{selectedDevice.name ?? selectedDevice.hostname}</h3>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
              </div>
              <CardBody className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["Type", selectedDevice.type],
                    ["Status", selectedDevice.status],
                    ["IP", selectedDevice.ip],
                    ["OS", selectedDevice.os ?? selectedDevice.platform],
                    ["Location", selectedDevice.location],
                    ["Last Seen", selectedDevice.lastSeen ?? selectedDevice.last_seen],
                    ["CPU Model", selectedDevice.cpu_model],
                    ["Memory", selectedDevice.memory_gb ? `${selectedDevice.memory_gb} GB` : null],
                  ].filter(([, v]) => v != null).map(([label, value]) => (
                    <div key={label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5">
                      <div className="text-[10px] text-slate-400 mb-0.5">{label}</div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{String(value)}</div>
                    </div>
                  ))}
                </div>
                {(selectedDevice.cpu_util != null || selectedDevice.mem_util != null) && (
                  <div className="space-y-2">
                    {selectedDevice.cpu_util != null && (
                      <div>
                        <div className="flex justify-between text-xs mb-1"><span className="text-slate-500 flex items-center gap-1"><Cpu size={11} />CPU</span><span className="font-semibold">{selectedDevice.cpu_util}%</span></div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full"><div className={`h-2 rounded-full ${selectedDevice.cpu_util >= 90 ? "bg-red-500" : selectedDevice.cpu_util >= 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${selectedDevice.cpu_util}%` }} /></div>
                      </div>
                    )}
                    {selectedDevice.mem_util != null && (
                      <div>
                        <div className="flex justify-between text-xs mb-1"><span className="text-slate-500 flex items-center gap-1"><HardDrive size={11} />Memory</span><span className="font-semibold">{selectedDevice.mem_util}%</span></div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full"><div className={`h-2 rounded-full ${selectedDevice.mem_util >= 90 ? "bg-red-500" : selectedDevice.mem_util >= 70 ? "bg-amber-500" : "bg-sky-500"}`} style={{ width: `${selectedDevice.mem_util}%` }} /></div>
                      </div>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
