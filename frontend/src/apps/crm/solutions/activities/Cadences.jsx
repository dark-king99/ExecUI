import { useState } from "react";
import { Repeat, Plus, Layers, Users, Zap } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, MetricGrid, Loading, Modal, Field, TextInput, PrimaryBtn, GhostBtn, fmtNum } from "../../components/crm-ui";

export default function Cadences() {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", steps: "", description: "" });
  const { data: sequences, loading, refetch } = useApi(() => crm.sequences.list(), [], { pollingInterval: 120000 });
  const { mutate: create, loading: creating } = useMutation((d) => crm.sequences.create(d), {
    onSuccess: () => { toast({ message: "Cadence created", type: "success" }); setShowModal(false); setForm({ name: "", steps: "", description: "" }); refetch(); },
  });

  const all = sequences ?? [];
  const metrics = [
    { label: "Cadences", value: fmtNum(all.length), icon: Repeat, color: "indigo" },
    { label: "Active", value: fmtNum(all.filter((s) => s.active).length), icon: Zap, color: "emerald" },
    { label: "Enrolled", value: fmtNum(all.reduce((s, x) => s + (x.enrolled ?? 0), 0)), icon: Users, color: "amber" },
    { label: "Total Steps", value: fmtNum(all.reduce((s, x) => s + (x.steps ?? 0), 0)), icon: Layers, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="activities" title="Cadences" subtitle="Automated multi-step outreach sequences"
      actions={<PrimaryBtn color="indigo" onClick={() => setShowModal(true)}><Plus size={15} /> New Cadence</PrimaryBtn>}>
      {showModal && (
        <Modal title="New Cadence" onClose={() => setShowModal(false)}
          footer={<><GhostBtn onClick={() => setShowModal(false)}>Cancel</GhostBtn><PrimaryBtn color="indigo" disabled={creating || !form.name.trim()} onClick={() => create({ ...form, steps: Number(form.steps) || 1 })}>{creating ? "Creating…" : "Create"}</PrimaryBtn></>}>
          <Field label="Cadence Name *"><TextInput value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="New Lead Outreach" /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Steps"><TextInput type="number" value={form.steps} onChange={(e) => setForm((p) => ({ ...p, steps: e.target.value }))} placeholder="5" /></Field>
            <div className="col-span-2"><Field label="Description"><TextInput value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="What does this cadence do?" /></Field></div>
          </div>
        </Modal>
      )}

      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      {loading && all.length === 0 ? <Loading rows={4} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {all.map((c) => (
            <div key={c.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center"><Repeat size={18} className="text-indigo-600 dark:text-indigo-400" /></div>
                <StatusBadge label={c.active ? "active" : "paused"} variant={c.active ? "success" : "neutral"} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{c.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed flex-1">{c.description}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-400">{c.steps} steps</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{fmtNum(c.enrolled)} enrolled</span>
              </div>
            </div>
          ))}
          {all.length === 0 && <div className="col-span-full py-10 text-center text-sm text-slate-400">No cadences yet.</div>}
        </div>
      )}
    </SolutionShell>
  );
}
