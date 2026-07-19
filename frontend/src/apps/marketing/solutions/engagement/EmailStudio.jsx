import { useState, useMemo } from "react";
import { Mail, Plus, Play, Pause, Search, MousePointerClick, Eye, Send } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, ErrorNote, Modal, Field, TextInput, SelectInput, PrimaryBtn, GhostBtn, fmtNum } from "../../components/mkt-ui";

const STATUS_VARIANT = { active: "success", paused: "warning", draft: "neutral", completed: "info", scheduled: "indigo" };

function NewEmailModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", objective: "Retention", channel: "email" });
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => marketing.campaigns.create(d), {
    onSuccess: () => { toast({ message: "Email campaign created", type: "success" }); onCreated(); onClose(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <Modal title="New Email Campaign" onClose={onClose}
      footer={<><GhostBtn onClick={onClose}>Cancel</GhostBtn><PrimaryBtn disabled={loading} onClick={() => { if (!form.name.trim()) return setErr("Name required"); mutate(form); }}>{loading ? "Creating…" : "Create"}</PrimaryBtn></>}>
      {err && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
      <Field label="Campaign Name *"><TextInput value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="April Product Newsletter" /></Field>
      <Field label="Objective">
        <SelectInput value={form.objective} onChange={(e) => set("objective", e.target.value)}>
          {["Retention", "Lead Generation", "Brand Awareness", "Demand Gen", "Revenue"].map((o) => <option key={o}>{o}</option>)}
        </SelectInput>
      </Field>
    </Modal>
  );
}

export default function EmailStudio() {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const { data: campaigns, loading, error, refetch } = useApi(() => marketing.campaigns.list({ limit: 200 }), [], { pollingInterval: 60000 });
  const { mutate: start } = useMutation((id) => marketing.campaigns.start(id), { onSuccess: () => { toast({ message: "Campaign started", type: "success" }); refetch(); } });
  const { mutate: pause } = useMutation((id) => marketing.campaigns.pause(id), { onSuccess: () => { toast({ message: "Campaign paused", type: "success" }); refetch(); } });

  const emails = useMemo(() => (campaigns ?? []).filter((c) => ["email", "multi-channel"].includes(c.channel)), [campaigns]);
  const filtered = emails.filter((c) => !search || c.name?.toLowerCase().includes(search.toLowerCase()));

  const totalSends = emails.reduce((s, c) => s + (c.opens ?? 0), 0);
  const totalClicks = emails.reduce((s, c) => s + (c.clicks ?? 0), 0);
  const avgOpen = emails.filter((c) => c.openRate).length ? (emails.reduce((s, c) => s + (c.openRate ?? 0), 0) / emails.filter((c) => c.openRate).length).toFixed(1) : "—";

  const metrics = [
    { label: "Email Campaigns", value: fmtNum(emails.length), icon: Mail, color: "violet" },
    { label: "Total Opens", value: fmtNum(totalSends), icon: Eye, color: "sky" },
    { label: "Total Clicks", value: fmtNum(totalClicks), icon: MousePointerClick, color: "emerald" },
    { label: "Avg Open Rate", value: avgOpen === "—" ? "—" : `${avgOpen}%`, icon: Send, color: "amber" },
  ];

  return (
    <SolutionShell solutionId="engagement" title="Email Studio" subtitle="Design, send, and track email campaigns"
      actions={<PrimaryBtn onClick={() => setShowModal(true)}><Plus size={15} /> New Email</PrimaryBtn>}>
      {showModal && <NewEmailModal onClose={() => setShowModal(false)} onCreated={refetch} />}
      <ErrorNote error={error} />
      <MetricGrid items={metrics} cols={4} loading={loading && emails.length === 0} />

      <Section title="Email Campaigns" pad={false}
        actions={
          <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 bg-white dark:bg-slate-900">
            <Search size={13} className="text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="text-sm bg-transparent outline-none text-slate-900 dark:text-white w-32" />
          </div>
        }>
        {loading && emails.length === 0 ? <Loading table /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Campaign", "Opens", "Clicks", "Open Rate", "CTR", "Status", ""].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-500">No email campaigns found.</td></tr>
                ) : filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{c.name}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{fmtNum(c.opens)}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{fmtNum(c.clicks)}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{c.openRate != null ? `${c.openRate}%` : "—"}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{c.ctr != null ? `${c.ctr}%` : "—"}</td>
                    <td className="px-5 py-3"><StatusBadge label={c.status ?? "draft"} variant={STATUS_VARIANT[c.status] ?? "neutral"} /></td>
                    <td className="px-5 py-3">
                      {c.status === "active" ? (
                        <button onClick={() => pause(c.id)} className="text-xs flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg transition"><Pause size={12} /> Pause</button>
                      ) : c.status !== "completed" ? (
                        <button onClick={() => start(c.id)} className="text-xs flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition"><Play size={12} /> Send</button>
                      ) : null}
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
