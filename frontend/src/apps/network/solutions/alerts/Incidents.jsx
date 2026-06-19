import { useState } from "react";
import { AlertTriangle, Plus, ArrowUpCircle, CheckCircle2, Clock } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, Modal, Field, TextInput, SelectInput, PrimaryBtn, GhostBtn, Pill, fmtNum, fmtDate } from "../../components/net-ui";

const SEV_COLOR = { critical: "red", high: "rose", medium: "amber", low: "slate" };
const STATUS_VARIANT = { open: "danger", investigating: "warning", resolved: "success", closed: "neutral" };

export default function Incidents() {
  const toast = useToast();
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", severity: "medium", description: "" });
  const [err, setErr] = useState(null);
  const { data: incidents, loading, refetch } = useApi(() => network.incidents.list({ take: 100 }), [], { pollingInterval: 30000 });
  const { data: timeline } = useApi(() => (selected ? network.incidents.timeline(selected) : Promise.resolve(null)), [selected]);
  const { mutate: create, loading: creating } = useMutation((d) => network.incidents.create(d), {
    onSuccess: () => { toast({ message: "Incident opened", type: "success" }); setShowModal(false); setForm({ title: "", severity: "medium", description: "" }); refetch(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  const { mutate: resolve } = useMutation((id) => network.incidents.resolve(id), { onSuccess: () => { toast({ message: "Incident resolved", type: "success" }); refetch(); } });
  const { mutate: escalate } = useMutation((id) => network.incidents.escalate(id), { onSuccess: () => { toast({ message: "Incident escalated", type: "success" }); refetch(); } });

  const all = incidents ?? [];
  const sel = all.find((i) => i.id === selected);
  const open = all.filter((i) => !["resolved", "closed"].includes(i.status));

  const metrics = [
    { label: "Incidents", value: fmtNum(all.length), icon: AlertTriangle, color: "rose" },
    { label: "Open", value: fmtNum(open.length), icon: Clock, color: "amber" },
    { label: "Critical", value: fmtNum(all.filter((i) => i.severity === "critical" && !["resolved", "closed"].includes(i.status)).length), icon: ArrowUpCircle, color: "red" },
    { label: "Resolved", value: fmtNum(all.filter((i) => i.status === "resolved").length), icon: CheckCircle2, color: "emerald" },
  ];

  return (
    <SolutionShell solutionId="alerts" title="Incidents" subtitle="Coordinate response from detection to resolution"
      actions={<PrimaryBtn color="rose" onClick={() => setShowModal(true)}><Plus size={15} /> New Incident</PrimaryBtn>}>
      {showModal && (
        <Modal title="Open Incident" onClose={() => setShowModal(false)}
          footer={<><GhostBtn onClick={() => setShowModal(false)}>Cancel</GhostBtn><PrimaryBtn color="rose" disabled={creating} onClick={() => { if (!form.title.trim()) return setErr("Title required"); create(form); }}>{creating ? "Opening…" : "Open"}</PrimaryBtn></>}>
          {err && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <Field label="Title *"><TextInput value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Edge router packet loss" /></Field>
          <Field label="Severity"><SelectInput value={form.severity} onChange={(e) => setForm((p) => ({ ...p, severity: e.target.value }))}>{["low", "medium", "high", "critical"].map((s) => <option key={s}>{s}</option>)}</SelectInput></Field>
          <Field label="Description"><TextInput value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="What's happening?" /></Field>
        </Modal>
      )}

      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Incidents" className="lg:col-span-2" pad={false}>
          {loading && all.length === 0 ? <Loading table /> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {all.length === 0 ? <div className="py-10 text-center text-sm text-slate-400">No incidents.</div> : all.map((i) => (
                <button key={i.id} onClick={() => setSelected(i.id)} className={`w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${selected === i.id ? "bg-rose-50/40 dark:bg-rose-500/5" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{i.title}</div>
                    <div className="text-xs text-slate-400 truncate">{fmtDate(i.createdAt)}{i.description ? ` · ${i.description}` : ""}</div>
                  </div>
                  <Pill color={SEV_COLOR[i.severity] ?? "slate"}>{i.severity}</Pill>
                  <StatusBadge label={i.status} variant={STATUS_VARIANT[i.status] ?? "neutral"} />
                </button>
              ))}
            </div>
          )}
        </Section>

        <Section title={sel?.title ?? "Incident Detail"} subtitle={selected ? "Timeline & actions" : "Select an incident"} icon={AlertTriangle} className="lg:col-span-1">
          {!sel ? (
            <div className="py-10 text-center text-sm text-slate-400">Choose an incident.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <button onClick={() => escalate(sel.id)} disabled={sel.severity === "critical"} className="flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition"><ArrowUpCircle size={15} /> Escalate</button>
                <button onClick={() => resolve(sel.id)} disabled={sel.status === "resolved"} className="flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition"><CheckCircle2 size={15} /> Resolve</button>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Timeline</h4>
                <div className="space-y-3">
                  {(timeline ?? []).map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${t.type === "resolved" ? "bg-emerald-500" : t.type === "critical" ? "bg-red-500" : "bg-rose-400"}`} />
                      <div><p className="text-slate-700 dark:text-slate-200">{t.event}</p><p className="text-[11px] text-slate-400">{fmtDate(t.time)}</p></div>
                    </div>
                  ))}
                  {(!timeline || timeline.length === 0) && <div className="py-4 text-center text-xs text-slate-400">No timeline events.</div>}
                </div>
              </div>
            </div>
          )}
        </Section>
      </div>
    </SolutionShell>
  );
}
