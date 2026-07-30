import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Headset, Search, CheckCircle2, Lock, Unlock, AlertTriangle, MessageSquare, ExternalLink, User } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import useRecordParam from "../../../../hooks/useRecordParam";
import { linkTo } from "../../../../lib/recordLinks";
import { SolutionShell, MetricGrid, Section, Loading, ErrorNote, Pill, fmtNum } from "../../components/crm-ui";

const PRIORITY_VARIANT = { high: "danger", urgent: "danger", medium: "warning", low: "neutral" };
const SLA_VARIANT = { on_track: "success", at_risk: "warning", breached: "danger" };

export default function Cases() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  // Which case is open lives in the URL, so a search result or a link from the
  // helpdesk lands on it.
  const [selected, setSelected] = useRecordParam("open");
  const { data: cases, loading, error, refetch } = useApi(() => crm.cases.list(), [], { pollingInterval: 60000 });
  const { mutate: approve } = useMutation((id) => crm.cases.approve(id), { onSuccess: () => { toast({ message: "Case resolved", type: "success" }); refetch(); } });
  const { mutate: lock } = useMutation((id) => crm.cases.lock(id), { onSuccess: () => { toast({ message: "SLA marked breached", type: "success" }); refetch(); } });
  const { mutate: unlock } = useMutation((id) => crm.cases.unlock(id), { onSuccess: () => { toast({ message: "SLA reset to on-track", type: "success" }); refetch(); } });

  const all = cases ?? [];
  const filtered = useMemo(() => all.filter((c) => !search || c.title?.toLowerCase().includes(search.toLowerCase()) || c.ticketNumber?.toLowerCase?.().includes(search.toLowerCase())), [all, search]);
  const sel = all.find((c) => c.id === selected);

  const metrics = [
    { label: "Total Cases", value: fmtNum(all.length), icon: Headset, color: "rose" },
    { label: "Open", value: fmtNum(all.filter((c) => c.status !== "resolved").length), icon: AlertTriangle, color: "amber" },
    { label: "Resolved", value: fmtNum(all.filter((c) => c.status === "resolved").length), icon: CheckCircle2, color: "emerald" },
    { label: "SLA Breached", value: fmtNum(all.filter((c) => c.slaStatus === "breached").length), icon: Lock, color: "rose" },
  ];

  return (
    <SolutionShell solutionId="service" title="Cases"
      subtitle="The same support tickets the helpdesk queue works — seen from the account side.">
      <ErrorNote error={error} />
      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title={`${fmtNum(filtered.length)} Cases`} className="lg:col-span-2" pad={false}
          actions={
            <div className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 bg-white dark:bg-slate-900">
              <Search size={13} className="text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="text-sm bg-transparent outline-none text-slate-900 dark:text-white w-28" />
            </div>
          }>
          {loading && all.length === 0 ? <Loading table /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    {["Case", "Priority", "SLA", "Status"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={4} className="py-10 text-center text-sm text-slate-500">No cases found.</td></tr>
                  ) : filtered.map((c) => (
                    <tr key={c.id} data-record-id={c.id} onClick={() => setSelected(c.id)} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer ${selected === c.id ? "bg-rose-50/40 dark:bg-rose-500/5 ring-2 ring-rose-300/60" : ""}`}>
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-900 dark:text-white">{c.title}</div>
                        <div className="text-xs text-slate-400">{c.ticketNumber} · {c.category}</div>
                      </td>
                      <td className="px-5 py-3"><Pill color={c.priority === "high" || c.priority === "urgent" ? "rose" : c.priority === "medium" ? "amber" : "slate"}>{c.priority}</Pill></td>
                      <td className="px-5 py-3"><StatusBadge label={(c.slaStatus ?? "—").replace("_", " ")} variant={SLA_VARIANT[c.slaStatus] ?? "neutral"} dot /></td>
                      <td className="px-5 py-3"><StatusBadge label={c.status} variant={c.status === "resolved" ? "success" : "info"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title={sel?.title ?? "Case Detail"} subtitle={selected ? sel?.ticketNumber : "Select a case to take action"} icon={Headset} className="lg:col-span-1">
          {!sel ? (
            <div className="py-10 text-center text-sm text-slate-400">Choose a case from the list.</div>
          ) : (
            <div className="space-y-4">
              {/* `description` is the problem described; the customer's name is its
                  own field. This panel used to print the customer name here,
                  under the label "Customer", by reading the description. */}
              {sel.description && (
                <p className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">{sel.description}</p>
              )}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Customer</span><span className="text-slate-800 dark:text-slate-200">{sel.customerName ?? "—"}</span></div>
                {sel.assigneeName && (
                  <div className="flex justify-between"><span className="text-slate-500">Assigned to</span><span className="text-slate-800 dark:text-slate-200">{sel.assigneeName}</span></div>
                )}
                <div className="flex justify-between"><span className="text-slate-500">Category</span><span className="text-slate-800 dark:text-slate-200">{sel.category}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Priority</span><Pill color={sel.priority === "high" ? "rose" : "amber"}>{sel.priority}</Pill></div>
                <div className="flex justify-between items-center"><span className="text-slate-500">SLA</span><StatusBadge label={(sel.slaStatus ?? "—").replace("_", " ")} variant={SLA_VARIANT[sel.slaStatus] ?? "neutral"} /></div>
              </div>
              {/* One ticket, two screens. The conversation, the internal notes and
                  the customer's replies live in the helpdesk; this is the CRM's
                  view of the same record, so it points there rather than growing
                  a second, divergent thread. */}
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Link to={linkTo("ticket", sel.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <MessageSquare size={10} /> Full conversation{sel.messageCount ? ` (${sel.messageCount})` : ""}
                  <ExternalLink size={9} className="opacity-60" />
                </Link>
                {sel.contactId && (
                  <Link to={linkTo("contact", sel.contactId)}
                    className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-600 hover:text-sky-500 dark:bg-sky-500/10 dark:text-sky-400">
                    <User size={10} /> {sel.customerName || "Contact"}
                    <ExternalLink size={9} className="opacity-60" />
                  </Link>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => approve(sel.id)} disabled={["resolved", "closed"].includes(sel.status)} className="flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition"><CheckCircle2 size={15} /> Resolve Case</button>
                {sel.slaStatus === "breached" ? (
                  <button onClick={() => unlock(sel.id)} className="flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"><Unlock size={15} /> Reset SLA</button>
                ) : (
                  <button onClick={() => lock(sel.id)} className="flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"><Lock size={15} /> Flag SLA Breach</button>
                )}
              </div>
            </div>
          )}
        </Section>
      </div>
    </SolutionShell>
  );
}
