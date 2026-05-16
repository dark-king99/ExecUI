import { useState } from "react";
import {
  Sparkles, Users, Layers, TrendingUp, Brain, Activity, AlertCircle, Loader2, X, Plus,
} from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { useToast } from "../../components/ui/Toast";
import { marketing } from "../../services/api";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";

function NewExperienceModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", segment: "", type: "Content" });
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => marketing.personalization.create(d));
  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }
  async function handleSubmit(e) {
    e.preventDefault();
    setErr(null);
    if (!form.name.trim()) { setErr("Experience name is required."); return; }
    try {
      await mutate(form);
      toast({ message: `Experience "${form.name}" created.`, type: "success" });
      onCreated?.();
      onClose();
    } catch (e) { setErr(e?.message ?? "Failed to create experience."); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">New Experience</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {err && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{err}</div>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Experience name"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
              <select value={form.type} onChange={e => set("type", e.target.value)}
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {["Content","Banner","CTA","Email","Journey"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Segment</label>
              <input type="text" value={form.segment} onChange={e => set("segment", e.target.value)} placeholder="e.g. All Visitors"
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white transition">{loading ? "Creating…" : "Create Experience"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const statusColor = {
  live:    "text-green-500",
  testing: "text-yellow-500",
  paused:  "text-slate-400",
  Live:    "text-green-500",
  Testing: "text-yellow-500",
  Paused:  "text-slate-400",
};

export default function Personalization() {
  const toast = useToast();
  const [showNewExp, setShowNewExp] = useState(false);
  const [environment, setEnvironment] = useState("web");
  const [aiEnabled, setAiEnabled] = useState(true);

  const { data: metrics, loading: metricsLoading, error: metricsError } = useApi(
    () => marketing.personalization.metrics(), [], { pollingInterval: 30000 }
  );
  const { data: experiences, loading: expLoading } = useApi(
    () => marketing.personalization.list(), [], { pollingInterval: 30000 }
  );

  const allExperiences = experiences ?? [];

  return (
    <div className="space-y-6">
      {showNewExp && <NewExperienceModal onClose={() => setShowNewExp(false)} onCreated={() => {}} />}

      <PageHeader
        title="Personalization Engine"
        subtitle="Real-time behavioral targeting, segmentation, and AI-driven experience optimization."
        actions={
          <div className="flex items-center gap-2">
            <select
              value={environment} onChange={e => setEnvironment(e.target.value)}
              className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="web">Web</option>
              <option value="email">Email</option>
              <option value="app">Mobile App</option>
              <option value="omni">Omnichannel</option>
            </select>
            <button onClick={() => setShowNewExp(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg transition">
              <Plus size={15} /> Create Experience
            </button>
          </div>
        }
      />

      {metricsError && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {metricsError}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Active Segments"  value={metricsLoading ? "…" : (metrics?.activeSegments  ?? "—")} icon={Users}      color="indigo" />
        <Stat label="Live Experiences" value={metricsLoading ? "…" : (metrics?.liveExperiences ?? "—")} icon={Layers}     color="emerald" />
        <Stat label="Live Visitors"    value={metricsLoading ? "…" : (metrics?.liveVisitors    ?? "—")} icon={Activity}   color="sky" />
        <Stat label="Conversion Lift"  value={metricsLoading ? "…" : (metrics?.conversionLift  ?? "—")} icon={TrendingUp} color="amber" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader title="Audience Segmentation" icon={Layers} />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Lifecycle Stage", value: metrics?.topLifecycleStage ?? "—" },
                { label: "Last Visit",      value: metrics?.lastVisitWindow ?? "—" },
                { label: "Top Industry",    value: metrics?.topIndustry ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Estimated Reach: {metrics?.estimatedReach != null
                  ? Number(metrics.estimatedReach).toLocaleString() + " users" : "—"}
              </span>
              <button
                onClick={() => toast({ message: "Edit rules in the Segmentation Studio.", type: "info" })}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Edit Rules
              </button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="AI Optimization" icon={Brain} />
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700 dark:text-slate-300">Auto Optimize Traffic</span>
              <button
                onClick={() => setAiEnabled(!aiEnabled)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition ${
                  aiEnabled ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                {aiEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {metrics?.aiRecommendation ?? "AI is analyzing traffic patterns and engagement signals…"}
            </p>
            <button
              onClick={() => toast({ message: "AI recommendation applied.", type: "success" })}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-lg text-sm transition"
            >
              Apply Recommendation
            </button>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Active Experiences" icon={Sparkles} actions={
          <button onClick={() => setShowNewExp(true)} className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline"><Plus size={12} /> New</button>
        } />

        <CardBody>
          {expLoading && allExperiences.length === 0 && (
            <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-slate-400" /></div>
          )}
          {!expLoading && allExperiences.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No experiences yet.</p>
          )}
          {allExperiences.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  {["Experience","Segment","Status","Conversion"].map(h => (
                    <th key={h} className="text-left py-2 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allExperiences.map(exp => (
                  <tr key={exp.id ?? exp.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 px-2 font-medium text-slate-900 dark:text-white">{exp.name}</td>
                    <td className="py-3 px-2 text-slate-600 dark:text-slate-300">{exp.segment ?? "—"}</td>
                    <td className="py-3 px-2">
                      <span className={`text-xs font-semibold ${statusColor[exp.status] ?? "text-slate-500"}`}>{exp.status ?? "—"}</span>
                    </td>
                    <td className="py-3 px-2 text-slate-600 dark:text-slate-300">{exp.conversion ?? exp.conversionRate ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

