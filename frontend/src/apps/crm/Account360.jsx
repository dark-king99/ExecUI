import { useState } from "react";
import { useApi, useMutation } from "../../hooks/useApi";
import { useToast } from "../../components/ui/Toast";
import { crm } from "../../services/api";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  Search, Building2, Users, DollarSign, TrendingUp,
  Plus, X, ChevronRight, AlertCircle, FileText, Send
} from "lucide-react";

const dealStageVariant = {
  won: "success", negotiation: "warning", proposal: "info",
  qualified: "neutral", lead: "neutral", lost: "danger",
};

function AddNoteModal({ accountId, onClose, onCreated }) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => crm.accounts.addNote(accountId, d));

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    if (!note.trim()) { setErr("Note cannot be empty."); return; }
    try {
      await mutate({ content: note });
      toast({ message: "Note added.", type: "success" });
      onCreated();
      onClose();
    } catch (ex) { setErr(ex?.message ?? "Failed to add note."); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Add Note</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          {err && <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-3 py-2">{err}</p>}
          <textarea
            value={note} onChange={e => setNote(e.target.value)}
            rows={4} placeholder="Enter your note…"
            className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white transition flex items-center gap-1.5">
              <Send size={13} /> {loading ? "Saving…" : "Save Note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AccountDetail({ account, onClose }) {
  const [showAddNote, setShowAddNote] = useState(false);
  const { data: deals,    loading: dealsLoading }    = useApi(() => crm.accounts.deals(account.id),    [account.id], {});
  const { data: timeline, loading: tlLoading, refetch: refetchTimeline } = useApi(() => crm.accounts.timeline(account.id), [account.id], {});

  const allDeals    = deals    ?? [];
  const allTimeline = timeline ?? [];
  const openDeals   = allDeals.filter(d => !["won","lost"].includes(d.stage));
  const pipelineVal = openDeals.reduce((s, d) => s + (parseFloat(String(d.value ?? d.amount ?? "0").replace(/[^0-9.]/g,"")) || 0), 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white truncate">{account.name}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {account.industry ?? "—"} · {account.tier ?? account.segment ?? ""}
          </p>
        </div>
        <button onClick={onClose} className="ml-3 shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"><X size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "ARR", value: account.arr ?? account.revenue ?? "—" },
            { label: "Open Pipeline", value: pipelineVal ? `$${(pipelineVal/1000).toFixed(0)}k` : "—" },
            { label: "Contacts", value: account.contacts ?? account.contactCount ?? "—" },
            { label: "Health Score", value: account.healthScore ?? account.health ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">{label}</p>
              <div className="text-sm font-medium text-slate-900 dark:text-white">{value}</div>
            </div>
          ))}
        </div>

        {/* Open Deals */}
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Open Deals ({openDeals.length})</p>
          {dealsLoading ? (
            <div className="space-y-1.5 animate-pulse">{[1,2].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded" />)}</div>
          ) : openDeals.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">No open deals.</p>
          ) : (
            <div className="space-y-2">
              {openDeals.map(d => (
                <div key={d.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-sm">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white text-xs">{d.name ?? d.title}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{d.owner ?? d.rep}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{d.value ?? d.amount}</p>
                    <StatusBadge label={d.stage} variant={dealStageVariant[d.stage] ?? "neutral"} dot />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timeline / Notes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Timeline & Notes</p>
            <button onClick={() => setShowAddNote(true)} className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline">
              <Plus size={11} /> Add Note
            </button>
          </div>
          {tlLoading ? (
            <div className="space-y-2 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded" />)}</div>
          ) : allTimeline.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">No timeline events yet.</p>
          ) : (
            <div className="space-y-2">
              {allTimeline.slice(0, 10).map((e, i) => (
                <div key={i} className="flex gap-3">
                  <div className="shrink-0 mt-1.5 h-2 w-2 rounded-full bg-orange-400" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-800 dark:text-slate-200">{e.description ?? e.event ?? e.content}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{e.time ?? e.date ?? e.createdAt}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contact list */}
        {(account.contactList ?? []).length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Key Contacts</p>
            <div className="space-y-2">
              {account.contactList.slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="h-7 w-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">
                      {(c.name ?? "?").charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{c.role ?? c.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAddNote && (
        <AddNoteModal accountId={account.id} onClose={() => setShowAddNote(false)} onCreated={refetchTimeline} />
      )}
    </div>
  );
}

export default function Account360() {
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [selectedAccount, setSelectedAccount] = useState(null);

  const { data: accounts, loading, error } = useApi(
    () => crm.accounts.list(), [], { pollingInterval: 60000 }
  );

  const allAccounts = accounts ?? [];

  const totalARR    = allAccounts.reduce((s, a) => s + (parseFloat(String(a.arr ?? a.revenue ?? "0").replace(/[^0-9.]/g,"")) || 0), 0);
  const healthyCount = allAccounts.filter(a => (a.healthScore ?? a.health ?? 0) >= 70).length;

  const segments = ["all", ...Array.from(new Set(allAccounts.map(a => a.tier ?? a.segment).filter(Boolean)))];

  const filtered = allAccounts.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !search || [a.name, a.industry, a.owner]
      .some(v => v?.toLowerCase().includes(q));
    const matchSeg = segmentFilter === "all" || (a.tier ?? a.segment) === segmentFilter;
    return matchSearch && matchSeg;
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 pt-6 shrink-0">
        <PageHeader
          title="Account 360"
          subtitle="A complete view of every account — deals, contacts, health, and timeline."
        />
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Stat label="Total Accounts" value={loading ? "…" : allAccounts.length} icon={Building2}  color="indigo" />
          <Stat label="Total ARR"      value={loading ? "…" : `$${(totalARR/1000).toFixed(0)}k`}   icon={DollarSign} color="emerald" />
          <Stat label="Healthy Accounts" value={loading ? "…" : healthyCount}                       icon={TrendingUp} color="amber" />
        </div>
      </div>

      {error && (
        <div className="mx-6 mb-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden gap-4 px-6 pb-6">
        <div className={`flex flex-col ${selectedAccount ? "w-80 shrink-0" : "flex-1"} transition-all duration-200`}>
          <Card className="flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 shrink-0 space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text" placeholder="Search accounts…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full text-sm pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {segments.map(s => (
                  <button
                    key={s}
                    onClick={() => setSegmentFilter(s)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                      segmentFilter === s
                        ? "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading && allAccounts.length === 0 ? (
                <div className="space-y-2 p-4 animate-pulse">
                  {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded-lg" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 dark:text-slate-500 text-sm">
                  <Building2 size={28} className="mb-2 opacity-30" />
                  {allAccounts.length === 0 ? "No accounts found." : "No accounts match your search."}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map(acc => {
                    const health = acc.healthScore ?? acc.health;
                    const healthColor = health >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                                        health >= 50 ? "text-amber-600 dark:text-amber-400" :
                                        "text-red-600 dark:text-red-400";
                    return (
                      <button
                        key={acc.id}
                        onClick={() => setSelectedAccount(selectedAccount?.id === acc.id ? null : acc)}
                        className={`w-full text-left px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group ${
                          selectedAccount?.id === acc.id ? "bg-orange-50 dark:bg-orange-500/5 border-l-2 border-orange-500" : "border-l-2 border-transparent"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{acc.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {acc.industry ?? "—"} · {acc.tier ?? acc.segment ?? ""}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{acc.arr ?? acc.revenue ?? "—"}</p>
                            {health != null && (
                              <p className={`text-xs font-medium ${healthColor}`}>Health: {health}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Users size={9} /> {acc.owner ?? "—"}
                          </span>
                          <ChevronRight size={13} className="text-slate-300 dark:text-slate-600 group-hover:text-orange-500 transition" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {selectedAccount && (
          <div className="flex-1 overflow-hidden">
            <Card className="h-full overflow-hidden flex flex-col">
              <AccountDetail account={selectedAccount} onClose={() => setSelectedAccount(null)} />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
