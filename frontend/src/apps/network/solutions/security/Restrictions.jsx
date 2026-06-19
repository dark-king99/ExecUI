import { useState } from "react";
import { Lock, Plus, Trash2, Ban, Gauge } from "lucide-react";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, Modal, Field, TextInput, SelectInput, PrimaryBtn, GhostBtn, Pill, fmtNum } from "../../components/net-ui";

const RULE_COLOR = { block: "red", allow: "emerald", throttle: "amber" };

function Toggle({ on, onClick }) {
  return (
    <button onClick={onClick} className={`relative h-5 w-9 rounded-full transition ${on ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-[1.125rem]" : "left-0.5"}`} />
    </button>
  );
}

export default function Restrictions() {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", target_type: "user", target: "", rule_type: "block", protocol: "any", direction: "both", priority: "100" });
  const [err, setErr] = useState(null);
  const { data: restrictions, loading, refetch } = useApi(() => network.restrictions.list({ limit: 200 }), [], { pollingInterval: 60000 });
  const { mutate: create, loading: creating } = useMutation((d) => network.restrictions.create(d), {
    onSuccess: () => { toast({ message: "Restriction created", type: "success" }); setShowModal(false); setForm({ name: "", target_type: "user", target: "", rule_type: "block", protocol: "any", direction: "both", priority: "100" }); refetch(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  const { mutate: toggle } = useMutation((id) => network.restrictions.toggle(id), { onSuccess: refetch });
  const { mutate: remove } = useMutation((id) => network.restrictions.delete(id), { onSuccess: () => { toast({ message: "Restriction deleted", type: "success" }); refetch(); } });

  const all = restrictions ?? [];
  const metrics = [
    { label: "Restrictions", value: fmtNum(all.length), icon: Lock, color: "red" },
    { label: "Active", value: fmtNum(all.filter((r) => r.enabled).length), icon: Lock, color: "emerald" },
    { label: "Block Rules", value: fmtNum(all.filter((r) => r.rule_type === "block").length), icon: Ban, color: "rose" },
    { label: "Throttled", value: fmtNum(all.filter((r) => r.rule_type === "throttle").length), icon: Gauge, color: "amber" },
  ];

  return (
    <SolutionShell solutionId="security" title="Access Restrictions" subtitle="Control which users and devices can reach the network"
      actions={<PrimaryBtn color="red" onClick={() => setShowModal(true)}><Plus size={15} /> New Restriction</PrimaryBtn>}>
      {showModal && (
        <Modal title="New Restriction" onClose={() => setShowModal(false)}
          footer={<><GhostBtn onClick={() => setShowModal(false)}>Cancel</GhostBtn><PrimaryBtn color="red" disabled={creating} onClick={() => { if (!form.name.trim() || !form.target.trim()) return setErr("Name and target required"); create(form); }}>{creating ? "Creating…" : "Create"}</PrimaryBtn></>}>
          {err && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <Field label="Name *"><TextInput value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Block guest VLAN to prod" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target Type"><SelectInput value={form.target_type} onChange={(e) => setForm((p) => ({ ...p, target_type: e.target.value }))}>{["user", "device", "ip", "subnet"].map((t) => <option key={t}>{t}</option>)}</SelectInput></Field>
            <Field label="Target *"><TextInput value={form.target} onChange={(e) => setForm((p) => ({ ...p, target: e.target.value }))} placeholder="10.0.5.0/24" /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Rule"><SelectInput value={form.rule_type} onChange={(e) => setForm((p) => ({ ...p, rule_type: e.target.value }))}>{["block", "allow", "throttle"].map((t) => <option key={t}>{t}</option>)}</SelectInput></Field>
            <Field label="Direction"><SelectInput value={form.direction} onChange={(e) => setForm((p) => ({ ...p, direction: e.target.value }))}>{["both", "inbound", "outbound"].map((t) => <option key={t}>{t}</option>)}</SelectInput></Field>
            <Field label="Priority"><TextInput type="number" value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))} /></Field>
          </div>
        </Modal>
      )}

      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <Section title="Restrictions" subtitle="Evaluated by priority" icon={Lock} pad={false}>
        {loading && all.length === 0 ? <Loading table /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["#", "Name", "Target", "Rule", "Direction", "Enabled", ""].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {all.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-500">No restrictions.</td></tr>
                ) : all.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3 text-slate-400 font-mono text-xs">{r.priority}</td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{r.name}</div>
                      {r.description && <div className="text-xs text-slate-400">{r.description}</div>}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{r.target_type}: {r.target}</td>
                    <td className="px-5 py-3"><Pill color={RULE_COLOR[r.rule_type] ?? "slate"}>{r.rule_type}</Pill></td>
                    <td className="px-5 py-3 text-slate-500 capitalize">{r.direction}</td>
                    <td className="px-5 py-3"><Toggle on={r.enabled} onClick={() => toggle(r.id)} /></td>
                    <td className="px-5 py-3"><button onClick={() => remove(r.id)} className="text-slate-300 hover:text-red-500 transition"><Trash2 size={15} /></button></td>
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
