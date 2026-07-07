import { useState } from "react";
import { PieChart, Plus, Users, Zap, Copy } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, Modal, Field, TextInput, SelectInput, PrimaryBtn, GhostBtn, Pill, fmtNum } from "../../components/mkt-ui";

const STATUS_VARIANT = { active: "success", draft: "neutral", building: "warning" };

export default function Segments() {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", type: "behavioral", size: "", description: "" });
  const { data: audiences, loading, refetch } = useApi(() => marketing.audiences.list(), [], { pollingInterval: 60000 });
  const { mutate: create, loading: creating } = useMutation((d) => marketing.audiences.create(d), {
    onSuccess: () => { toast({ message: "Segment created", type: "success" }); setShowModal(false); setForm({ name: "", type: "behavioral", size: "", description: "" }); refetch(); },
  });
  const { mutate: activate } = useMutation((id) => marketing.audiences.activate(id), { onSuccess: () => { toast({ message: "Segment activated", type: "success" }); refetch(); } });
  const { mutate: lookalike } = useMutation((id) => marketing.audiences.createLookalike(id), { onSuccess: () => { toast({ message: "Lookalike created", type: "success" }); refetch(); } });

  const all = audiences ?? [];
  const metrics = [
    { label: "Segments", value: all.length, icon: PieChart, color: "indigo" },
    { label: "Active", value: all.filter((a) => a.status === "active").length, icon: Zap, color: "emerald" },
    { label: "Total Reach", value: fmtNum(all.reduce((s, a) => s + (a.size ?? 0), 0)), icon: Users, color: "violet" },
    { label: "Lookalikes", value: all.filter((a) => a.type === "lookalike").length, icon: Copy, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="datacloud" title="Segments" subtitle="Build and manage audience segments from unified profiles"
      actions={<PrimaryBtn color="indigo" onClick={() => setShowModal(true)}><Plus size={15} /> New Segment</PrimaryBtn>}>
      {showModal && (
        <Modal title="New Segment" onClose={() => setShowModal(false)}
          footer={<><GhostBtn onClick={() => setShowModal(false)}>Cancel</GhostBtn><PrimaryBtn color="indigo" disabled={creating || !form.name.trim()} onClick={() => create(form)}>{creating ? "Creating…" : "Create"}</PrimaryBtn></>}>
          <Field label="Segment Name *"><TextInput value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="High-Intent Enterprise" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <SelectInput value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                {["behavioral", "firmographic", "demographic", "intent", "lookalike"].map((t) => <option key={t}>{t}</option>)}
              </SelectInput>
            </Field>
            <Field label="Est. Size"><TextInput type="number" value={form.size} onChange={(e) => setForm((p) => ({ ...p, size: e.target.value }))} placeholder="0" /></Field>
          </div>
          <Field label="Description"><TextInput value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Who is in this segment?" /></Field>
        </Modal>
      )}

      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      {loading && all.length === 0 ? <Loading rows={6} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {all.map((a) => (
            <div key={a.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <Pill color="violet">{a.type}</Pill>
                <StatusBadge label={a.status} variant={STATUS_VARIANT[a.status] ?? "neutral"} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{a.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed flex-1">{a.description}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div><span className="text-lg font-bold text-slate-900 dark:text-white">{fmtNum(a.size)}</span><span className="text-xs text-slate-400 ml-1">profiles</span></div>
                <div className="flex gap-1.5">
                  {a.status !== "active" && <button onClick={() => activate(a.id)} className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition">Activate</button>}
                  <button onClick={() => lookalike(a.id)} title="Create lookalike" className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-lg transition flex items-center gap-1"><Copy size={12} /></button>
                </div>
              </div>
            </div>
          ))}
          {all.length === 0 && <div className="col-span-full py-10 text-center text-sm text-slate-400">No segments yet.</div>}
        </div>
      )}
    </SolutionShell>
  );
}
