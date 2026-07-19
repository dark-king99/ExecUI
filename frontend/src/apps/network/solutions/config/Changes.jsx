import { useState, useMemo } from "react";
import { GitBranch, Plus, Check, X, Clock } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, Modal, Field, TextInput, SelectInput, PrimaryBtn, GhostBtn, Pill, fmtNum, fmtDate } from "../../components/net-ui";

const STATUS_VARIANT = { pending: "warning", approved: "success", rejected: "danger", completed: "info" };
const PRIORITY_COLOR = { urgent: "red", high: "rose", medium: "amber", low: "slate" };
const FILTERS = ["all", "pending", "approved", "rejected"];

export default function Changes() {
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", priority: "medium", description: "" });
  const [err, setErr] = useState(null);
  const { data: changes, loading, refetch } = useApi(() => network.changes.list({ take: 100 }), [], { pollingInterval: 60000 });
  const { mutate: create, loading: creating } = useMutation((d) => network.changes.create(d), {
    onSuccess: () => { toast({ message: "Change request raised", type: "success" }); setShowModal(false); setForm({ title: "", priority: "medium", description: "" }); refetch(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  const { mutate: approve } = useMutation((id) => network.changes.approve(id), { onSuccess: () => { toast({ message: "Change approved", type: "success" }); refetch(); } });
  const { mutate: reject } = useMutation((id) => network.changes.reject(id), { onSuccess: () => { toast({ message: "Change rejected", type: "success" }); refetch(); } });

  const all = changes ?? [];
  const filtered = useMemo(() => (filter === "all" ? all : all.filter((c) => c.status === filter)), [all, filter]);

  const metrics = [
    { label: "Change Requests", value: fmtNum(all.length), icon: GitBranch, color: "amber" },
    { label: "Pending", value: fmtNum(all.filter((c) => c.status === "pending").length), icon: Clock, color: "amber" },
    { label: "Approved", value: fmtNum(all.filter((c) => c.status === "approved").length), icon: Check, color: "emerald" },
    { label: "Rejected", value: fmtNum(all.filter((c) => c.status === "rejected").length), icon: X, color: "red" },
  ];

  return (
    <SolutionShell solutionId="config" title="Change Management" subtitle="Govern network change with a request and approval workflow"
      actions={<PrimaryBtn color="amber" onClick={() => setShowModal(true)}><Plus size={15} /> New Change</PrimaryBtn>}>
      {showModal && (
        <Modal title="New Change Request" onClose={() => setShowModal(false)}
          footer={<><GhostBtn onClick={() => setShowModal(false)}>Cancel</GhostBtn><PrimaryBtn color="amber" disabled={creating} onClick={() => { if (!form.title.trim()) return setErr("Title required"); create(form); }}>{creating ? "Raising…" : "Raise"}</PrimaryBtn></>}>
          {err && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <Field label="Title *"><TextInput value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Upgrade core switch firmware" /></Field>
          <Field label="Priority"><SelectInput value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>{["low", "medium", "high", "urgent"].map((s) => <option key={s}>{s}</option>)}</SelectInput></Field>
          <Field label="Description"><TextInput value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="What's changing and why?" /></Field>
        </Modal>
      )}

      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <Section title="Change Requests" icon={GitBranch} pad={false}
        actions={
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`text-xs px-2.5 py-1 rounded-full border capitalize transition ${filter === f ? "bg-amber-600 text-white border-amber-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-400"}`}>{f}</button>
            ))}
          </div>
        }>
        {loading && all.length === 0 ? <Loading table /> : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length === 0 ? <div className="py-10 text-center text-sm text-slate-400">No change requests.</div> : filtered.map((c) => (
              <div key={c.id} className="px-5 py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{c.title}</div>
                  <div className="text-xs text-slate-400 truncate">{fmtDate(c.createdAt)}{c.description ? ` · ${c.description}` : ""}</div>
                </div>
                <Pill color={PRIORITY_COLOR[c.priority] ?? "slate"}>{c.priority}</Pill>
                <StatusBadge label={c.status} variant={STATUS_VARIANT[c.status] ?? "neutral"} />
                {c.status === "pending" && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => approve(c.id)} title="Approve" className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition"><Check size={14} /></button>
                    <button onClick={() => reject(c.id)} title="Reject" className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"><X size={14} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </SolutionShell>
  );
}
