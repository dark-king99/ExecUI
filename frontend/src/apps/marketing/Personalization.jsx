import { useState } from "react";
import {
  Sparkles,
  Users,
  Layers,
  TrendingUp,
  Brain,
  Activity,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { useToast } from "../../components/ui/Toast";
import { marketing } from "../../services/api";

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
    <div className="min-h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-8 space-y-8">
      {showNewExp && <NewExperienceModal onClose={() => setShowNewExp(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Sparkles size={20} /> Personalization Engine
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Real-time behavioral targeting, segmentation, and AI-driven optimization.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md px-3 py-2 text-sm"
          >
            <option value="web">Web</option>
            <option value="email">Email</option>
            <option value="app">Mobile App</option>
            <option value="omni">Omnichannel</option>
          </select>

          <button onClick={() => setShowNewExp(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700">
            Create Experience
          </button>
        </div>
      </div>

      {metricsError && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {metricsError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard icon={Users}     title="Active Segments"  value={metricsLoading ? "…" : (metrics?.activeSegments ?? "—")} />
        <MetricCard icon={Layers}    title="Live Experiences" value={metricsLoading ? "…" : (metrics?.liveExperiences ?? "—")} />
        <MetricCard icon={Activity}  title="Live Visitors"    value={metricsLoading ? "…" : (metrics?.liveVisitors ?? "—")} />
        <MetricCard icon={TrendingUp} title="Conversion Lift" value={metricsLoading ? "…" : (metrics?.conversionLift ?? "—")} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6 shadow-sm">
          <h2 className="font-semibold text-lg">Audience Segmentation</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Rule label="Lifecycle Stage" value={metrics?.topLifecycleStage ?? "—"} />
            <Rule label="Last Visit"      value={metrics?.lastVisitWindow ?? "—"} />
            <Rule label="Top Industry"    value={metrics?.topIndustry ?? "—"} />
          </div>

          <div className="flex items-center justify-between mt-6">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Estimated Reach: {metrics?.estimatedReach != null
                ? Number(metrics.estimatedReach).toLocaleString() + " users"
                : "—"}
            </span>
            <button
              onClick={() => toast({ message: "Segmentation rules updated.", type: "success" })}
              className="px-4 py-2 text-sm bg-slate-200 dark:bg-slate-800 rounded-md hover:bg-slate-300 dark:hover:bg-slate-700 transition"
            >
              Edit Rules
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Brain size={18} /> AI Optimization
          </h2>

          <div className="flex items-center justify-between">
            <span className="text-sm">Auto Optimize Traffic</span>
            <button
              onClick={() => setAiEnabled(!aiEnabled)}
              className={`px-3 py-1 text-xs rounded-full ${
                aiEnabled ? "bg-green-500 text-white" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              {aiEnabled ? "Enabled" : "Disabled"}
            </button>
          </div>

          <div className="text-sm text-slate-600 dark:text-slate-400">
            {metrics?.aiRecommendation ?? "AI analyzing traffic patterns…"}
          </div>

          <button
            onClick={() => toast({ message: "AI recommendation applied.", type: "success" })}
            className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-md text-sm hover:bg-indigo-700"
          >
            Apply Recommendation
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h2 className="font-semibold text-lg mb-4">Active Experiences</h2>

        {expLoading && allExperiences.length === 0 && (
          <div className="flex justify-center py-4">
            <Loader2 size={18} className="animate-spin text-slate-400" />
          </div>
        )}

        {!expLoading && allExperiences.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">No experiences found.</p>
        )}

        {allExperiences.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-600 dark:text-slate-400">
              <tr>
                <th className="py-2">Experience</th>
                <th>Segment</th>
                <th>Status</th>
                <th>Conversion</th>
              </tr>
            </thead>
            <tbody>
              {allExperiences.map(exp => (
                <tr key={exp.id ?? exp.name} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="py-3">{exp.name}</td>
                  <td>{exp.segment}</td>
                  <td className={statusColor[exp.status] ?? "text-slate-400"}>{exp.status}</td>
                  <td>{exp.conversion ?? exp.conversionRate ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, title, value }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <Icon size={18} />
        <span className="text-xs text-slate-500 dark:text-slate-400">Real-time</span>
      </div>
      <div className="mt-4 text-xl font-semibold">{value}</div>
      <div className="text-sm text-slate-600 dark:text-slate-400">{title}</div>
    </div>
  );
}

function Rule({ label, value }) {
  return (
    <div className="bg-slate-100 dark:bg-slate-800 rounded-md p-3">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
