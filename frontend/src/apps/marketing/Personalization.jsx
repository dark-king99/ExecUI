import { useState } from "react";
import {
  Sparkles,
  Users,
  Layers,
  TrendingUp,
  Brain,
  Activity,
} from "lucide-react";

export default function Personalization() {
  const [environment, setEnvironment] = useState("web");
  const [aiEnabled, setAiEnabled] = useState(true);

  return (
    <div className="min-h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-8 space-y-8">

      {/* HEADER */}
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

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard icon={Users} title="Active Segments" value="42" />
        <MetricCard icon={Layers} title="Live Experiences" value="18" />
        <MetricCard icon={Activity} title="Live Visitors" value="12,487" />
        <MetricCard icon={TrendingUp} title="Conversion Lift" value="+18.4%" />
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* SEGMENT BUILDER */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6 shadow-sm">
          <h2 className="font-semibold text-lg">Audience Segmentation</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Rule label="Lifecycle Stage" value="High-Intent Lead" />
            <Rule label="Last Visit" value="Within 7 Days" />
            <Rule label="Industry" value="FinTech" />
          </div>

          <div className="flex items-center justify-between mt-6">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Estimated Reach: 24,312 users
            </span>
            <button className="px-4 py-2 text-sm bg-slate-200 dark:bg-slate-800 rounded-md">
              Edit Rules
            </button>
          </div>
        </div>

        {/* AI PANEL */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Brain size={18} /> AI Optimization
          </h2>

          <div className="flex items-center justify-between">
            <span className="text-sm">Auto Optimize Traffic</span>
            <button
              onClick={() => setAiEnabled(!aiEnabled)}
              className={`px-3 py-1 text-xs rounded-full ${
                aiEnabled
                  ? "bg-green-500 text-white"
                  : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              {aiEnabled ? "Enabled" : "Disabled"}
            </button>
          </div>

          <div className="text-sm text-slate-600 dark:text-slate-400">
            AI predicts a potential +12.7% uplift by reallocating traffic toward Variant B.
          </div>

          <button className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-md text-sm hover:bg-indigo-700">
            Apply Recommendation
          </button>
        </div>
      </div>

      {/* EXPERIENCE TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h2 className="font-semibold text-lg mb-4">Active Experiences</h2>

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
            <tr className="border-t border-slate-200 dark:border-slate-800">
              <td className="py-3">Homepage Hero Personalization</td>
              <td>High-Intent Leads</td>
              <td className="text-green-500">Live</td>
              <td>6.8%</td>
            </tr>
            <tr className="border-t border-slate-200 dark:border-slate-800">
              <td className="py-3">Pricing Page Variant Test</td>
              <td>Returning Users</td>
              <td className="text-yellow-500">Testing</td>
              <td>4.2%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* Reusable Metric Card */
function MetricCard({ icon: Icon, title, value }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <Icon size={18} />
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Real-time
        </span>
      </div>
      <div className="mt-4 text-xl font-semibold">{value}</div>
      <div className="text-sm text-slate-600 dark:text-slate-400">
        {title}
      </div>
    </div>
  );
}

/* Rule Component */
function Rule({ label, value }) {
  return (
    <div className="bg-slate-100 dark:bg-slate-800 rounded-md p-3">
      <div className="text-xs text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="text-sm font-medium">
        {value}
      </div>
    </div>
  );
}