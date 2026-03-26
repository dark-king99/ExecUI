import { useState } from "react";
import { useApi, useMutation } from "../../hooks/useApi";
import { useToast } from "../../components/ui/Toast";
import { marketing } from "../../services/api";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { FlaskConical, TrendingUp, Plus, CheckCircle, AlertCircle, X } from "lucide-react";

const EMPTY_EXP = { name: "", type: "A/B Test", hypothesis: "", audience: "" };

function NewExperimentModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_EXP);
  const [formError, setFormError] = useState(null);
  const { mutate, loading } = useMutation((data) => marketing.experiments.create(data));

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) { setFormError("Experiment name is required."); return; }
    try {
      await mutate(form);
      toast({ message: "Experiment created.", type: "success" });
      onCreated();
      onClose();
    } catch (err) {
      setFormError(err?.message ?? "Failed to create experiment.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">New Experiment</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {formError && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{formError}</div>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Experiment name"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
              <select value={form.type} onChange={e => set("type", e.target.value)}
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {["A/B Test", "Multivariate", "Split URL", "Personalization"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Audience</label>
              <input type="text" value={form.audience} onChange={e => set("audience", e.target.value)} placeholder="e.g. All visitors"
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Hypothesis</label>
            <textarea value={form.hypothesis} onChange={e => set("hypothesis", e.target.value)} rows={2} placeholder="If we change X, then Y will improve because Z"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading}
              className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white transition">
              {loading ? "Creating…" : "Create Experiment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const statusVariant = { running: "info", completed: "success", scheduled: "neutral" };

function ConfidenceBar({ confidence }) {
  if (!confidence) return <span className="text-xs text-slate-400">Not started</span>;
  const color = confidence >= 95 ? "bg-emerald-500" : confidence >= 80 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 rounded-full bg-slate-200 dark:bg-slate-700">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${confidence}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{confidence}%</span>
    </div>
  );
}

export default function ExperimentationLab() {
  const [showModal, setShowModal] = useState(false);
  const { data: experiments, loading, error, refetch } = useApi(
    () => marketing.experiments.list(), [], { pollingInterval: 30000 }
  );

  const allExperiments = experiments ?? [];
  const running    = allExperiments.filter(e => e.status === "running").length;
  const completed  = allExperiments.filter(e => e.status === "completed").length;
  const significant = allExperiments.filter(e => e.confidence && e.confidence >= 95).length;

  return (
    <div className="space-y-6">
      {showModal && <NewExperimentModal onClose={() => setShowModal(false)} onCreated={refetch} />}

      <PageHeader
        title="Experimentation Lab"
        subtitle="A/B and multivariate tests with statistical significance tracking"
        actions={
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition">
            <Plus size={15} /> New Experiment
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Running"     value={loading ? "…" : running}     icon={FlaskConical} color="sky" />
        <Stat label="Significant" value={loading ? "…" : significant} icon={CheckCircle}  color="emerald" />
        <Stat label="Completed"   value={loading ? "…" : completed}   icon={TrendingUp}   color="indigo" />
      </div>

      <Card>
        <CardHeader title="Experiments" icon={FlaskConical} />
        <CardBody className="space-y-3">
          {loading && allExperiments.length === 0 && (
            <div className="space-y-3 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-28 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
            </div>
          )}
          {!loading && !error && allExperiments.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">No experiments found.</p>
          )}
          {allExperiments.map(exp => (
            <div key={exp.id ?? exp.name} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{exp.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge label={exp.type} variant="neutral" />
                    <span className="text-xs text-slate-400">Audience: {exp.audience ?? "—"}</span>
                  </div>
                </div>
                <StatusBadge label={exp.status} variant={statusVariant[exp.status] ?? "neutral"} dot />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Confidence</p>
                  <ConfidenceBar confidence={exp.confidence} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Lift</p>
                  <p className={`text-sm font-bold ${exp.lift && exp.lift !== "—" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>{exp.lift ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Winner</p>
                  <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{exp.winner ?? "Pending"}</p>
                </div>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
