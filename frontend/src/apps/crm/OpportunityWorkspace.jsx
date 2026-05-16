import { useState, useMemo } from "react";
import { Target, DollarSign, TrendingUp, Users, Plus, X, Search, AlertCircle, RefreshCw } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { crm } from "../../services/api";

const OPP_STAGES = ["Prospecting", "Qualified", "Proposal", "Negotiation", "Closed Won"];
const STAGE_VARIANT = { Prospecting: "neutral", Qualified: "info", Proposal: "warning", Negotiation: "indigo", "Closed Won": "success" };
const RISK_VARIANT = { low: "success", medium: "warning", high: "danger" };
const STAGE_COLORS = ["bg-slate-400", "bg-sky-500", "bg-indigo-500", "bg-violet-500", "bg-emerald-500"];
const EMPTY = { name: "", account: "", value: "", stage: "Prospecting", closeDate: "", owner: "", risk: "medium" };

function NewOppModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => crm.opportunities.create(d), {
    onSuccess: () => { toast({ message: "Opportunity created", type: "success" }); onCreated(); onClose(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  function submit(e) { e.preventDefault(); setErr(null); if (!form.name.trim()) { setErr("Name required"); return; } mutate(form); }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">New Opportunity</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {err && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Opportunity name" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Account</label>
              <input value={form.account} onChange={e => set("account", e.target.value)} placeholder="Company name" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Value ($)</label>
              <input type="number" min="0" value={form.value} onChange={e => set("value", e.target.value)} placeholder="0" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Stage</label>
              <select value={form.stage} onChange={e => set("stage", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                {OPP_STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Risk</label>
              <select value={form.risk} onChange={e => set("risk", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                {["low","medium","high"].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Close Date</label>
              <input type="date" value={form.closeDate} onChange={e => set("closeDate", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Owner</label>
              <input value={form.owner} onChange={e => set("owner", e.target.value)} placeholder="Assignee" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white transition">{loading ? "Saving…" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OpportunityWorkspace() {
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState("list");
  const [search, setSearch] = useState("");

  const { data: summary, loading: sumLoading } = useApi(() => crm.opportunities.summary(), [], { pollingInterval: 120000 });
  const { data: opps, loading: oppsLoading, error, refetch } = useApi(() => crm.opportunities.list({ limit: 200 }), [], { pollingInterval: 60000 });
  const allOpps = opps ?? [];

  const filtered = useMemo(() => allOpps.filter(o =>
    !search || o.name?.toLowerCase().includes(search.toLowerCase()) || o.account?.toLowerCase().includes(search.toLowerCase())
  ), [allOpps, search]);

  const funnelData = useMemo(() => OPP_STAGES.map((stage, i) => {
    const stageOpps = allOpps.filter(o => o.stage === stage);
    const total = stageOpps.reduce((s, o) => s + (o.rawValue ?? 0), 0);
    return { stage, count: stageOpps.length, total, color: STAGE_COLORS[i] };
  }), [allOpps]);

  const maxCount = Math.max(1, ...funnelData.map(f => f.count));

  return (
    <div className="space-y-6">
      {showModal && <NewOppModal onClose={() => setShowModal(false)} onCreated={refetch} />}
      <PageHeader title="Opportunities" subtitle="Track, score, and advance your sales opportunities"
        actions={<button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 py-2 rounded-lg transition"><Plus size={15} /> New Opportunity</button>}
      />

      {sumLoading && allOpps.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Open Opps" value={summary?.openCount ?? allOpps.length} icon={Target} color="orange" />
          <Stat label="Pipeline Value" value={summary?.pipelineValue ?? "—"} icon={DollarSign} color="emerald" />
          <Stat label="Avg Deal Size" value={summary?.avgDealSize ?? "—"} icon={TrendingUp} color="sky" delta={summary?.avgDealSizeDelta} />
          <Stat label="Win Rate (90d)" value={summary?.winRate ?? "—"} icon={Users} color="amber" />
        </div>
      )}

      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}

      {/* View Toggle */}
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          {["list", "funnel"].map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 text-sm font-medium capitalize transition ${view === v ? "bg-orange-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{v}</button>
          ))}
        </div>
        {view === "list" && (
          <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 flex-1 max-w-64">
            <Search size={14} className="text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search opportunities…" className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white" />
          </div>
        )}
        <button onClick={refetch} className="flex items-center gap-1.5 text-xs text-slate-500 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition ml-auto"><RefreshCw size={13} /> Refresh</button>
      </div>

      {view === "list" ? (
        <Card>
          {oppsLoading && allOpps.length === 0 ? <div className="p-5"><SkeletonTable rows={6} /></div> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No opportunities found.</p> : filtered.map(o => (
                <div key={o.id ?? o.name} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-slate-900 dark:text-white">{o.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{o.account}{o.owner ? ` • ${o.owner}` : ""}{o.close ? ` • Close: ${o.close}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {o.risk && <StatusBadge label={`${o.risk} risk`} variant={RISK_VARIANT[o.risk] ?? "neutral"} />}
                    <StatusBadge label={o.stage} variant={STAGE_VARIANT[o.stage] ?? "neutral"} />
                    <span className="font-bold text-sm text-slate-900 dark:text-white min-w-16 text-right">{o.value}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader title="Pipeline Funnel" icon={Target} />
          <CardBody className="space-y-4">
            {oppsLoading && allOpps.length === 0 ? <SkeletonTable rows={5} /> : funnelData.map(({ stage, count, total, color }) => (
              <div key={stage} className="flex items-center gap-4">
                <div className="w-28 text-sm text-slate-700 dark:text-slate-300 shrink-0">{stage}</div>
                <div className="flex-1 h-8 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full flex items-center px-3 transition-all`} style={{ width: `${Math.max(8, (count / maxCount) * 100)}%` }}>
                    {count > 0 && <span className="text-xs font-semibold text-white">{count} deals</span>}
                  </div>
                </div>
                <div className="w-24 text-sm font-semibold text-slate-700 dark:text-slate-300 text-right shrink-0">
                  {total ? `$${(total / 1000).toFixed(0)}k` : count === 0 ? "—" : ""}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
