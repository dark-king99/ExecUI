import { useState, useMemo } from "react";
import { Megaphone, Plus, Search, RefreshCw, AlertCircle, Play, Pause, X, DollarSign, Users, BarChart3, TrendingUp } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { marketing } from "../../services/api";

const STATUS_VARIANT = { active: "success", paused: "warning", draft: "neutral", completed: "info", scheduled: "indigo" };
const EMPTY = { name: "", objective: "", owner: "", start: "", end: "", budget: "", channel: "email" };

function NewCampaignModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => marketing.campaigns.create(d), {
    onSuccess: () => { toast({ message: "Campaign created", type: "success" }); onCreated(); onClose(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">New Campaign</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); setErr(null); if (!form.name.trim()) { setErr("Name required"); return; } mutate(form); }} className="px-6 py-5 space-y-4">
          {err && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Campaign Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Q4 Product Launch" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Objective</label>
              <select value={form.objective} onChange={e => set("objective", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="">Select…</option>
                {["Lead Generation", "Brand Awareness", "Demand Gen", "Retention", "Pipeline", "Revenue"].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Primary Channel</label>
              <select value={form.channel} onChange={e => set("channel", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                {["email", "social", "paid", "organic", "events", "content", "multi-channel"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
              <input type="date" value={form.start} onChange={e => set("start", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">End Date</label>
              <input type="date" value={form.end} onChange={e => set("end", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Budget ($)</label>
              <input type="number" min="0" value={form.budget} onChange={e => set("budget", e.target.value)} placeholder="0" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Owner</label>
              <input value={form.owner} onChange={e => set("owner", e.target.value)} placeholder="Campaign manager" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white transition">{loading ? "Creating…" : "Launch Campaign"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Campaign() {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const { data: campaigns, loading, error, refetch } = useApi(() => marketing.campaigns.list({ limit: 200 }), [], { pollingInterval: 60000 });
  const { data: summary, loading: sumLoading } = useApi(() => marketing.campaigns.summary(), [], { pollingInterval: 120000 });
  const { mutate: toggleStart } = useMutation((id) => marketing.campaigns.start(id), { onSuccess: () => { toast({ message: "Campaign started", type: "success" }); refetch(); }, onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }) });
  const { mutate: togglePause } = useMutation((id) => marketing.campaigns.pause(id), { onSuccess: () => { toast({ message: "Campaign paused", type: "success" }); refetch(); }, onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }) });
  const all = campaigns ?? [];
  const STATUS_FILTERS = ["all", "active", "paused", "draft", "scheduled", "completed"];
  const filtered = useMemo(() => all.filter(c => {
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  }), [all, search, statusFilter]);
  const stats = useMemo(() => ({
    total: all.length,
    active: all.filter(c => c.status === "active").length,
    totalLeads: all.reduce((s, c) => s + (c.leads ?? 0), 0),
    totalBudget: all.reduce((s, c) => s + (c.rawBudget ?? 0), 0),
  }), [all]);
  return (
    <div className="space-y-6">
      {showModal && <NewCampaignModal onClose={() => setShowModal(false)} onCreated={refetch} />}
      <PageHeader title="Campaigns" subtitle="Create, manage, and analyze all your marketing campaigns"
        actions={<button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg transition"><Plus size={15} /> New Campaign</button>}
      />
      {sumLoading && all.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total Campaigns" value={summary?.total ?? stats.total} icon={Megaphone} color="violet" />
          <Stat label="Active" value={summary?.active ?? stats.active} icon={TrendingUp} color="emerald" />
          <Stat label="Total Leads" value={summary?.totalLeads ?? stats.totalLeads} icon={Users} color="sky" />
          <Stat label="Total Budget" value={summary?.totalBudget ?? (stats.totalBudget ? `$${(stats.totalBudget / 1000).toFixed(0)}k` : "—")} icon={DollarSign} color="amber" />
        </div>
      )}
      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 flex-1 max-w-72">
          <Search size={14} className="text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campaigns…" className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`text-xs px-2.5 py-1 rounded-full border capitalize transition ${statusFilter === s ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-400"}`}>{s}</button>
          ))}
        </div>
        <button onClick={refetch} className="ml-auto flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /></button>
      </div>
      <Card>
        {loading && all.length === 0 ? <div className="p-5"><SkeletonTable rows={8} /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Campaign", "Objective / Channel", "Dates", "Leads", "Budget", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-500">No campaigns found.</td></tr>
                ) : filtered.map((c, i) => (
                  <tr key={c.id ?? i} onClick={() => setSelected(c === selected ? null : c)} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer">
                    <td className="p-4">
                      <div className="font-medium text-slate-900 dark:text-white">{c.name}</div>
                      {c.owner && <div className="text-xs text-slate-400 mt-0.5">{c.owner}</div>}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300 capitalize">
                      {c.objective ?? "—"}
                      {c.channel && <div className="text-xs text-slate-400 mt-0.5">{c.channel}</div>}
                    </td>
                    <td className="p-4 text-slate-500 text-xs">
                      {c.start && <div>{c.start}</div>}
                      {c.end && <div>→ {c.end}</div>}
                      {!c.start && "—"}
                    </td>
                    <td className="p-4 font-medium text-slate-900 dark:text-white">{c.leads ?? "—"}</td>
                    <td className="p-4 text-slate-900 dark:text-white">{c.budget ?? "—"}</td>
                    <td className="p-4"><StatusBadge label={c.status ?? "draft"} variant={STATUS_VARIANT[c.status] ?? "neutral"} /></td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        {c.status === "active" ? (
                          <button onClick={e => { e.stopPropagation(); togglePause(c.id); }} className="text-xs flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg transition"><Pause size={12} /> Pause</button>
                        ) : c.status !== "completed" ? (
                          <button onClick={e => { e.stopPropagation(); toggleStart(c.id); }} className="text-xs flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition"><Play size={12} /> Start</button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {selected && (
        <Card>
          <CardHeader title={selected.name} subtitle={selected.objective ?? ""} icon={Megaphone} />
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {[["Leads", selected.leads], ["Clicks", selected.clicks], ["Opens", selected.opens], ["Conversions", selected.conversions]].filter(([, v]) => v != null).map(([l, v]) => (
                <div key={l} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-500 mb-1">{l}</div>
                  <div className="font-bold text-slate-900 dark:text-white">{v}</div>
                </div>
              ))}
            </div>
            {[["CTR", selected.ctr != null ? `${selected.ctr}%` : null], ["Open Rate", selected.openRate != null ? `${selected.openRate}%` : null], ["Revenue", selected.revenue], ["ROI", selected.roi != null ? `${selected.roi}%` : null]].filter(([, v]) => v != null).length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[["CTR", selected.ctr != null ? `${selected.ctr}%` : null], ["Open Rate", selected.openRate != null ? `${selected.openRate}%` : null], ["Revenue", selected.revenue], ["ROI", selected.roi != null ? `${selected.roi}%` : null]].filter(([, v]) => v != null).map(([l, v]) => (
                  <div key={l} className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-3 text-center">
                    <div className="text-xs text-violet-500 mb-1">{l}</div>
                    <div className="font-bold text-violet-900 dark:text-violet-300">{v}</div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
