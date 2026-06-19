import { useState } from "react";
import { Users, Search, DollarSign, Briefcase, Clock, Send } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, Section, Loading, fmtDate } from "../../components/crm-ui";

export default function Account360() {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const { data: accounts, loading } = useApi(() => crm.accounts.list(), [], { pollingInterval: 120000 });
  const { data: detail, loading: dLoading } = useApi(() => (selected ? crm.accounts.get(selected) : Promise.resolve(null)), [selected]);
  const { data: timeline } = useApi(() => (selected ? crm.accounts.timeline(selected) : Promise.resolve(null)), [selected]);
  const { mutate: addNote, loading: saving } = useMutation((d) => crm.accounts.addNote(selected, d), {
    onSuccess: () => { toast({ message: "Note added", type: "success" }); setNote(""); },
  });

  const list = (accounts ?? []).filter((a) => !query || a.name?.toLowerCase().includes(query.toLowerCase()));

  return (
    <SolutionShell solutionId="accounts" title="Account 360" subtitle="A complete view of an account: deals, timeline, and notes">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Accounts" icon={Search} className="lg:col-span-1" pad={false}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 bg-white dark:bg-slate-900">
              <Search size={14} className="text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search accounts…" className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white" />
            </div>
          </div>
          {loading && list.length === 0 ? <div className="p-4"><Loading rows={3} /></div> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[28rem] overflow-y-auto">
              {list.length === 0 ? <div className="py-10 text-center text-sm text-slate-400">No accounts found.</div> : list.map((a) => (
                <button key={a.id} onClick={() => setSelected(a.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${selected === a.id ? "bg-sky-50/50 dark:bg-sky-500/5" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{a.name}</span>
                    <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 shrink-0">{a.revenueFmt}</span>
                  </div>
                  <div className="text-xs text-slate-400 truncate">{a.openDeals} open · {a.totalDeals} total deals</div>
                </button>
              ))}
            </div>
          )}
        </Section>

        <div className="lg:col-span-2 space-y-4">
          <Section title={detail?.name ?? "Account Detail"} subtitle={selected ? detail?.email : "Select an account to view its 360° profile"} icon={Users}>
            {!selected ? (
              <div className="py-10 text-center text-sm text-slate-400">Choose an account on the left.</div>
            ) : dLoading || !detail ? <Loading rows={2} /> : (
              <>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[["Revenue", detail.revenueFmt, DollarSign], ["Deals", detail.deals?.length ?? 0, Briefcase], ["Open", detail.deals?.filter((d) => !["Closed Won", "Closed Lost"].includes(d.stage)).length ?? 0, Clock]].map(([label, val, Icon]) => (
                    <div key={label} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                      <Icon size={15} className="text-slate-400 mb-1.5" />
                      <div className="text-lg font-bold text-slate-900 dark:text-white">{val}</div>
                      <div className="text-[11px] text-slate-500">{label}</div>
                    </div>
                  ))}
                </div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Deals</h4>
                <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(detail.deals ?? []).length === 0 ? (
                        <tr><td className="px-4 py-4 text-center text-sm text-slate-400">No deals for this account.</td></tr>
                      ) : detail.deals.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">{d.name}</td>
                          <td className="px-4 py-2.5"><StatusBadge label={d.stage} variant={d.stage === "Closed Won" ? "success" : d.stage === "Closed Lost" ? "danger" : "info"} /></td>
                          <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{d.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Section>

          {selected && (
            <Section title="Timeline & Notes" icon={Clock}>
              <div className="space-y-3 mb-4">
                {(timeline ?? []).map((t, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="h-2 w-2 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-slate-700 dark:text-slate-200">{t.description}</p>
                      <p className="text-[11px] text-slate-400">{fmtDate(t.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" className="flex-1 text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500" />
                <button onClick={() => note.trim() && addNote({ note })} disabled={saving || !note.trim()} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white transition"><Send size={14} /> Add</button>
              </div>
            </Section>
          )}
        </div>
      </div>
    </SolutionShell>
  );
}
