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
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { marketing } from "../../services/api";

const statusColor = {
  live:    "text-green-500",
  testing: "text-yellow-500",
  paused:  "text-slate-400",
  Live:    "text-green-500",
  Testing: "text-yellow-500",
  Paused:  "text-slate-400",
};

export default function Personalization() {
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

          <button className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700">
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
            <button className="px-4 py-2 text-sm bg-slate-200 dark:bg-slate-800 rounded-md">
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

          <button className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-md text-sm hover:bg-indigo-700">
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
