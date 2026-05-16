import { useState } from "react";
import { Activity, Plus, RefreshCw, AlertCircle, X, TrendingUp, Eye, MousePointer } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { marketing } from "../../services/api";

const TYPE_VARIANT = { content: "indigo", offer: "success", recommendation: "info", message: "warning", experience: "violet" };
const EMPTY = { name: "", type: "content", audience: "", description: "" };

function NewRuleModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => marketing.personalization.create(d), {
    onSuccess: () => { toast({ message: "Rule created", type: "success" }); onCreated(); onClose(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">New Personalization Rule</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); setErr(null); if (!form.name.trim()) { setErr("Name required"); return; } mutate(form); }} className="px-6 py-5 space-y-4">
          {err && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Enterprise Homepage Hero" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
              <select value={form.type} onChange={e => set("type", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                {["content", "offer", "recommendation", "message", "experience"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Target Audience</label>
              <input value={form.audience} onChange={e => set("audience", e.target.value)} placeholder="Segment name" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea rows={2} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe what this personalizes…" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white transition">{loading ? "Creating…" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Personalization() {
  const [showModal, setShowModal] = useState(false);
  const { data: rules, loading, error, refetch } = useApi(() => marketing.personalization.list(), [], { pollingInterval: 60000 });
  const { data: metrics, loading: metLoading } = useApi(() => marketing.personalization.metrics(), [], { pollingInterval: 120000 });
  const all = rules ?? [];
  const m = metrics ?? {};
  return (
    <div className="space-y-6">
      {showModal && <NewRuleModal onClose={() => setShowModal(false)} onCreated={refetch} />}
      <PageHeader title="Personalization" subtitle="Deliver tailored experiences to every audience segment"
        actions={<button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg transition"><Plus size={15} /> New Rule</button>}
      />
      {metLoading && all.length === 0 ? (
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Active Rules" value={m.activeRules ?? all.filter(r => r.active !== false).length} icon={Activity} color="violet" />
          <Stat label="Avg Lift" value={m.avgLift != null ? `+${m.avgLift}%` : "—"} icon={TrendingUp} color="emerald" />
          <Stat label="Impressions" value={m.impressions != null ? m.impressions.toLocaleString() : "—"} icon={Eye} color="sky" />
        </div>
      )}
      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}
      <div className="flex justify-end">
        <button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading && all.length === 0 ? [...Array(4)].map((_, i) => <SkeletonCard key={i} />) : all.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-slate-500">No personalization rules configured.</div>
        ) : all.map((r, i) => (
          <div key={r.id ?? i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-violet-300 dark:hover:border-violet-700 transition">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{r.name}</h3>
                {r.audience && <div className="text-xs text-slate-400 mt-0.5">→ {r.audience}</div>}
                {r.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.description}</p>}
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <StatusBadge label={r.type ?? "content"} variant={TYPE_VARIANT[r.type] ?? "neutral"} />
                {r.active === false && <StatusBadge label="inactive" variant="neutral" />}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[["Views", r.views ?? r.impressions], ["CTR", r.ctr != null ? `${r.ctr}%` : null], ["Lift", r.lift != null ? `+${r.lift}%` : null]].map(([l, v]) => v != null ? (
                <div key={l} className="bg-slate-50 dark:bg-slate-800 rounded-lg py-2">
                  <div className="text-xs text-slate-400">{l}</div>
                  <div className="font-semibold text-xs text-slate-900 dark:text-white mt-0.5">{v}</div>
                </div>
              ) : null)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
