import { useState } from "react";
import { BookOpen, Play, Plus, RefreshCw, AlertCircle, X, CheckCircle } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { crm } from "../../services/api";

const TYPE_VARIANT = { onboarding: "info", objection: "warning", discovery: "neutral", closing: "success", renewal: "sky", upsell: "indigo" };

function NewPlaybookModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", type: "discovery", description: "" });
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => crm.playbooks.create(d), {
    onSuccess: () => { toast({ message: "Playbook created", type: "success" }); onCreated(); onClose(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">New Playbook</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); setErr(null); if (!form.name.trim()) { setErr("Name required"); return; } mutate(form); }} className="px-6 py-5 space-y-4">
          {err && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Playbook name" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
            <select value={form.type} onChange={e => set("type", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              {["discovery", "objection", "onboarding", "closing", "renewal", "upsell"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea rows={3} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe this playbook…" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
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

function PlaybookDetail({ playbook, onClose }) {
  const toast = useToast();
  const { data: detail, loading } = useApi(() => crm.playbooks.get(playbook.id), [playbook.id]);
  const { mutate: runPlaybook, loading: running } = useMutation(() => crm.playbooks.run(playbook.id), {
    onSuccess: () => toast({ message: "Playbook started", type: "success" }),
    onError: (e) => toast({ message: e?.message ?? "Failed to run", type: "error" }),
  });
  const steps = detail?.steps ?? playbook.steps ?? [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">{playbook.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{playbook.type}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {playbook.description && <p className="text-sm text-slate-600 dark:text-slate-400">{playbook.description}</p>}
          {loading ? <SkeletonTable rows={4} /> : steps.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Steps</h3>
              {steps.map((s, i) => (
                <div key={s.id ?? i} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="h-6 w-6 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{s.title ?? s.action ?? s.name}</div>
                    {s.description && <div className="text-xs text-slate-500 mt-0.5">{s.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No steps defined.</p>
          )}
          <div className="grid grid-cols-3 gap-3 text-center">
            {[["Used", playbook.usedCount ?? playbook.runs ?? 0], ["Steps", steps.length || (detail?.stepsCount ?? "—")], ["Success Rate", playbook.successRate != null ? `${playbook.successRate}%` : "—"]].map(([l, v]) => (
              <div key={l} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                <div className="text-xs text-slate-500 mb-1">{l}</div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Close</button>
          <button onClick={() => runPlaybook()} disabled={running} className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white transition"><Play size={14} />{running ? "Running…" : "Run Playbook"}</button>
        </div>
      </div>
    </div>
  );
}

export default function PlaybooksLibrary() {
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const { data: playbooks, loading, error, refetch } = useApi(() => crm.playbooks.list(), [], { pollingInterval: 120000 });
  const all = playbooks ?? [];
  const TYPES = ["all", "discovery", "objection", "onboarding", "closing", "renewal", "upsell"];
  const filtered = typeFilter === "all" ? all : all.filter(p => p.type === typeFilter);
  const stats = { total: all.length, active: all.filter(p => p.active !== false).length, runs: all.reduce((s, p) => s + (p.runs ?? p.usedCount ?? 0), 0) };
  return (
    <div className="space-y-6">
      {showModal && <NewPlaybookModal onClose={() => setShowModal(false)} onCreated={refetch} />}
      {selected && <PlaybookDetail playbook={selected} onClose={() => setSelected(null)} />}
      <PageHeader title="Playbooks Library" subtitle="Standardize winning sales motions and best practices"
        actions={<button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 py-2 rounded-lg transition"><Plus size={15} /> New Playbook</button>}
      />
      {loading && all.length === 0 ? (
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Total Playbooks" value={stats.total} icon={BookOpen} color="orange" />
          <Stat label="Active" value={stats.active} icon={CheckCircle} color="emerald" />
          <Stat label="Total Runs" value={stats.runs} icon={Play} color="sky" />
        </div>
      )}
      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}
      <div className="flex items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`text-xs px-2.5 py-1 rounded-full border capitalize transition ${typeFilter === t ? "bg-orange-600 text-white border-orange-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-orange-400"}`}>{t === "all" ? "All Types" : t}</button>
          ))}
        </div>
        <button onClick={refetch} className="ml-auto flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /></button>
      </div>
      {loading && all.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No playbooks found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p, i) => (
            <div key={p.id ?? i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-orange-300 dark:hover:border-orange-700 transition cursor-pointer" onClick={() => setSelected(p)}>
              <div className="flex items-start justify-between mb-3">
                <div className="h-9 w-9 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
                  <BookOpen size={18} className="text-orange-600" />
                </div>
                <StatusBadge label={p.type ?? "general"} variant={TYPE_VARIANT[p.type] ?? "neutral"} />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">{p.name}</h3>
              {p.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{p.description}</p>}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span>{p.stepsCount ?? p.steps?.length ?? 0} steps</span>
                <span>{p.runs ?? p.usedCount ?? 0} runs</span>
                {p.successRate != null && <span className="text-emerald-600 font-medium">{p.successRate}% success</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
