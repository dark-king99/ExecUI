import { useState } from "react";
import { useApi, useMutation } from "../../../hooks/useApi";
import { useToast } from "../../../components/ui/Toast";
import { network } from "../../../services/api";
import PageHeader from "../../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../../components/ui/Card";
import { SkeletonTable } from "../../../components/ui/Skeleton";
import StatusBadge from "../../../components/ui/StatusBadge";
import { Lock, Plus, Trash2, ToggleLeft, ToggleRight, Search, X, Users } from "lucide-react";

const TARGET_TYPES = ["user", "device", "group", "subnet"];
const RULE_TYPES   = ["block", "allow", "rate_limit", "schedule"];
const PROTOCOLS    = ["any", "tcp", "udp", "icmp", "http", "https"];
const DIRECTIONS   = ["inbound", "outbound", "both"];

const ruleVariant = { block: "danger", allow: "success", rate_limit: "warning", schedule: "info" };

const EMPTY = {
  name: "", description: "", target_type: "user", target: "",
  rule_type: "block", protocol: "any", port: "", direction: "both",
  priority: 100, bandwidth_kbps: "", enabled: true,
};

const inputCls  = "w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500";
const selectCls = "w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500";

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function UserRestrictions() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const F = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const { data: restrictionsData, loading, refetch } = useApi(() => network.restrictions.list(), []);
  const restrictions = restrictionsData ?? [];

  const createMut = useMutation((d) => network.restrictions.create(d), {
    onSuccess: () => { toast({ message: "Restriction created", type: "success" }); setShowAdd(false); setForm(EMPTY); refetch(); },
    onError: (e) => toast({ message: e.message, type: "error" }),
  });

  const deleteMut = useMutation((id) => network.restrictions.delete(id), {
    onSuccess: () => { toast({ message: "Restriction removed", type: "success" }); refetch(); },
    onError: (e) => toast({ message: e.message, type: "error" }),
  });

  const toggleMut = useMutation((id) => network.restrictions.toggle(id), {
    onSuccess: () => { toast({ message: "Restriction toggled", type: "success" }); refetch(); },
    onError: (e) => toast({ message: e.message, type: "error" }),
  });

  const filtered = restrictions.filter((r) => {
    if (filterType !== "all" && r.rule_type !== filterType) return false;
    if (search && !r.name?.toLowerCase().includes(search.toLowerCase()) && !r.target?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const active = restrictions.filter((r) => r.enabled).length;
  const blocked = restrictions.filter((r) => r.rule_type === "block").length;
  const rateLimited = restrictions.filter((r) => r.rule_type === "rate_limit").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Restrictions"
        subtitle="Network access control rules per user, device, group, or subnet"
        icon={Lock}
        iconColor="emerald"
        actions={
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition">
            <Plus size={15} /> Add Rule
          </button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Total Rules" value={restrictions.length} color="emerald" />
        <Stat label="Active" value={active} color="emerald" />
        <Stat label="Block Rules" value={blocked} color="red" />
        <Stat label="Rate Limited" value={rateLimited} color="amber" />
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or target..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
              <option value="all">All Types</option>
              {RULE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`Rules (${filtered.length})`} />
        <CardBody className="p-0">
          {loading ? (
            <div className="p-5"><SkeletonTable rows={5} cols={6} /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-sm">
              No restriction rules found. Add a rule to control network access.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    {["Rule", "Target", "Type", "Protocol", "Direction", "Priority", "Status", ""].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                  {filtered.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 dark:text-slate-100">{rule.name}</p>
                        {rule.description && <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">{rule.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Users size={12} className="text-slate-400" />
                          <div>
                            <p className="text-slate-700 dark:text-slate-300">{rule.target}</p>
                            <p className="text-xs text-slate-400">{rule.target_type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge variant={ruleVariant[rule.rule_type] ?? "neutral"} label={rule.rule_type?.replace("_", " ")} />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{rule.protocol}{rule.port ? `:${rule.port}` : ""}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{rule.direction}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{rule.priority}</td>
                      <td className="px-4 py-3">
                        <StatusBadge variant={rule.enabled ? "success" : "neutral"} label={rule.enabled ? "Active" : "Disabled"} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleMut.mutate(rule.id)} title={rule.enabled ? "Disable" : "Enable"} className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition">
                            {rule.enabled ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} />}
                          </button>
                          <button onClick={() => deleteMut.mutate(rule.id)} title="Delete" className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition">
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

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Add Restriction Rule</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Rule Name"><input value={form.name} onChange={F("name")} className={inputCls} /></Field>
                </div>
                <div className="col-span-2">
                  <Field label="Description (optional)"><input value={form.description} onChange={F("description")} className={inputCls} /></Field>
                </div>
                <Field label="Target Type">
                  <select value={form.target_type} onChange={F("target_type")} className={selectCls}>
                    {TARGET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Target (username / IP / group)">
                  <input value={form.target} onChange={F("target")} className={inputCls} />
                </Field>
                <Field label="Rule Type">
                  <select value={form.rule_type} onChange={F("rule_type")} className={selectCls}>
                    {RULE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Direction">
                  <select value={form.direction} onChange={F("direction")} className={selectCls}>
                    {DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Protocol">
                  <select value={form.protocol} onChange={F("protocol")} className={selectCls}>
                    {PROTOCOLS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="Port (optional)">
                  <input value={form.port} onChange={F("port")} placeholder="80, 443, 8080-8090" className={inputCls} />
                </Field>
                <Field label="Priority">
                  <input type="number" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))} className={inputCls} />
                </Field>
                {form.rule_type === "rate_limit" && (
                  <Field label="Bandwidth Limit (kbps)">
                    <input type="number" value={form.bandwidth_kbps} onChange={(e) => setForm((f) => ({ ...f, bandwidth_kbps: Number(e.target.value) }))} className={inputCls} />
                  </Field>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition">Cancel</button>
              <button
                onClick={() => createMut.mutate(form)}
                disabled={createMut.loading || !form.name || !form.target}
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
