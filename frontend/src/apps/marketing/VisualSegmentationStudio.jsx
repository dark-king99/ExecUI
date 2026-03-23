import { useState } from "react";
import LogicBuilder from "./LogicBuilder";
import RealTimeEstimationEngine from "./RealTimeEstimationEngine";
import {
  Layers,
  GitBranch,
  Brain,
  ShieldCheck,
  PlayCircle,
  Database,
  Clock,
  Users,
  CheckCircle2,
} from "lucide-react";

export default function VisualSegmentationStudio() {
  const [segmentStatus, setSegmentStatus] = useState("Draft");
  const [predictionsEnabled, setPredictionsEnabled] = useState(true);

  return (
    <div className="min-h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      {/* HEADER */}
      <div className="border-b border-slate-200 dark:border-slate-800 px-8 py-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Layers size={22} /> Visual Segmentation Studio
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Rule-based & predictive audience modeling with real-time estimation.
          </p>
        </div>

        <div className="flex gap-4 items-center">
          <StatusBadge status={segmentStatus} />
          <button className="px-4 py-2 text-sm bg-slate-200 dark:bg-slate-800 rounded-md">
            Save Draft
          </button>
          <button className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md">
            Activate Segment
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-6 px-8 py-6">
        <Metric label="Estimated Audience" value="184,230" />
        <Metric label="Data Sources Used" value="6" />
        <Metric label="Refresh Frequency" value="Real-Time" />
        <Metric label="Match Confidence" value="98.4%" />
        <Metric label="Active Destinations" value="4" />
        <Metric label="Version" value="v3.2" />
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 px-8 pb-10">

        {/* LOGIC CANVAS */}
        <div className="xl:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
            <GitBranch size={18} /> Drag & Drop Logic Builder
          </h2>

          <div className="h-[400px] border border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            Condition Groups → (Behavioral / Demographic / Predictive / CRM Fields)
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="space-y-6">

          <Panel
            icon={Database}
            title="SQL Preview"
            content="SELECT * FROM profiles WHERE lifecycle_stage = 'High Intent' AND last_activity < 7d"
          />

          <Panel
            icon={Brain}
            title="Predictive Layer"
            content="Lookalike Modeling Enabled — Propensity Score ≥ 0.72"
            toggle={predictionsEnabled}
            onToggle={() => setPredictionsEnabled(!predictionsEnabled)}
          />

          <Panel
            icon={ShieldCheck}
            title="Governance"
            content="Requires Compliance Approval before activation."
          />

        </div>
      </div>

      {/* LOWER GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 px-8 pb-12">

        <Section icon={PlayCircle} title="Activation Destinations">
          Marketing Automation, CRM, Ad Platforms, E.M.M.A. Journeys.
        </Section>

        <Section icon={Clock} title="Version History">
          View changes, compare revisions, rollback previous definitions.
        </Section>

        <Section icon={Users} title="Performance Simulation">
          Simulate expected conversion lift before publishing.
        </Section>
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-12">

  {/* LEFT — LOGIC BUILDER */}
  <div>
    <LogicBuilder />
  </div>

  {/* RIGHT — STICKY ESTIMATION PANEL */}
  <div className="xl:col-span-1">
    <div className="sticky top-6">
      <RealTimeEstimationEngine />
    </div>
  </div>

</div>

      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function Metric({ label, value }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm text-sm">
      <div className="text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}

function Panel({ icon: Icon, title, content, toggle, onToggle }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 font-semibold">
          <Icon size={16} /> {title}
        </div>
        {typeof toggle === "boolean" && (
          <button
            onClick={onToggle}
            className={`px-3 py-1 text-xs rounded-full ${
              toggle
                ? "bg-green-500 text-white"
                : "bg-slate-300 dark:bg-slate-700"
            }`}
          >
            {toggle ? "Enabled" : "Disabled"}
          </button>
        )}
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400">{content}</p>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 font-semibold mb-3">
        <Icon size={18} /> {title}
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400">{children}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    Draft: "bg-yellow-500",
    Active: "bg-green-500",
    Archived: "bg-slate-500",
  };

  return (
    <span className={`px-3 py-1 text-xs rounded-full text-white ${colors[status]}`}>
      {status}
    </span>
  );
}