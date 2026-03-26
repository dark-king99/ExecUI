import { useApi } from "../../hooks/useApi";
import { marketing } from "../../services/api";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { FlaskConical, TrendingUp, Plus, CheckCircle, AlertCircle } from "lucide-react";

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
  const { data: experiments, loading, error } = useApi(
    () => marketing.experiments.list(), [], { pollingInterval: 30000 }
  );

  const allExperiments = experiments ?? [];
  const running    = allExperiments.filter(e => e.status === "running").length;
  const completed  = allExperiments.filter(e => e.status === "completed").length;
  const significant = allExperiments.filter(e => e.confidence && e.confidence >= 95).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Experimentation Lab"
        subtitle="A/B and multivariate tests with statistical significance tracking"
        actions={
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition">
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
