import { useState } from "react";
import { FlaskConical, Plus, RefreshCw, AlertCircle, Play, Pause, X, TrendingUp, Award } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { marketing } from "../../services/api";

const STATUS_VARIANT = { running: "success", paused: "warning", draft: "neutral", completed: "info", "winning-declared": "indigo" };
const TYPE_VARIANT = { "a/b": "sky", multivariate: "indigo", split: "info", personalization: "violet" };
const EMPTY = { name: "", type: "a/b", hypothesis: "", metric: "conversion_rate" };

function NewExperimentModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => marketing.experiments.create(d), {
    onSuccess: () => { toast({ message: "Experiment created", type: "success" }); onCreated(); onClose(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">New Experiment</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); setErr(null); if (!form.name.trim()) { setErr("Name required"); return; } mutate(form); }} className="px-6 py-5 space-y-4">
          {err && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Experiment Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Homepage CTA Button Test" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
              <select value={form.type} onChange={e => set("type", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                {["a/b", "multivariate", "split", "personalization"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Primary Metric</label>
              <select value={form.metric} onChange={e => set("metric", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                {["conversion_rate", "click_rate", "revenue", "engagement", "bounce_rate"].map(m => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Hypothesis</label>
            <textarea rows={2} value={form.hypothesis} onChange={e => set("hypothesis", e.target.value)} placeholder="We believe that… will result in…" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
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

export default function ExperimentationLab() {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: experiments, loading, error, refetch } = useApi(() => marketing.experiments.list({ limit: 100 }), [], { pollingInterval: 60000 });
  const { mutate: startExp } = useMutation((id) => marketing.experiments.start(id), { onSuccess: () => { toast({ message: "Experiment started", type: "success" }); refetch(); }, onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }) });
  const { mutate: pauseExp } = useMutation((id) => marketing.experiments.pause(id), { onSuccess: () => { toast({ message: "Experiment paused", type: "success" }); refetch(); }, onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }) });
  const all = experiments ?? [];
  const filtered = statusFilter === "all" ? all : all.filter(e => e.status === statusFilter);
  const stats = { total: all.length, running: all.filter(e => e.status === "running").length, completed: all.filter(e => e.status === "completed" || e.status === "winning-declared").length };
  return (
    <div className="space-y-6">
      {showModal && <NewExperimentModal onClose={() => setShowModal(false)} onCreated={refetch} />}
      <PageHeader title="Experimentation Lab" subtitle="Run rigorous A/B tests and multivariate experiments"
        actions={<button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg transition"><Plus size={15} /> New Experiment</button>}
      />
      {loading && all.length === 0 ? (
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Total Experiments" value={stats.total} icon={FlaskConical} color="violet" />
          <Stat label="Running" value={stats.running} icon={TrendingUp} color="emerald" />
          <Stat label="Completed" value={stats.completed} icon={Award} color="sky" />
        </div>
      )}
      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}
      <div className="flex items-center gap-3">
        {["all", "running", "paused", "draft", "completed"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`text-xs px-3 py-1.5 rounded-full border capitalize transition ${statusFilter === s ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-400"}`}>{s}</button>
        ))}
        <button onClick={refetch} className="ml-auto flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /></button>
      </div>
      <div className="space-y-4">
        {loading && all.length === 0 ? <SkeletonTable rows={6} /> : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No experiments found.</div>
        ) : filtered.map((exp, i) => {
          const variants = exp.variants ?? [];
          const winner = variants.find(v => v.winner) ?? variants.reduce((best, v) => (v.conversionRate ?? 0) > (best?.conversionRate ?? 0) ? v : best, null);
          return (
            <Card key={exp.id ?? i}>
              <CardBody>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{exp.name}</h3>
                      <StatusBadge label={exp.status ?? "draft"} variant={STATUS_VARIANT[exp.status] ?? "neutral"} />
                      <StatusBadge label={exp.type ?? "a/b"} variant={TYPE_VARIANT[exp.type] ?? "neutral"} />
                    </div>
                    {exp.hypothesis && <p className="text-xs text-slate-500">{exp.hypothesis}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {exp.status === "running" ? (
                      <button onClick={() => pauseExp(exp.id)} className="flex items-center gap-1.5 text-xs text-white bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded-lg transition"><Pause size={12} /> Pause</button>
                    ) : exp.status !== "completed" && exp.status !== "winning-declared" ? (
                      <button onClick={() => startExp(exp.id)} className="flex items-center gap-1.5 text-xs text-white bg-violet-600 hover:bg-violet-700 px-3 py-1.5 rounded-lg transition"><Play size={12} /> Start</button>
                    ) : null}
                  </div>
                </div>
                {variants.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {variants.map((v, vi) => (
                      <div key={v.id ?? vi} className={`p-3 rounded-lg border ${v.winner ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20" : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{v.name ?? `Variant ${vi + 1}`}</span>
                          {v.winner && <Award size={12} className="text-emerald-500" />}
                        </div>
                        <div className="text-lg font-bold text-slate-900 dark:text-white">{v.conversionRate != null ? `${v.conversionRate}%` : "—"}</div>
                        <div className="text-xs text-slate-400">{v.visitors?.toLocaleString() ?? 0} visitors</div>
                        {v.lift != null && <div className={`text-xs font-semibold mt-1 ${v.lift >= 0 ? "text-emerald-600" : "text-red-500"}`}>{v.lift >= 0 ? "+" : ""}{v.lift}% lift</div>}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                  {exp.metric && <span>Metric: {exp.metric.replace(/_/g, " ")}</span>}
                  {exp.confidence != null && <span>Confidence: {exp.confidence}%</span>}
                  {exp.visitors != null && <span>{exp.visitors.toLocaleString()} total visitors</span>}
                  {exp.startDate && <span>Started: {exp.startDate}</span>}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
