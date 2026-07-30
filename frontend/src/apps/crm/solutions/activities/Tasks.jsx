import { useState, useMemo } from "react";
import { ListChecks, Plus, Check, CircleDot, AlarmClock } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, ErrorNote, Modal, Field, TextInput, SelectInput, PrimaryBtn, GhostBtn, Pill, fmtNum, fmtDate } from "../../components/crm-ui";
import useRecordFocus from "../../../../hooks/useRecordFocus";

const PRIORITY_COLOR = { high: "rose", medium: "amber", low: "slate" };
const FILTERS = ["all", "pending", "in_progress", "completed"];

export default function Tasks() {
  // A task followed from global search lands on its row.
  const focus = useRecordFocus();
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", priority: "medium", dueDate: "" });
  const [err, setErr] = useState(null);
  const { data: tasks, loading, error, refetch } = useApi(() => crm.tasks.list(), [], { pollingInterval: 60000 });
  const { mutate: create, loading: creating } = useMutation((d) => crm.tasks.create(d), {
    onSuccess: () => { toast({ message: "Task created", type: "success" }); setShowModal(false); setForm({ title: "", priority: "medium", dueDate: "" }); refetch(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  const { mutate: complete } = useMutation((id) => crm.tasks.complete(id), {
    onSuccess: () => { toast({ message: "Task completed", type: "success" }); refetch(); },
  });

  const all = tasks ?? [];
  const filtered = useMemo(() => (filter === "all" ? all : all.filter((t) => t.status === filter)), [all, filter]);

  const metrics = [
    { label: "Total Tasks", value: fmtNum(all.length), icon: ListChecks, color: "indigo" },
    { label: "Open", value: fmtNum(all.filter((t) => t.status !== "completed").length), icon: CircleDot, color: "amber" },
    { label: "Completed", value: fmtNum(all.filter((t) => t.status === "completed").length), icon: Check, color: "emerald" },
    { label: "High Priority", value: fmtNum(all.filter((t) => t.priority === "high" && t.status !== "completed").length), icon: AlarmClock, color: "rose" },
  ];

  return (
    <SolutionShell solutionId="activities" title="Tasks" subtitle="Every follow-up and to-do across your accounts"
      actions={<PrimaryBtn color="indigo" onClick={() => setShowModal(true)}><Plus size={15} /> New Task</PrimaryBtn>}>
      {showModal && (
        <Modal title="New Task" onClose={() => setShowModal(false)}
          footer={<><GhostBtn onClick={() => setShowModal(false)}>Cancel</GhostBtn><PrimaryBtn color="indigo" disabled={creating} onClick={() => { if (!form.title.trim()) return setErr("Title required"); create(form); }}>{creating ? "Creating…" : "Create"}</PrimaryBtn></>}>
          {err && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <Field label="Task *"><TextInput value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Follow up with Acme Corp" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority"><SelectInput value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>{["high", "medium", "low"].map((p) => <option key={p}>{p}</option>)}</SelectInput></Field>
            <Field label="Due Date"><TextInput type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} /></Field>
          </div>
        </Modal>
      )}

      <ErrorNote error={error} />
      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <Section title="Task List" icon={ListChecks} pad={false}
        actions={
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`text-xs px-2.5 py-1 rounded-full border capitalize transition ${filter === f ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400"}`}>{f.replace("_", " ")}</button>
            ))}
          </div>
        }>
        {loading && all.length === 0 ? <Loading table /> : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length === 0 ? <div className="py-10 text-center text-sm text-slate-400">No tasks.</div> : filtered.map((t) => (
              <div key={t.id} data-record-id={t.id} className={focus.className(t.id, "px-5 py-3 flex items-center gap-3")}>
                <button onClick={() => t.status !== "completed" && complete(t.id)} disabled={t.status === "completed"}
                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${t.status === "completed" ? "bg-emerald-500 border-emerald-500" : "border-slate-300 dark:border-slate-600 hover:border-indigo-500"}`}>
                  {t.status === "completed" && <Check size={12} className="text-white" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium ${t.status === "completed" ? "line-through text-slate-400" : "text-slate-900 dark:text-white"}`}>{t.title}</div>
                  <div className="text-xs text-slate-400">{t.assignee ?? "Unassigned"}{t.dueDate && ` · due ${fmtDate(t.dueDate)}`}</div>
                </div>
                {t.priority && <Pill color={PRIORITY_COLOR[t.priority]}>{t.priority}</Pill>}
                <StatusBadge label={t.status?.replace("_", " ")} variant={t.status === "completed" ? "success" : t.status === "in_progress" ? "info" : "neutral"} />
              </div>
            ))}
          </div>
        )}
      </Section>
    </SolutionShell>
  );
}
