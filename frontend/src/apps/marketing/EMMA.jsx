import { useState } from "react";
import {
  Workflow, GitBranch, Plus, Play, Pause, Users, Activity,
  Brain, Beaker, ShieldCheck, Sparkles, X, AlertCircle, ChevronRight,
} from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { useToast } from "../../components/ui/Toast";
import { marketing } from "../../services/api";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";

const statusVariant = { active: "success", paused: "warning", draft: "neutral", completed: "info" };

function NewJourneyModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", description: "", trigger: "event" });
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => marketing.flows.create(d));

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    if (!form.name.trim()) { setErr("Journey name is required."); return; }
    try {
      await mutate(form);
      toast({ message: "Journey created.", type: "success" });
      onCreated();
      onClose();
    } catch (ex) { setErr(ex?.message ?? "Failed to create journey."); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">New Journey</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-4 space-y-4">
          {err && <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-3 py-2">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Journey Name <span className="text-red-500">*</span></label>
            <input
              type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. New User Onboarding"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Entry Trigger</label>
            <select
              value={form.trigger} onChange={e => setForm(p => ({ ...p, trigger: e.target.value }))}
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {["event","segment","schedule","api"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={2} placeholder="What does this journey do?"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white transition">{loading ? "Creating…" : "Create Journey"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JourneyDetail({ journey, onClose }) {
  const toast = useToast();
  const { data: stats } = useApi(() => marketing.flows.stats(journey.id), [journey.id], {});
  const { mutate: updateFlow, loading: updating } = useMutation(({ id, d }) => marketing.flows.update(id, d));

  async function toggleStatus() {
    const nextStatus = journey.status === "active" ? "paused" : "active";
    try {
      await updateFlow({ id: journey.id, d: { status: nextStatus } });
      toast({ message: `Journey ${nextStatus}.`, type: "success" });
      onClose();
    } catch { toast({ message: "Failed to update journey.", type: "error" }); }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white truncate">{journey.name}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{journey.trigger ?? "—"} trigger · {journey.steps ?? 0} steps</p>
        </div>
        <button onClick={onClose} className="ml-3 shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="flex items-center gap-2">
          <StatusBadge label={journey.status ?? "draft"} variant={statusVariant[journey.status] ?? "neutral"} dot />
          <button
            onClick={toggleStatus}
            disabled={updating}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-60 ${
              journey.status === "active"
                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50"
                : "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/50"
            }`}
          >
            {journey.status === "active" ? <><Pause size={11} /> Pause</> : <><Play size={11} /> Activate</>}
          </button>
        </div>

        {journey.description && (
          <p className="text-sm text-slate-600 dark:text-slate-300">{journey.description}</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Enrolled", value: stats?.enrolled ?? journey.enrolled ?? "—" },
            { label: "Completed", value: stats?.completed ?? journey.completed ?? "—" },
            { label: "Conversion", value: stats?.conversionRate ?? journey.conversionRate ?? "—" },
            { label: "Revenue", value: stats?.revenue ?? journey.revenue ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">{label}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Steps */}
        {(journey.steps ?? 0) > 0 || (journey.stepList ?? []).length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Journey Steps</p>
            <div className="space-y-2">
              {(journey.stepList ?? []).map((step, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="h-5 w-5 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-violet-700 dark:text-violet-400">{i + 1}</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-900 dark:text-white">{step.name ?? step.type ?? `Step ${i+1}`}</p>
                    {step.channel && <p className="text-[10px] text-slate-500 dark:text-slate-400">{step.channel}</p>}
                  </div>
                </div>
              ))}
              {(journey.stepList ?? []).length === 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500">{journey.steps} steps configured — open in Journey Builder to view.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function EMMA() {
  const [showModal, setShowModal] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState(null);

  const { data: flows, loading, error, refetch } = useApi(
    () => marketing.flows.list(), [], { pollingInterval: 30000 }
  );
  const { data: summary } = useApi(
    () => marketing.campaigns.summary(), [], { pollingInterval: 60000 }
  );

  const allFlows = flows ?? [];
  const activeCount  = allFlows.filter(f => f.status === "active").length;
  const draftCount   = allFlows.filter(f => f.status === "draft").length;
  const pausedCount  = allFlows.filter(f => f.status === "paused").length;

  return (
    <div className="space-y-6">
      {showModal && <NewJourneyModal onClose={() => setShowModal(false)} onCreated={refetch} />}

      <PageHeader
        title="E.M.M.A."
        subtitle="Engagement Marketing Management Architecture — orchestrate, automate, and optimize customer journeys."
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            <Plus size={15} /> New Journey
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Active Journeys"  value={loading ? "…" : activeCount}                                   icon={Workflow} color="indigo" />
        <Stat label="Draft"            value={loading ? "…" : draftCount}                                    icon={GitBranch} color="sky" />
        <Stat label="Paused"           value={loading ? "…" : pausedCount}                                   icon={Pause}    color="amber" />
        <Stat label="Live Contacts"    value={loading ? "…" : (summary?.liveContacts ?? allFlows.reduce((s, f) => s + (f.enrolled ?? 0), 0))} icon={Users} color="emerald" />
      </div>

      <div className="flex flex-1 gap-4">
        {/* Journey List */}
        <div className={`${selectedJourney ? "w-80 shrink-0" : "flex-1"} transition-all duration-200`}>
          <Card className="h-full">
            <CardHeader title="All Journeys" icon={Workflow} />
            <CardBody className="p-0">
              {loading && allFlows.length === 0 ? (
                <div className="p-4 space-y-2 animate-pulse">
                  {[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded-lg" />)}
                </div>
              ) : allFlows.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-500 text-sm">
                  <Workflow size={28} className="mb-2 opacity-30" />
                  No journeys yet. Create your first one.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {allFlows.map(flow => (
                    <button
                      key={flow.id}
                      onClick={() => setSelectedJourney(selectedJourney?.id === flow.id ? null : flow)}
                      className={`w-full text-left px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group ${
                        selectedJourney?.id === flow.id ? "bg-violet-50 dark:bg-violet-500/5 border-l-2 border-violet-500" : "border-l-2 border-transparent"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{flow.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {flow.trigger ?? "—"} trigger · {flow.steps ?? 0} steps
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <StatusBadge label={flow.status ?? "draft"} variant={statusVariant[flow.status] ?? "neutral"} dot />
                          <ChevronRight size={13} className="text-slate-300 dark:text-slate-600 group-hover:text-violet-500 transition" />
                        </div>
                      </div>
                      {(flow.enrolled ?? 0) > 0 && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                          {flow.enrolled} enrolled · {flow.conversionRate ?? "—"} conversion
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Detail panel */}
        {selectedJourney && (
          <div className="flex-1">
            <Card className="h-full flex flex-col overflow-hidden">
              <JourneyDetail journey={selectedJourney} onClose={() => setSelectedJourney(null)} />
            </Card>
          </div>
        )}
      </div>

      {/* Capability overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Brain,      title: "AI Journey Optimizer",        desc: "Predictive path routing, send-time optimization, and uplift recommendations powered by ML." },
          { icon: Beaker,     title: "Experimentation & A/B",       desc: "Multi-variant experiments with traffic allocation and real-time statistical confidence scoring." },
          { icon: ShieldCheck, title: "Frequency & Consent Control", desc: "Enforce communication limits, global suppression, and regional compliance rules." },
        ].map(({ icon: Icon, title, desc }) => (
          <Card key={title}>
            <CardBody className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{desc}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
