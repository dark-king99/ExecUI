import { useState, useMemo } from "react";
import { Target, Plus, Search, DollarSign, Trophy } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, ErrorNote, Modal, Field, TextInput, SelectInput, PrimaryBtn, GhostBtn, fmtNum } from "../../components/crm-ui";

const STAGE_VARIANT = { Prospecting: "neutral", Qualified: "info", Proposal: "indigo", Negotiation: "warning", "Closed Won": "success", "Closed Lost": "danger" };
const STAGES = ["all", "Prospecting", "Qualified", "Proposal", "Negotiation"];

function NewOppModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", value: "", stage: "Prospecting", probability: "" });
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => crm.opportunities.create(d), {
    onSuccess: () => { toast({ message: "Opportunity created", type: "success" }); onCreated(); onClose(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  return (
    <Modal title="New Opportunity" onClose={onClose}
      footer={<><GhostBtn onClick={onClose}>Cancel</GhostBtn><PrimaryBtn disabled={loading} onClick={() => { if (!form.name.trim()) return setErr("Name required"); mutate(form); }}>{loading ? "Creating…" : "Create"}</PrimaryBtn></>}>
      {err && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
      <Field label="Opportunity Name *"><TextInput value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Acme Corp — Enterprise License" /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Stage"><SelectInput value={form.stage} onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value }))}>{["Prospecting", "Qualified", "Proposal", "Negotiation"].map((s) => <option key={s}>{s}</option>)}</SelectInput></Field>
        <Field label="Value ($)"><TextInput type="number" value={form.value} onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))} placeholder="0" /></Field>
        <Field label="Prob. %"><TextInput type="number" value={form.probability} onChange={(e) => setForm((p) => ({ ...p, probability: e.target.value }))} placeholder="10" /></Field>
      </div>
    </Modal>
  );
}

export default function Workspace() {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("all");
  const { data: opps, loading, error, refetch } = useApi(() => crm.opportunities.list(), [], { pollingInterval: 60000 });
  const { data: summary } = useApi(() => crm.opportunities.summary(), [], { pollingInterval: 120000 });

  const all = opps ?? [];
  const filtered = useMemo(() => all.filter((o) => {
    const ms = stage === "all" || o.stage === stage;
    const mq = !search || o.name?.toLowerCase().includes(search.toLowerCase());
    return ms && mq;
  }), [all, search, stage]);

  const s = summary ?? {};
  const metrics = [
    { label: "Open Opportunities", value: fmtNum(s.total ?? all.length), icon: Target, color: "violet" },
    { label: "Open Value", value: s.valueFmt ?? "—", icon: DollarSign, color: "emerald" },
    { label: "Won", value: fmtNum(s.won ?? all.filter((o) => o.stage === "Closed Won").length), icon: Trophy, color: "amber" },
    { label: "Avg Probability", value: all.length ? `${Math.round(all.reduce((a, o) => a + (o.probability ?? 0), 0) / all.length)}%` : "—", icon: Target, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="opportunities" title="Opportunity Workspace" subtitle="Manage and update every opportunity in your book"
      actions={<PrimaryBtn onClick={() => setShowModal(true)}><Plus size={15} /> New Opportunity</PrimaryBtn>}>
      {showModal && <NewOppModal onClose={() => setShowModal(false)} onCreated={refetch} />}
      <ErrorNote error={error} />
      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <Section title="Opportunities" pad={false}
        actions={
          <div className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 bg-white dark:bg-slate-900">
            <Search size={13} className="text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="text-sm bg-transparent outline-none text-slate-900 dark:text-white w-28" />
          </div>
        }>
        <div className="px-5 pt-3 flex gap-1.5 flex-wrap">
          {STAGES.map((st) => (
            <button key={st} onClick={() => setStage(st)} className={`text-xs px-2.5 py-1 rounded-full border transition ${stage === st ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-400"}`}>{st === "all" ? "All" : st}</button>
          ))}
        </div>
        {loading && all.length === 0 ? <div className="p-3"><Loading table /></div> : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Opportunity", "Owner", "Value", "Probability", "Close Date", "Stage"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-500">No opportunities found.</td></tr>
                ) : filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{o.name}</div>
                      <div className="text-xs text-slate-400">{o.account}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{o.owner ?? "—"}</td>
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{o.value}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{o.probability}%</td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{o.closeDate ?? "—"}</td>
                    <td className="px-5 py-3"><StatusBadge label={o.stage} variant={STAGE_VARIANT[o.stage] ?? "neutral"} /></td>
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
