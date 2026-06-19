import { useState } from "react";
import { BookOpen, Plus, Play, Layers, Zap } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, MetricGrid, Loading, Modal, Field, TextInput, SelectInput, PrimaryBtn, GhostBtn, Pill, fmtNum } from "../../components/crm-ui";

export default function Playbooks() {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Sales", steps: "" });
  const { data: playbooks, loading, refetch } = useApi(() => crm.playbooks.list(), [], { pollingInterval: 120000 });
  const { mutate: run } = useMutation((id) => crm.playbooks.run(id), { onSuccess: () => toast({ message: "Playbook started", type: "success" }) });
  const { mutate: create, loading: creating } = useMutation((d) => crm.playbooks.create(d), {
    onSuccess: () => { toast({ message: "Playbook created", type: "success" }); setShowModal(false); setForm({ name: "", category: "Sales", steps: "" }); refetch(); },
  });

  const all = playbooks ?? [];
  const metrics = [
    { label: "Playbooks", value: fmtNum(all.length), icon: BookOpen, color: "teal" },
    { label: "Active", value: fmtNum(all.filter((p) => p.active).length), icon: Zap, color: "emerald" },
    { label: "Categories", value: new Set(all.map((p) => p.category)).size, icon: Layers, color: "violet" },
    { label: "Total Steps", value: fmtNum(all.reduce((s, p) => s + (p.steps ?? 0), 0)), icon: Layers, color: "amber" },
  ];

  return (
    <SolutionShell solutionId="einstein" title="Playbooks" subtitle="Guided selling workflows for every sales motion"
      actions={<PrimaryBtn color="teal" onClick={() => setShowModal(true)}><Plus size={15} /> New Playbook</PrimaryBtn>}>
      {showModal && (
        <Modal title="New Playbook" onClose={() => setShowModal(false)}
          footer={<><GhostBtn onClick={() => setShowModal(false)}>Cancel</GhostBtn><PrimaryBtn color="teal" disabled={creating || !form.name.trim()} onClick={() => create({ ...form, steps: Number(form.steps) || 1 })}>{creating ? "Creating…" : "Create"}</PrimaryBtn></>}>
          <Field label="Playbook Name *"><TextInput value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Enterprise Onboarding" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category"><SelectInput value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>{["Sales", "Onboarding", "Growth", "Retention", "Success"].map((c) => <option key={c}>{c}</option>)}</SelectInput></Field>
            <Field label="Steps"><TextInput type="number" value={form.steps} onChange={(e) => setForm((p) => ({ ...p, steps: e.target.value }))} placeholder="5" /></Field>
          </div>
        </Modal>
      )}

      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      {loading && all.length === 0 ? <Loading rows={6} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {all.map((p) => (
            <div key={p.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div className="h-10 w-10 rounded-lg bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center"><BookOpen size={18} className="text-teal-600 dark:text-teal-400" /></div>
                <StatusBadge label={p.active ? "active" : "inactive"} variant={p.active ? "success" : "neutral"} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{p.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed flex-1">{p.description}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2"><Pill color="slate">{p.category}</Pill><span className="text-xs text-slate-400">{p.steps} steps</span></div>
                <button onClick={() => run(p.id)} className="text-xs flex items-center gap-1 px-2.5 py-1 bg-teal-100 text-teal-700 hover:bg-teal-200 rounded-lg transition"><Play size={12} /> Run</button>
              </div>
            </div>
          ))}
          {all.length === 0 && <div className="col-span-full py-10 text-center text-sm text-slate-400">No playbooks yet.</div>}
        </div>
      )}
    </SolutionShell>
  );
}
