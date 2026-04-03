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
  AlertCircle,
  X,
} from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { useToast } from "../../components/ui/Toast";
import { marketing } from "../../services/api";

function AddSourceModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", type: "Web" });
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => marketing.cdp.addSource(d));
  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }
  async function handleSubmit(e) {
    e.preventDefault();
    setErr(null);
    if (!form.name.trim()) { setErr("Source name is required."); return; }
    try {
      await mutate(form);
      toast({ message: `Data source "${form.name}" added.`, type: "success" });
      onCreated?.();
      onClose();
    } catch (e) { setErr(e?.message ?? "Failed to add data source."); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Add Data Source</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {err && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{err}</div>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Salesforce CRM"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
            <select value={form.type} onChange={e => set("type", e.target.value)}
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {["Web","CRM","Mobile","Email","Ads","Data Warehouse","Other"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white transition">{loading ? "Adding…" : "Add Source"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateSegmentModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", description: "" });
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => marketing.cdp.createSegment(d));
  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }
  async function handleSubmit(e) {
    e.preventDefault();
    setErr(null);
    if (!form.name.trim()) { setErr("Segment name is required."); return; }
    try {
      await mutate(form);
      toast({ message: `Segment "${form.name}" created.`, type: "success" });
      onCreated?.();
      onClose();
    } catch (e) { setErr(e?.message ?? "Failed to create segment."); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Create Segment</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {err && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{err}</div>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Segment name"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2} placeholder="Define this audience segment"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white transition">{loading ? "Creating…" : "Create Segment"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CustomerDataPlatform() {
  const [activeModule, setActiveModule] = useState("overview");
  const [showAddSource, setShowAddSource] = useState(false);
  const [showCreateSegment, setShowCreateSegment] = useState(false);

  const { data: cdpMetrics, loading, error } = useApi(
    () => marketing.cdp.metrics(), [], { pollingInterval: 60000 }
  );
  const { data: sources } = useApi(
    () => marketing.cdp.sources(), [], { pollingInterval: 120000 }
  );

  const allSources = sources ?? [];

  return (
    <div className="min-h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {showAddSource && <AddSourceModal onClose={() => setShowAddSource(false)} />}
      {showCreateSegment && <CreateSegmentModal onClose={() => setShowCreateSegment(false)} />}

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
          <button onClick={() => setShowAddSource(true)} className="px-4 py-2 text-sm bg-slate-200 dark:bg-slate-800 rounded-md hover:bg-slate-300 dark:hover:bg-slate-700 transition">
            Add Data Source
          </button>
          <button onClick={() => setShowCreateSegment(true)} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition">
            Create Segment
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-8 mt-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-6 px-8 py-6">
        {loading && !cdpMetrics ? (
          <div className="col-span-6 grid grid-cols-6 gap-6 animate-pulse">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
          </div>
        ) : cdpMetrics ? (
          <>
            <Metric label="Unified Profiles"       value={cdpMetrics.unifiedProfiles ?? "—"} />
            <Metric label="Active Data Sources"    value={cdpMetrics.activeDataSources ?? allSources.length} />
            <Metric label="Identity Matches / Day" value={cdpMetrics.identityMatchesPerDay ?? "—"} />
            <Metric label="Real-Time Events"       value={cdpMetrics.realTimeEvents ?? "—"} />
            <Metric label="Segments Live"          value={cdpMetrics.segmentsLive ?? "—"} />
            <Metric label="Predictive Models"      value={cdpMetrics.predictiveModels ?? "—"} />
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 px-8 pb-10">

        <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
            <GitMerge size={18} /> Identity Resolution Engine
          </h2>
          <div className="h-[350px] border border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            Visual Identity Graph (Email ↔ Device ↔ CRM ↔ Network ↔ Behavioral)
          </div>
        </div>

        <div className="space-y-6">
          <Card
            icon={Network}
            title="Data Pipelines"
            description={allSources.length > 0
              ? allSources.map(s => s.name).join(", ")
              : "Web, CRM, Mobile, Network telemetry, Marketing automation."}
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 px-8 pb-12">

        <div onClick={() => setActiveModule("profiles")} className="cursor-pointer transition hover:scale-[1.02]">
          <Section title="Unified Profile Explorer" icon={Users}>
            360° customer timeline, engagement score, predicted CLV, churn risk.
          </Section>
        </div>

        <div onClick={() => setActiveModule("segmentation")} className="cursor-pointer transition hover:scale-[1.02]">
          <Section title="Segmentation Studio" icon={Layers}>
            Behavioral rules, dynamic audiences, predictive lookalikes.
          </Section>
        </div>

        <div onClick={() => setActiveModule("predictive")} className="cursor-pointer transition hover:scale-[1.02]">
          <Section title="Predictive Intelligence Lab" icon={Brain}>
            Propensity modeling, churn prediction, LTV forecasting.
          </Section>
        </div>

      </div>

      {activeModule === "profiles"     && <UnifiedProfileExplorer />}
      {activeModule === "segmentation" && <VisualSegmentationStudio />}
    </div>
  );
}

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
