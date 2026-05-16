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
  ShieldAlert, Plus, Trash2, ToggleLeft, ToggleRight, Search,
  X, Filter, FileText, Globe
} from "lucide-react";

const CHAINS    = ["INPUT", "OUTPUT", "FORWARD"];
const ACTIONS   = ["ACCEPT", "DROP", "REJECT", "LOG"];
const PROTOCOLS = ["any", "tcp", "udp", "icmp", "http", "https"];
const TABS      = ["rules", "zones", "logs"];

const actionColor = { ACCEPT: "success", DROP: "danger", REJECT: "warning", LOG: "info" };
const zoneColor   = { wan: "danger", lan: "success", dmz: "warning", vpn: "info" };

const EMPTY = {
  name: "", description: "", chain: "INPUT", action: "ACCEPT",
  protocol: "any", src_ip: "", dst_ip: "", src_port: "", dst_port: "",
  zone_src: "", zone_dst: "", priority: 100, log_traffic: false, enabled: true,
};

const inputCls  = "w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500";
const selectCls = "w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500";

function Field({ label, children, span2 }) {
  return (
    <div className={span2 ? "col-span-2" : ""}>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function FirewallSetup() {
  const toast = useToast();
  const [tab, setTab] = useState("rules");
  const [chain, setChain] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const F = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const { data: rules = [], loading: loadR, refetch: refetchRules } = useApi(() => api.network.firewall.rules.list(), []);
  const { data: zones = [], loading: loadZ } = useApi(() => api.network.firewall.zones(), []);
  const { data: logs = [], loading: loadL } = useApi(() => api.network.firewall.logs(), []);

  const createMut = useMutation((d) => api.network.firewall.rules.create(d), {
    onSuccess: () => { toast({ message: "Rule created", type: "success" }); setShowAdd(false); setForm(EMPTY); refetchRules(); },
    onError: (e) => toast({ message: e.message, type: "error" }),
  });

  const deleteMut = useMutation((id) => api.network.firewall.rules.delete(id), {
    onSuccess: () => { toast({ message: "Rule deleted", type: "success" }); refetchRules(); },
    onError: (e) => toast({ message: e.message, type: "error" }),
  });

  const toggleMut = useMutation((id) => api.network.firewall.rules.toggle(id), {
    onSuccess: () => { toast({ message: "Rule toggled", type: "success" }); refetchRules(); },
    onError: (e) => toast({ message: e.message, type: "error" }),
  });

  const filteredRules = rules.filter((r) => {
    if (chain !== "all" && r.chain !== chain) return false;
    if (search && !r.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeRules  = rules.filter((r) => r.enabled).length;
  const acceptRules  = rules.filter((r) => r.action === "ACCEPT").length;
  const dropRules    = rules.filter((r) => r.action === "DROP" || r.action === "REJECT").length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Firewall Setup"
        subtitle="Manage packet filtering rules between internet and your network"
        icon={ShieldAlert}
        iconColor="emerald"
        actions={
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition"
          >
            <Plus size={15} /> Add Rule
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Total Rules" value={rules.length} color="emerald" />
          <Stat label="Active" value={activeRules} color="emerald" />
          <Stat label="Accept Rules" value={acceptRules} color="slate" />
          <Stat label="Drop / Reject" value={dropRules} color="red" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition -mb-px ${
                tab === t
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {t === "rules" ? <Filter size={14} className="inline mr-1.5" /> : t === "zones" ? <Globe size={14} className="inline mr-1.5" /> : <FileText size={14} className="inline mr-1.5" />}
              {t}
            </button>
          ))}
        </div>

        {/* Rules tab */}
        {tab === "rules" && (
          <>
            <Card>
              <CardBody>
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-48">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search rules..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <select
                    value={chain}
                    onChange={(e) => setChain(e.target.value)}
                    className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                  >
                    <option value="all">All Chains</option>
                    {CHAINS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title={`Firewall Rules (${filteredRules.length})`} />
              <CardBody noPadding>
                {loadR ? (
                  <SkeletonTable rows={5} cols={7} />
                ) : filteredRules.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-sm">
                    No firewall rules found. Add a rule to control traffic.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                          {["Rule", "Chain", "Action", "Protocol", "Source → Dest", "Priority", "Status", ""].map((h) => (
                            <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                        {filteredRules.map((rule) => (
                          <tr key={rule.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-800 dark:text-slate-100">{rule.name}</p>
                              {rule.description && <p className="text-xs text-slate-400 truncate max-w-[180px]">{rule.description}</p>}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">{rule.chain}</span>
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={actionColor[rule.action] ?? "default"} label={rule.action} />
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{rule.protocol}</td>
                            <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                              <div>{rule.src_ip || "any"}{rule.src_port ? `:${rule.src_port}` : ""}</div>
                              <div className="text-slate-400">→ {rule.dst_ip || "any"}{rule.dst_port ? `:${rule.dst_port}` : ""}</div>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500">{rule.priority}</td>
                            <td className="px-4 py-3">
                              <StatusBadge status={rule.enabled ? "success" : "default"} label={rule.enabled ? "Active" : "Off"} />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => toggleMut.mutate(rule.id)}
                                  title={rule.enabled ? "Disable" : "Enable"}
                                  className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition"
                                >
                                  {rule.enabled ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} />}
                                </button>
                                <button
                                  onClick={() => deleteMut.mutate(rule.id)}
                                  title="Delete"
                                  className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          </>
        )}

        {/* Zones tab */}
        {tab === "zones" && (
          <Card>
            <CardHeader title="Network Zones" />
            <CardBody>
              {loadZ ? (
                <SkeletonTable rows={4} cols={4} />
              ) : zones.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">No zones configured.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {zones.map((zone) => (
                    <div key={zone.id ?? zone.name} className="p-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 uppercase">{zone.name}</span>
                        <StatusBadge status={zoneColor[zone.name?.toLowerCase()] ?? "default"} label={zone.trust_level ?? zone.name} />
                      </div>
                      {zone.interfaces && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">Interfaces: {zone.interfaces.join(", ")}</p>
                      )}
                      {zone.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{zone.description}</p>}
                      <div className="mt-3 flex gap-4 text-xs text-slate-500">
                        <span>Rules: <strong className="text-slate-700 dark:text-slate-300">{zone.rules ?? 0}</strong></span>
                        <span>Devices: <strong className="text-slate-700 dark:text-slate-300">{zone.devices ?? 0}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Logs tab */}
        {tab === "logs" && (
          <Card>
            <CardHeader title="Firewall Logs" />
            <CardBody noPadding>
              {loadL ? (
                <SkeletonTable rows={8} cols={5} />
              ) : logs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">No log entries.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        {["Timestamp", "Action", "Protocol", "Source", "Destination", "Rule"].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60 font-mono">
                      {logs.map((entry, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-2 text-slate-500">{entry.timestamp}</td>
                          <td className="px-4 py-2">
                            <StatusBadge status={actionColor[entry.action] ?? "default"} label={entry.action} />
                          </td>
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{entry.protocol}</td>
                          <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{entry.src}</td>
                          <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{entry.dst}</td>
                          <td className="px-4 py-2 text-slate-500">{entry.rule}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {/* Add Rule Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Add Firewall Rule</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Rule Name" span2>
                  <input value={form.name} onChange={F("name")} className={inputCls} />
                </Field>
                <Field label="Description (optional)" span2>
                  <input value={form.description} onChange={F("description")} className={inputCls} />
                </Field>
                <Field label="Chain">
                  <select value={form.chain} onChange={F("chain")} className={selectCls}>
                    {CHAINS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Action">
                  <select value={form.action} onChange={F("action")} className={selectCls}>
                    {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </Field>
                <Field label="Protocol" span2>
                  <select value={form.protocol} onChange={F("protocol")} className={selectCls}>
                    {PROTOCOLS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="Source IP (optional)">
                  <input value={form.src_ip} onChange={F("src_ip")} placeholder="0.0.0.0/0" className={inputCls} />
                </Field>
                <Field label="Destination IP (optional)">
                  <input value={form.dst_ip} onChange={F("dst_ip")} placeholder="0.0.0.0/0" className={inputCls} />
                </Field>
                <Field label="Source Port (optional)">
                  <input value={form.src_port} onChange={F("src_port")} placeholder="e.g. 80" className={inputCls} />
                </Field>
                <Field label="Destination Port (optional)">
                  <input value={form.dst_port} onChange={F("dst_port")} placeholder="e.g. 443" className={inputCls} />
                </Field>
                <Field label="Source Zone (optional)">
                  <input value={form.zone_src} onChange={F("zone_src")} placeholder="wan / lan / dmz" className={inputCls} />
                </Field>
                <Field label="Dest Zone (optional)">
                  <input value={form.zone_dst} onChange={F("zone_dst")} placeholder="wan / lan / dmz" className={inputCls} />
                </Field>
                <Field label="Priority">
                  <input type="number" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))} className={inputCls} />
                </Field>
                <Field label="Log Traffic">
                  <div className="flex items-center gap-2 py-2">
                    <input type="checkbox" id="log_traffic" checked={form.log_traffic} onChange={F("log_traffic")} className="accent-emerald-600" />
                    <label htmlFor="log_traffic" className="text-sm text-slate-600 dark:text-slate-400">Enable traffic logging</label>
                  </div>
                </Field>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition">Cancel</button>
              <button
                onClick={() => createMut.mutate(form)}
                disabled={createMut.loading || !form.name}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
              >
                {createMut.loading ? "Creating..." : "Create Rule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
