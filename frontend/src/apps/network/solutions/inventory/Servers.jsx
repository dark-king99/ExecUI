import { useState, useMemo } from "react";
import { Server, Plus, RefreshCw, RotateCw, Cpu, MemoryStick, HardDrive } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, ErrorNote, Modal, Field, TextInput, SelectInput, PrimaryBtn, GhostBtn, UtilBar, Pill, fmtNum } from "../../components/net-ui";

const STATUS_VARIANT = { online: "success", offline: "danger", rebooting: "warning", maintenance: "warning" };
const ENVS = ["all", "prod", "staging", "dev", "test"];

export default function Servers() {
  const toast = useToast();
  const [env, setEnv] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", ip: "", os: "linux", cores: "", ram_gb: "", environment: "prod" });
  const [err, setErr] = useState(null);
  const { data: servers, loading, error, refetch } = useApi(() => network.servers.list({ limit: 200 }), [], { pollingInterval: 60000 });
  const { data: metrics } = useApi(() => network.servers.metrics(), [], { pollingInterval: 60000 });
  const { mutate: create, loading: creating } = useMutation((d) => network.servers.create(d), {
    onSuccess: () => { toast({ message: "Server added", type: "success" }); setShowModal(false); setForm({ name: "", ip: "", os: "linux", cores: "", ram_gb: "", environment: "prod" }); refetch(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  const { mutate: restart } = useMutation((id) => network.servers.restart(id), { onSuccess: () => { toast({ message: "Reboot triggered", type: "success" }); refetch(); } });
  const { mutate: sync } = useMutation((id) => network.servers.sync(id), { onSuccess: () => { toast({ message: "Metrics synced", type: "success" }); refetch(); } });

  const all = servers ?? [];
  const filtered = useMemo(() => (env === "all" ? all : all.filter((s) => s.environment === env)), [all, env]);
  const m = metrics ?? {};

  const kpis = [
    { label: "Servers", value: fmtNum(m.total ?? all.length), icon: Server, color: "sky" },
    { label: "Online", value: fmtNum(m.online ?? 0), icon: Server, color: "emerald" },
    { label: "Avg CPU", value: m.avgCpu != null ? `${m.avgCpu}%` : "—", icon: Cpu, color: "amber" },
    { label: "High CPU", value: fmtNum(m.highCpu ?? 0), icon: Cpu, color: "red" },
  ];

  return (
    <SolutionShell solutionId="inventory" title="Servers" subtitle="Physical and virtual servers with live utilization"
      actions={<PrimaryBtn color="sky" onClick={() => setShowModal(true)}><Plus size={15} /> Add Server</PrimaryBtn>}>
      {showModal && (
        <Modal title="Add Server" onClose={() => setShowModal(false)}
          footer={<><GhostBtn onClick={() => setShowModal(false)}>Cancel</GhostBtn><PrimaryBtn color="sky" disabled={creating} onClick={() => { if (!form.name.trim()) return setErr("Name required"); create(form); }}>{creating ? "Adding…" : "Add"}</PrimaryBtn></>}>
          {err && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <Field label="Name *"><TextInput value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="app-server-04" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="IP Address"><TextInput value={form.ip} onChange={(e) => setForm((p) => ({ ...p, ip: e.target.value }))} placeholder="10.0.1.99" /></Field>
            <Field label="OS"><SelectInput value={form.os} onChange={(e) => setForm((p) => ({ ...p, os: e.target.value }))}>{["linux", "windows", "bsd"].map((o) => <option key={o}>{o}</option>)}</SelectInput></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Cores"><TextInput type="number" value={form.cores} onChange={(e) => setForm((p) => ({ ...p, cores: e.target.value }))} placeholder="4" /></Field>
            <Field label="RAM (GB)"><TextInput type="number" value={form.ram_gb} onChange={(e) => setForm((p) => ({ ...p, ram_gb: e.target.value }))} placeholder="16" /></Field>
            <Field label="Env"><SelectInput value={form.environment} onChange={(e) => setForm((p) => ({ ...p, environment: e.target.value }))}>{["prod", "staging", "dev", "test"].map((o) => <option key={o}>{o}</option>)}</SelectInput></Field>
          </div>
        </Modal>
      )}

      <ErrorNote error={error} />
      <MetricGrid items={kpis} cols={4} loading={loading && all.length === 0} />

      <Section title={`${fmtNum(filtered.length)} Servers`} pad={false}
        actions={
          <div className="flex gap-1.5">
            {ENVS.map((e) => (
              <button key={e} onClick={() => setEnv(e)} className={`text-xs px-2.5 py-1 rounded-full border capitalize transition ${env === e ? "bg-sky-600 text-white border-sky-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-400"}`}>{e}</button>
            ))}
          </div>
        }>
        {loading && all.length === 0 ? <Loading table /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Server", "Env", "CPU", "Memory", "Disk", "Status", ""].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-500">No servers found.</td></tr>
                ) : filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{s.name}</div>
                      <div className="text-xs text-slate-400">{s.ip} · {s.cores}c / {s.ram_gb}GB · {s.os}</div>
                    </td>
                    <td className="px-5 py-3"><Pill color="sky">{s.environment}</Pill></td>
                    <td className="px-5 py-3"><UtilBar value={s.cpu_util} /></td>
                    <td className="px-5 py-3"><UtilBar value={s.mem_util} /></td>
                    <td className="px-5 py-3"><UtilBar value={s.disk_util} /></td>
                    <td className="px-5 py-3"><StatusBadge label={s.status} variant={STATUS_VARIANT[s.status] ?? "neutral"} dot /></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => sync(s.id)} title="Sync metrics" className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition"><RefreshCw size={14} /></button>
                        <button onClick={() => restart(s.id)} title="Restart" className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition"><RotateCw size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </SolutionShell>
  );
}
