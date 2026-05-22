import { useState, useRef, useEffect } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { Plus, ArrowRight, Mail, MessageSquare, Globe, Zap, Save, AlertCircle, Loader2, Clock, GitBranch, X } from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { marketing } from "../../services/api";
import { useToast } from "../../components/ui/Toast";

const typeColor = {
  trigger:   "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600",
  email:     "bg-sky-100    dark:bg-sky-900/30    border-sky-300    dark:border-sky-600",
  sms:       "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-600",
  wait:      "bg-slate-100  dark:bg-slate-800     border-slate-300  dark:border-slate-600",
  condition: "bg-amber-100  dark:bg-amber-900/30  border-amber-300  dark:border-amber-600",
};

const typeIconColor = {
  trigger:   "text-indigo-600 dark:text-indigo-400",
  email:     "text-sky-600    dark:text-sky-400",
  sms:       "text-emerald-600 dark:text-emerald-400",
  wait:      "text-slate-400",
  condition: "text-amber-600 dark:text-amber-400",
};

const STEP_TYPES = [
  { type: "email",     label: "Send Email",   icon: Mail,          config: "Subject + body" },
  { type: "sms",       label: "Send SMS",     icon: MessageSquare, config: "SMS message" },
  { type: "wait",      label: "Wait / Delay", icon: Clock,         config: "1 day" },
  { type: "condition", label: "If / Else",    icon: GitBranch,     config: "Check condition" },
  { type: "trigger",   label: "Trigger",      icon: Zap,           config: "Entry trigger" },
];

const ICON_MAP = { Mail, MessageSquare, ArrowRight, Zap, Clock, GitBranch };

function AddStepPicker({ onAdd, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute z-30 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl w-52 py-1">
      {STEP_TYPES.map(({ type, label, icon: Icon }) => (
        <button
          key={type}
          onClick={() => { onAdd(type); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          <Icon size={15} className={typeIconColor[type]} />
          {label}
        </button>
      ))}
    </div>
  );
}

export default function CampaignBuilder() {
  const toast = useToast();
  const [name, setName] = useState("New Campaign Flow");
  const [selectedFlowId, setSelectedFlowId] = useState(null);
  const [localSteps, setLocalSteps] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [showHeaderPicker, setShowHeaderPicker] = useState(false);

  const { data: flows, loading: flowsLoading, error: flowsError } = useApi(
    () => marketing.flows.list(), [], { pollingInterval: 120000 }
  );

  const { data: flowDetail, loading: detailLoading } = useApi(
    () => selectedFlowId ? marketing.flows.get(selectedFlowId) : Promise.resolve(null),
    [selectedFlowId]
  );

  const { data: stats, loading: statsLoading } = useApi(
    () => selectedFlowId ? marketing.flows.stats(selectedFlowId) : Promise.resolve(null),
    [selectedFlowId]
  );

  const { mutate: createFlow, loading: creating } = useMutation(
    (data) => marketing.flows.create(data),
    {
      onSuccess: () => {
        toast({ message: "Flow saved and activated.", type: "success" });
        setLocalSteps([]);
      },
      onError: (err) => toast({ message: err?.message ?? "Failed to save flow", type: "error" }),
    }
  );

  const allFlows = flows ?? [];
  const serverSteps = Array.isArray(flowDetail?.steps) ? flowDetail.steps : [];
  const steps = [...serverSteps, ...localSteps];

  function addStep(type) {
    const def = STEP_TYPES.find(s => s.type === type) ?? STEP_TYPES[0];
    setLocalSteps(prev => [
      ...prev,
      { id: `local-${Date.now()}`, type: def.type, label: def.label, config: def.config, icon: def.icon.displayName ?? "Mail" },
    ]);
  }

  function removeStep(id) {
    setLocalSteps(prev => prev.filter(s => s.id !== id));
  }

  function handleSave() {
    createFlow({ name, trigger: "form_submission", steps: localSteps });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaign Builder"
        subtitle="Design trigger-based automation flows with branching and suppression rules"
        actions={
          <button
            onClick={handleSave}
            disabled={creating}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition disabled:opacity-60"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Save size={15} />} Save & Activate
          </button>
        }
      />

      {flowsError && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {flowsError}
        </div>
      )}

      {allFlows.length > 1 && (
        <div className="flex items-center gap-2">
          <select
            className="px-3 py-2 rounded border bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
            value={selectedFlowId ?? ""}
            onChange={e => setSelectedFlowId(e.target.value || null)}
          >
            <option value="">New Flow</option>
            {allFlows.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Card>
            <CardHeader title="Automation Flow" icon={Zap} actions={
              <div className="relative">
                <button
                  onClick={() => setShowHeaderPicker(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <Plus size={13} /> Add Step
                </button>
                {showHeaderPicker && (
                  <AddStepPicker onAdd={addStep} onClose={() => setShowHeaderPicker(false)} />
                )}
              </div>
            } />
            <CardBody>
              {detailLoading && steps.length === 0 && (
                <div className="space-y-2 animate-pulse">
                  {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
                </div>
              )}
              {!detailLoading && steps.length === 0 && !flowsError && (
                <p className="text-sm text-slate-500 text-center py-4">No steps yet. Add a step to begin.</p>
              )}

              <div className="space-y-2">
                {steps.map((step, i) => {
                  const Icon = ICON_MAP[step.icon] ?? ArrowRight;
                  const isLocal = String(step.id ?? "").startsWith("local-");
                  return (
                    <div key={step.id ?? i}>
                      <div className={`flex items-center gap-3 p-3 rounded-xl border ${typeColor[step.type] ?? typeColor.wait}`}>
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center bg-white dark:bg-slate-900 ${typeIconColor[step.type] ?? "text-slate-400"}`}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{step.label}</p>
                          <p className="text-xs text-slate-500">{step.config}</p>
                        </div>
                        <StatusBadge label={step.type} variant="neutral" />
                        {isLocal && (
                          <button
                            onClick={() => removeStep(step.id)}
                            className="ml-1 text-slate-400 hover:text-red-500 transition"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      {i < steps.length - 1 && (
                        <div className="flex justify-center py-1">
                          <div className="w-px h-4 bg-slate-300 dark:bg-slate-600" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="relative mt-4">
                <button
                  onClick={() => setShowPicker(v => !v)}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Add Step
                </button>
                {showPicker && (
                  <AddStepPicker onAdd={addStep} onClose={() => setShowPicker(false)} />
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Flow Settings" icon={Globe} />
            <CardBody className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Campaign Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Trigger Type</label>
                <select className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option>Form Submission</option>
                  <option>Page Visit</option>
                  <option>Tag Applied</option>
                  <option>Deal Stage Change</option>
                  <option>Manual</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Suppression List</label>
                <select className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option>Unsubscribed</option>
                  <option>Bounced</option>
                  <option>Active Customers</option>
                </select>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm text-slate-700 dark:text-slate-300">Enable A/B testing</span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Flow Stats" icon={Zap} />
            <CardBody className="space-y-3 text-sm">
              {statsLoading && (
                <div className="space-y-2 animate-pulse">
                  {[1,2,3,4].map(i => <div key={i} className="h-5 bg-slate-100 dark:bg-slate-700 rounded" />)}
                </div>
              )}
              {!statsLoading && stats && (
                Object.entries(stats).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-500 capitalize">{k}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{String(v)}</span>
                  </div>
                ))
              )}
              {!statsLoading && !stats && !selectedFlowId && (
                <p className="text-xs text-slate-400">Save a flow to see stats.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
