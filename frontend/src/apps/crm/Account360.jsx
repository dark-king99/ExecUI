import { useState, useMemo } from "react";
import { Building2, DollarSign, Heart, AlertTriangle, Search, RefreshCw, AlertCircle, StickyNote, X } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { crm } from "../../services/api";

const HEALTH_VARIANT = { healthy: "success", "at-risk": "warning", churned: "danger", new: "info" };
const HEALTH_DOT = { healthy: "bg-emerald-500", "at-risk": "bg-amber-500", churned: "bg-red-500", new: "bg-sky-500" };

function NoteModal({ accountId, onClose, onCreated }) {
  const toast = useToast();
  const [content, setContent] = useState("");
  const { mutate, loading } = useMutation((d) => crm.accounts.addNote(accountId, d), {
    onSuccess: () => { toast({ message: "Note added", type: "success" }); onCreated(); onClose(); },
    onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">Add Note</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <textarea rows={4} value={content} onChange={e => setContent(e.target.value)} placeholder="Write a note about this account…"
            className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button disabled={!content.trim() || loading} onClick={() => mutate({ content })} className="text-sm px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white transition">{loading ? "Saving…" : "Add Note"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountDetail({ account, onAddNote }) {
  const { data: deals, loading: dLoading } = useApi(() => crm.accounts.deals(account.id), [account.id]);
  const { data: timeline, loading: tLoading } = useApi(() => crm.accounts.timeline(account.id), [account.id]);
  const allDeals = deals ?? [];
  const events = timeline ?? [];
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{account.name}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{account.industry ?? ""}{account.region ? ` • ${account.region}` : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge label={account.health ?? "healthy"} variant={HEALTH_VARIANT[account.health] ?? "neutral"} />
          <button onClick={onAddNote} className="flex items-center gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg transition"><StickyNote size={13} /> Note</button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[["ARR", account.arr ?? "—"], ["Open Deals", allDeals.filter(d => d.stage !== "Closed Won" && d.stage !== "Closed Lost").length], ["Customer Since", account.since ?? "—"]].map(([l, v]) => (
          <div key={l} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">{l}</div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">{v}</div>
          </div>
        ))}
      </div>
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Active Deals</h3>
        {dLoading ? <div className="text-xs text-slate-400 py-2">Loading…</div> : allDeals.length === 0 ? (
          <p className="text-xs text-slate-400">No deals on record.</p>
        ) : (
          <div className="space-y-2">
            {allDeals.slice(0, 6).map((d, i) => (
              <div key={d.id ?? i} className="flex items-center gap-2 text-sm bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                <span className="flex-1 font-medium text-slate-900 dark:text-white truncate">{d.name}</span>
                <span className="text-xs text-slate-500 shrink-0">{d.stage}</span>
                <span className="text-xs font-semibold text-slate-900 dark:text-white ml-2 shrink-0">{d.value ?? ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Activity Timeline</h3>
        {tLoading ? <div className="text-xs text-slate-400 py-2">Loading…</div> : events.length === 0 ? (
          <p className="text-xs text-slate-400">No activity yet.</p>
        ) : (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {events.map((e, i) => (
              <div key={e.id ?? i} className="flex gap-3 text-xs">
                <div className="mt-1 h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                <div>
                  <span className="text-slate-900 dark:text-white">{e.text ?? e.description ?? e.action}</span>
                  <span className="text-slate-400 ml-2">{e.date ?? e.at ?? ""}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Account360() {
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("all");
  const [selected, setSelected] = useState(null);
  const [showNote, setShowNote] = useState(false);
  const { data: accounts, loading, error, refetch } = useApi(() => crm.accounts.list({ limit: 200 }), [], { pollingInterval: 60000 });
  const all = accounts ?? [];
  const SEGMENTS = ["all", "Enterprise", "Mid-Market", "SMB", "Startup"];
  const filtered = useMemo(() => all.filter(a => {
    const matchSeg = segment === "all" || a.segment === segment;
    const matchSearch = !search || a.name?.toLowerCase().includes(search.toLowerCase());
    return matchSeg && matchSearch;
  }), [all, search, segment]);
  const stats = useMemo(() => ({
    total: all.length,
    healthy: all.filter(a => a.health === "healthy").length,
    atRisk: all.filter(a => a.health === "at-risk").length,
    arr: all.reduce((s, a) => s + (a.rawArr ?? 0), 0),
  }), [all]);
  return (
    <div className="space-y-6">
      {showNote && selected && <NoteModal accountId={selected.id} onClose={() => setShowNote(false)} onCreated={refetch} />}
      <PageHeader title="Account 360°" subtitle="Full-spectrum view of every customer account"
        actions={<button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh</button>}
      />
      {loading && all.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total Accounts" value={stats.total} icon={Building2} color="orange" />
          <Stat label="Total ARR" value={stats.arr ? `$${(stats.arr / 1000000).toFixed(1)}M` : "—"} icon={DollarSign} color="emerald" />
          <Stat label="Healthy" value={stats.healthy} icon={Heart} color="sky" />
          <Stat label="At Risk" value={stats.atRisk} icon={AlertTriangle} color="amber" />
        </div>
      )}
      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}
      <div className="flex gap-4 items-start">
        <div className="w-80 shrink-0 space-y-3">
          <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900">
            <Search size={14} className="text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts…" className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SEGMENTS.map(s => (
              <button key={s} onClick={() => setSegment(s)} className={`text-xs px-2.5 py-1 rounded-full border transition ${segment === s ? "bg-orange-600 text-white border-orange-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-orange-400"}`}>{s === "all" ? "All" : s}</button>
            ))}
          </div>
          <Card>
            {loading && all.length === 0 ? <div className="p-4"><SkeletonTable rows={8} /></div> : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[calc(100vh-22rem)] overflow-y-auto">
                {filtered.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">No accounts found.</p> : filtered.map(a => (
                  <button key={a.id ?? a.name} onClick={() => setSelected(a)} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${selected?.id === a.id ? "bg-orange-50 dark:bg-orange-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}>
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${HEALTH_DOT[a.health] ?? "bg-slate-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{a.name}</div>
                      <div className="text-xs text-slate-400 truncate">{a.segment ?? ""}{a.arr ? ` • ${a.arr}` : ""}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
        <div className="flex-1 min-w-0">
          {selected ? (
            <Card><CardBody><AccountDetail account={selected} onAddNote={() => setShowNote(true)} /></CardBody></Card>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <Building2 size={36} className="text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-slate-500">Select an account to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
