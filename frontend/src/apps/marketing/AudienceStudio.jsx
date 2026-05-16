import { useState, useMemo } from "react";
import { Crosshair, Plus, Search, RefreshCw, AlertCircle, Users, Zap, X, TrendingUp } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { marketing } from "../../services/api";

const TYPE_VARIANT = { behavioral: "indigo", demographic: "info", firmographic: "warning", lookalike: "success", intent: "violet" };
const EMPTY_AUD = { name: "", description: "", type: "behavioral" };

function NewAudienceModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_AUD);
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => marketing.audiences.create(d), {
    onSuccess: () => { toast({ message: "Audience created", type: "success" }); onCreated(); onClose(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">New Audience</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); setErr(null); if (!form.name.trim()) { setErr("Name required"); return; } mutate(form); }} className="px-6 py-5 space-y-4">
          {err && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Audience Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Enterprise Decision Makers" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
            <select value={form.type} onChange={e => set("type", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              {["behavioral", "demographic", "firmographic", "lookalike", "intent"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea rows={2} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe the audience criteria…" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white transition">{loading ? "Creating…" : "Create Audience"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AudienceStudio() {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const { data: audiences, loading, error, refetch } = useApi(() => marketing.audiences.list({ limit: 200 }), [], { pollingInterval: 60000 });
  const { mutate: activate } = useMutation((id) => marketing.audiences.activate(id, {}), {
    onSuccess: () => { toast({ message: "Audience activated", type: "success" }); refetch(); },
    onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }),
  });
  const { mutate: createLookalike } = useMutation((id) => marketing.audiences.createLookalike(id), {
    onSuccess: () => { toast({ message: "Lookalike created", type: "success" }); refetch(); },
    onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }),
  });
  const all = audiences ?? [];
  const TYPES = ["all", "behavioral", "demographic", "firmographic", "lookalike", "intent"];
  const filtered = useMemo(() => all.filter(a => {
    const matchType = typeFilter === "all" || a.type === typeFilter;
    const matchSearch = !search || a.name?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  }), [all, search, typeFilter]);
  const totalSize = all.reduce((s, a) => s + (a.size ?? a.count ?? 0), 0);
  return (
    <div className="space-y-6">
      {showModal && <NewAudienceModal onClose={() => setShowModal(false)} onCreated={refetch} />}
      <PageHeader title="Audience Studio" subtitle="Build, activate, and grow precise audience segments"
        actions={<button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg transition"><Plus size={15} /> New Audience</button>}
      />
      {loading && all.length === 0 ? (
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Total Audiences" value={all.length} icon={Crosshair} color="violet" />
          <Stat label="Total Reach" value={totalSize.toLocaleString()} icon={Users} color="sky" />
          <Stat label="Activated" value={all.filter(a => a.activated || a.status === "active").length} icon={Zap} color="emerald" />
        </div>
      )}
      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 flex-1 max-w-64">
          <Search size={14} className="text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search audiences…" className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {TYPES.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`text-xs px-2.5 py-1 rounded-full border capitalize transition ${typeFilter === t ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-400"}`}>{t === "all" ? "All" : t}</button>
          ))}
        </div>
        <button onClick={refetch} className="ml-auto flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /></button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && all.length === 0 ? [...Array(6)].map((_, i) => <SkeletonCard key={i} />) : filtered.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-slate-500">No audiences found.</div>
        ) : filtered.map((a, i) => (
          <div key={a.id ?? i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-violet-300 dark:hover:border-violet-700 transition">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{a.name}</h3>
                {a.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{a.description}</p>}
              </div>
              <StatusBadge label={a.type ?? "custom"} variant={TYPE_VARIANT[a.type] ?? "neutral"} />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{(a.size ?? a.count ?? 0).toLocaleString()}</div>
            <div className="text-xs text-slate-400 mb-4">profiles</div>
            <div className="flex gap-2">
              <button onClick={() => activate(a.id)} className="flex-1 text-xs py-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/50 rounded-lg transition"><Zap size={11} className="inline mr-1" />Activate</button>
              <button onClick={() => createLookalike(a.id)} className="flex-1 text-xs py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"><TrendingUp size={11} className="inline mr-1" />Lookalike</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
