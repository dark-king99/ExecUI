import { useState } from "react";
import { ShieldAlert, Plus, Trash2, ShieldCheck, ShieldBan } from "lucide-react";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, Modal, Field, TextInput, SelectInput, PrimaryBtn, GhostBtn, Pill, fmtNum } from "../../components/net-ui";

const ACTION_COLOR = { ACCEPT: "emerald", DROP: "red", REJECT: "rose" };

function Toggle({ on, onClick }) {
  return (
    <button onClick={onClick} className={`relative h-5 w-9 rounded-full transition ${on ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-[1.125rem]" : "left-0.5"}`} />
    </button>
  );
}

export default function Firewall() {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", chain: "INPUT", action: "ACCEPT", protocol: "tcp", dst_port: "", priority: "100" });
  const [err, setErr] = useState(null);
  const { data: rules, loading, refetch } = useApi(() => network.firewall.rules.list({ limit: 200 }), [], { pollingInterval: 60000 });
  const { data: zones } = useApi(() => network.firewall.zones(), [], { pollingInterval: 60000 });
  const { mutate: create, loading: creating } = useMutation((d) => network.firewall.rules.create(d), {
    onSuccess: () => { toast({ message: "Rule created", type: "success" }); setShowModal(false); setForm({ name: "", chain: "INPUT", action: "ACCEPT", protocol: "tcp", dst_port: "", priority: "100" }); refetch(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  const { mutate: toggle } = useMutation((id) => network.firewall.rules.toggle(id), { onSuccess: refetch });
  const { mutate: remove } = useMutation((id) => network.firewall.rules.delete(id), { onSuccess: () => { toast({ message: "Rule deleted", type: "success" }); refetch(); } });

  const all = rules ?? [];
  const z = zones?.summary ?? {};
  const metrics = [
    { label: "Rules", value: fmtNum(all.length), icon: ShieldAlert, color: "red" },
    { label: "Active", value: fmtNum(all.filter((r) => r.enabled).length), icon: ShieldCheck, color: "emerald" },
    { label: "Block Rules", value: fmtNum(z.blockRules ?? all.filter((r) => ["DROP", "REJECT"].includes(r.action)).length), icon: ShieldBan, color: "rose" },
    { label: "Protected Nodes", value: fmtNum(z.totalDevices ?? 0), icon: ShieldCheck, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="security" title="Firewall" subtitle="Manage rules, chains, and zone-based policy"
      actions={<PrimaryBtn color="red" onClick={() => setShowModal(true)}><Plus size={15} /> New Rule</PrimaryBtn>}>
      {showModal && (
        <Modal title="New Firewall Rule" onClose={() => setShowModal(false)}
          footer={<><GhostBtn onClick={() => setShowModal(false)}>Cancel</GhostBtn><PrimaryBtn color="red" disabled={creating} onClick={() => { if (!form.name.trim()) return setErr("Name required"); create(form); }}>{creating ? "Creating…" : "Create"}</PrimaryBtn></>}>
          {err && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <Field label="Rule Name *"><TextInput value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Allow HTTPS inbound" /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Chain"><SelectInput value={form.chain} onChange={(e) => setForm((p) => ({ ...p, chain: e.target.value }))}>{["INPUT", "OUTPUT", "FORWARD"].map((c) => <option key={c}>{c}</option>)}</SelectInput></Field>
            <Field label="Action"><SelectInput value={form.action} onChange={(e) => setForm((p) => ({ ...p, action: e.target.value }))}>{["ACCEPT", "DROP", "REJECT"].map((a) => <option key={a}>{a}</option>)}</SelectInput></Field>
            <Field label="Protocol"><SelectInput value={form.protocol} onChange={(e) => setForm((p) => ({ ...p, protocol: e.target.value }))}>{["tcp", "udp", "icmp", "any"].map((a) => <option key={a}>{a}</option>)}</SelectInput></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dest. Port"><TextInput value={form.dst_port} onChange={(e) => setForm((p) => ({ ...p, dst_port: e.target.value }))} placeholder="443" /></Field>
            <Field label="Priority"><TextInput type="number" value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))} /></Field>
          </div>
        </Modal>
      )}

      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <Section title="Rules" subtitle="Evaluated top-to-bottom by priority — first match wins" icon={ShieldAlert} pad={false}>
        {loading && all.length === 0 ? <Loading table /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["#", "Rule", "Chain", "Action", "Protocol / Port", "Enabled", ""].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {all.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-500">No firewall rules.</td></tr>
                ) : all.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3 text-slate-400 font-mono text-xs">{r.priority}</td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{r.name}</div>
                      {r.description && <div className="text-xs text-slate-400">{r.description}</div>}
                    </td>
                    <td className="px-5 py-3"><Pill color="slate">{r.chain}</Pill></td>
                    <td className="px-5 py-3"><Pill color={ACTION_COLOR[r.action] ?? "slate"}>{r.action}</Pill></td>
                    <td className="px-5 py-3 text-slate-500 font-mono text-xs">{r.protocol}{r.dst_port ? `/${r.dst_port}` : ""}</td>
                    <td className="px-5 py-3"><Toggle on={r.enabled} onClick={() => toggle(r.id)} /></td>
                    <td className="px-5 py-3"><button onClick={() => remove(r.id)} className="text-slate-300 hover:text-red-500 transition"><Trash2 size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {zones?.zones?.length > 0 && (
        <Section title="Zones" subtitle="Zone-based policy summary" icon={ShieldCheck}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {zones.zones.map((zn) => (
              <div key={zn.name} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{zn.name}</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{fmtNum(zn.rules)}</div>
                <div className="text-[11px] text-slate-500">rules</div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </SolutionShell>
  );
}
