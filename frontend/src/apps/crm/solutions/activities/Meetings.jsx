import { useState } from "react";
import { CalendarClock, Plus, Video, User } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, Modal, Field, TextInput, PrimaryBtn, GhostBtn, fmtNum, fmtDate } from "../../components/crm-ui";

const STATUS_VARIANT = { scheduled: "info", completed: "success", cancelled: "danger" };

export default function Meetings() {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", scheduledAt: "" });
  const [err, setErr] = useState(null);
  const { data: meetings, loading, refetch } = useApi(() => crm.meetings.list(), [], { pollingInterval: 60000 });
  const { mutate: create, loading: creating } = useMutation((d) => crm.meetings.create(d), {
    onSuccess: () => { toast({ message: "Meeting scheduled", type: "success" }); setShowModal(false); setForm({ title: "", scheduledAt: "" }); refetch(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });

  const all = meetings ?? [];
  const upcoming = all.filter((m) => m.status === "scheduled");
  const metrics = [
    { label: "Meetings", value: fmtNum(all.length), icon: CalendarClock, color: "indigo" },
    { label: "Scheduled", value: fmtNum(upcoming.length), icon: Video, color: "emerald" },
    { label: "Completed", value: fmtNum(all.filter((m) => m.status === "completed").length), icon: CalendarClock, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="activities" title="Meetings" subtitle="Scheduled calls and meetings with your prospects"
      actions={<PrimaryBtn color="indigo" onClick={() => setShowModal(true)}><Plus size={15} /> Schedule</PrimaryBtn>}>
      {showModal && (
        <Modal title="Schedule Meeting" onClose={() => setShowModal(false)}
          footer={<><GhostBtn onClick={() => setShowModal(false)}>Cancel</GhostBtn><PrimaryBtn color="indigo" disabled={creating} onClick={() => { if (!form.title.trim()) return setErr("Title required"); create(form); }}>{creating ? "Scheduling…" : "Schedule"}</PrimaryBtn></>}>
          {err && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <Field label="Meeting Title *"><TextInput value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Discovery call with Acme Corp" /></Field>
          <Field label="Date & Time"><TextInput type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))} /></Field>
        </Modal>
      )}

      <MetricGrid items={metrics} cols={3} loading={loading && all.length === 0} />

      <Section title="Upcoming & Recent" icon={CalendarClock} pad={false}>
        {loading && all.length === 0 ? <Loading table /> : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {all.length === 0 ? <div className="py-10 text-center text-sm text-slate-400">No meetings scheduled.</div> : all.map((m) => (
              <div key={m.id} className="px-5 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0"><CalendarClock size={16} className="text-indigo-600 dark:text-indigo-400" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{m.title}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span>{fmtDate(m.scheduledAt)}</span>
                    {m.owner && <span className="inline-flex items-center gap-1"><User size={11} />{m.owner}</span>}
                  </div>
                </div>
                <StatusBadge label={m.status} variant={STATUS_VARIANT[m.status] ?? "neutral"} />
              </div>
            ))}
          </div>
        )}
      </Section>
    </SolutionShell>
  );
}
