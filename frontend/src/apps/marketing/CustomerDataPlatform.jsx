import { useState } from "react";
import VisualSegmentationStudio from "./VisualSegmentationStudio";
import UnifiedProfileExplorer from "./UnifiedProfileExplorer";
import {
  Database,
  Users,
  Activity,
  GitMerge,
  Layers,
  ShieldCheck,
  Brain,
  Network,
} from "lucide-react";

export default function CustomerDataPlatform() {
  const [activeModule, setActiveModule, activeTab, setActiveTab] = useState("overview", "segmentation");

  return (
    <div className="min-h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      {/* HEADER */}
      <div className="border-b border-slate-200 dark:border-slate-800 px-8 py-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Database size={22} /> Customer Data Platform
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Real-time identity resolution, data unification, and enterprise activation engine.
          </p>
        </div>

        <div className="flex gap-4">
          <button className="px-4 py-2 text-sm bg-slate-200 dark:bg-slate-800 rounded-md">
            Add Data Source
          </button>
          <button className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md">
            Create Segment
          </button>
        </div>
      </div>

      {/* EXECUTIVE STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-6 px-8 py-6">
        <Metric label="Unified Profiles" value="2.4M" />
        <Metric label="Active Data Sources" value="18" />
        <Metric label="Identity Matches / Day" value="842K" />
        <Metric label="Real-Time Events" value="3.1M" />
        <Metric label="Segments Live" value="124" />
        <Metric label="Predictive Models" value="9" />
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 px-8 pb-10">

        {/* IDENTITY GRAPH */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
            <GitMerge size={18} /> Identity Resolution Engine
          </h2>
          <div className="h-[350px] border border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            Visual Identity Graph (Email ↔ Device ↔ CRM ↔ Network ↔ Behavioral)
          </div>
        </div>

        {/* DATA PIPELINES */}
        <div className="space-y-6">
          <Card
            icon={Network}
            title="Data Pipelines"
            description="Web, CRM, Mobile, Network telemetry, Marketing automation."
          />
          <Card
            icon={Activity}
            title="Real-Time Event Stream"
            description="Streaming ingestion & transformation engine."
          />
          <Card
            icon={ShieldCheck}
            title="Governance & Consent"
            description="Field-level access, audit logs, compliance enforcement."
          />
        </div>
      </div>

      {/* LOWER GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 px-8 pb-12">

      <div
  onClick={() => setActiveModule("profiles")}
  className="cursor-pointer transition hover:scale-[1.02]"
>
  <Section title="Unified Profile Explorer" icon={Users}>
    360° customer timeline, engagement score, predicted CLV, churn risk.
  </Section>
</div>

<div
  onClick={() => setActiveModule("segmentation")}
  className="cursor-pointer transition hover:scale-[1.02]"
>
  <Section title="Segmentation Studio" icon={Layers}>
    Behavioral rules, dynamic audiences, predictive lookalikes.
  </Section>
</div>
<div
  onClick={() => setActiveModule("predictive")}
  className="cursor-pointer transition hover:scale-[1.02]"
>
  <Section title="Predictive Intelligence Lab" icon={Brain}>
    Propensity modeling, churn prediction, LTV forecasting.
  </Section>
</div>
    

      </div>
      {/*{activeModule === "overview" && <CDPOverview />}*/}
{activeModule === "profiles" && <UnifiedProfileExplorer />}
{activeModule === "segmentation" && <VisualSegmentationStudio />}
{/*{activeModule === "predictive" && <PredictiveLab />}*/}
    </div>
  );
}

/* COMPONENTS */

function Metric({ label, value }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm text-sm">
      <div className="text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}

function Card({ icon: Icon, title, description }) {
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