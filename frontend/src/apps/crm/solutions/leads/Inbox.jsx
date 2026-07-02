import { useState, useMemo } from "react";
import { UserPlus, Plus, Search, Target, Flame, CheckCircle2, ArrowRightCircle } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, ErrorNote, Modal, Field, TextInput, SelectInput, PrimaryBtn, GhostBtn, Pill, fmtNum } from "../../components/crm-ui";

const STAGE_VARIANT = { New: "info", Contacted: "neutral", Qualified: "indigo", "Demo Booked": "warning", "Closed Won": "success", "Closed Lost": "danger" };
const STAGES = ["all", "New", "Contacted", "Qualified", "Demo Booked"];

function NewLeadModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", value: "", stage: "New" });
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => crm.leads.create(d), {
    onSuccess: () => { toast({ message: "Lead created", type: "success" }); onCreated(); onClose(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  return (
    <Modal title="New Lead" onClose={onClose}
      footer={<><GhostBtn onClick={onClose}>Cancel</GhostBtn><PrimaryBtn color="amber" disabled={loading} onClick={() => { if (!form.name.trim()) return setErr("Name required"); mutate(form); }}>{loading ? "Creating…" : "Create Lead"}</PrimaryBtn></>}>
      {err && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
      <Field label="Lead / Company Name *"><TextInput value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Acme Corp — Jane Doe" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Stage"><SelectInput value={form.stage} onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value }))}>{["New", "Contacted", "Qualified", "Demo Booked"].map((s) => <option key={s}>{s}</option>)}</SelectInput></Field>
        <Field label="Est. Value ($)"><TextInput type="number" value={form.value} onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))} placeholder="0" /></Field>
      </div>
    </Modal>
  );
}

export default function Inbox() {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("all");
  const { data: leads, loading, error, refetch } = useApi(() => crm.leads.list(), [], { pollingInterval: 60000 });

  // Cross-module workflow: promote a lead into the Opportunities pipeline.
  const { mutate: convert, loading: converting } = useMutation((id) => crm.leads.convert(id), {
    onSuccess: (r) => { toast({ message: `${r.opportunity?.name ?? "Lead"} moved to the pipeline`, type: "success" }); refetch(); },
    onError: (e) => toast({ message: e.message, type: "error" }),
  });

  const all = leads ?? [];
  const filtered = useMemo(() => all.filter((l) => {
    const ms = stage === "all" || l.stage === stage;
    const mq = !search || l.name?.toLowerCase().includes(search.toLowerCase());
    return ms && mq;
  }), [all, search, stage]);

  const metrics = [
    { label: "Total Leads", value: fmtNum(all.length), icon: UserPlus, color: "amber" },
    { label: "New", value: fmtNum(all.filter((l) => l.stage === "New").length), icon: Flame, color: "orange" },
    { label: "Qualified", value: fmtNum(all.filter((l) => l.stage === "Qualified").length), icon: CheckCircle2, color: "emerald" },
    { label: "Avg Score", value: all.length ? Math.round(all.reduce((s, l) => s + (l.score ?? 0), 0) / all.length) : "—", icon: Target, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="leads" title="Lead Inbox" subtitle="Every inbound and outbound lead in one queue"
      actions={<PrimaryBtn color="amber" onClick={() => setShowModal(true)}><Plus size={15} /> New Lead</PrimaryBtn>}>
      {showModal && <NewLeadModal onClose={() => setShowModal(false)} onCreated={refetch} />}
      <ErrorNote error={error} />
      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <Section title={`${fmtNum(filtered.length)} Leads`} pad={false}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 bg-white dark:bg-slate-900">
              <Search size={13} className="text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="text-sm bg-transparent outline-none text-slate-900 dark:text-white w-28" />
            </div>
          </div>
        }>
        <div className="px-5 pt-3 flex gap-1.5 flex-wrap">
          {STAGES.map((s) => (
            <button key={s} onClick={() => setStage(s)} className={`text-xs px-2.5 py-1 rounded-full border transition ${stage === s ? "bg-amber-500 text-white border-amber-500" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-400"}`}>{s === "all" ? "All" : s}</button>
          ))}
        </div>
        {loading && all.length === 0 ? <div className="p-3"><Loading table /></div> : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Lead", "Source", "Score", "Value", "Owner", "Stage", ""].map((h, i) => (
                    <th key={i} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-500">No leads found.</td></tr>
                ) : filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{l.name}</div>
                      <div className="text-xs text-slate-400">{l.company}</div>
                    </td>
                    <td className="px-5 py-3"><Pill color="amber">{l.source}</Pill></td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold ${l.score >= 80 ? "text-emerald-600" : l.score >= 60 ? "text-amber-600" : "text-slate-500"}`}>{l.score}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{l.value}</td>
                    <td className="px-5 py-3 text-slate-500">{l.owner ?? "—"}</td>
                    <td className="px-5 py-3"><StatusBadge label={l.stage} variant={STAGE_VARIANT[l.stage] ?? "neutral"} /></td>
                    <td className="px-5 py-3 text-right">
                      {l.stage === "New" && (
                        <button
                          onClick={() => convert(l.id)}
                          disabled={converting}
                          title="Convert to opportunity"
                          className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 disabled:opacity-50 transition"
                        >
                          <ArrowRightCircle size={13} /> Convert
                        </button>
                      )}
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
