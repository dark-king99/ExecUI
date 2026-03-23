import { useState } from "react";
import {
  Workflow,
  Users,
  Activity,
  Sparkles,
  Beaker,
  ShieldCheck,
  GitBranch,
  Brain,
} from "lucide-react";

export default function EMMA() {
  const [activeTab, setActiveTab] = useState("canvas");

  return (
    <div className="min-h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      {/* PLATFORM HEADER */}
      <div className="border-b border-slate-200 dark:border-slate-800 px-8 py-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Workflow size={22} /> E.M.M.A.
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Engagement Marketing Management Architecture — Unified journey orchestration platform.
          </p>
        </div>

        <div className="flex gap-4">
          <button className="px-4 py-2 text-sm bg-slate-200 dark:bg-slate-800 rounded-md">
            Publish Journey
          </button>
          <button className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md">
            Create Journey
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-6 px-8 py-6">
        <KPI label="Active Journeys" value="24" />
        <KPI label="Live Contacts" value="128,490" />
        <KPI label="Triggered Events" value="2.4M" />
        <KPI label="Conversion Lift" value="+21%" />
        <KPI label="Experiments Running" value="8" />
        <KPI label="AI Optimization" value="Enabled" />
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 px-8 pb-10">

        {/* JOURNEY CANVAS */}
        <div className="xl:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
            <GitBranch size={18} /> Visual Journey Canvas
          </h2>

          <div className="h-[420px] rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            Drag & Drop Nodes (Trigger → Condition → Action → Channel → Goal)
          </div>
        </div>

        {/* SIDE PANEL */}
        <div className="space-y-6">

          {/* CUSTOMER PROFILE EXPLORER */}
          <Panel
            icon={Users}
            title="Unified Customer Profile"
            description="Behavior, attributes, lifecycle stage, predictive score."
          />

          {/* REAL-TIME EVENT STREAM */}
          <Panel
            icon={Activity}
            title="Live Event Stream"
            description="Real-time triggers from web, CRM, email, mobile, network."
          />

          {/* AI OPTIMIZER */}
          <Panel
            icon={Brain}
            title="AI Journey Optimizer"
            description="Predictive path routing & uplift recommendations."
          />

        </div>
      </div>

      {/* LOWER GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 px-8 pb-12">

        {/* EXPERIMENTATION */}
        <Section title="Experimentation & A/B Testing" icon={Beaker}>
          Running multi-variant experiments with traffic allocation & statistical confidence.
        </Section>

        {/* CONSENT MANAGEMENT */}
        <Section title="Frequency & Consent Control" icon={ShieldCheck}>
          Enforce communication limits, global suppression, regional compliance.
        </Section>

        {/* APPROVAL WORKFLOW */}
        <Section title="Approval Workflow & Versioning" icon={Sparkles}>
          Role-based approvals, change logs, and journey version history.
        </Section>

      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function KPI({ label, value }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm text-sm">
      <div className="text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}

function Panel({ icon: Icon, title, description }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 font-semibold mb-2">
        <Icon size={16} /> {title}
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 font-semibold mb-3">
        <Icon size={18} /> {title}
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {children}
      </p>
    </div>
  );
}