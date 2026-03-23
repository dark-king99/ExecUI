import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { Plus, ArrowRight, Mail, MessageSquare, Globe, Zap, Save } from "lucide-react";

const steps = [
  { id: 1, type: "trigger",   label: "Trigger",         icon: Zap,          config: "Form submission on /demo" },
  { id: 2, type: "wait",      label: "Wait 1 hour",      icon: ArrowRight,   config: "Delay: 1h" },
  { id: 3, type: "email",     label: "Send Welcome Email",icon: Mail,        config: "Template: Welcome Series #1" },
  { id: 4, type: "condition", label: "Opened?",          icon: ArrowRight,   config: "If opened → continue; else → branch B" },
  { id: 5, type: "wait",      label: "Wait 2 days",      icon: ArrowRight,   config: "Delay: 2d" },
  { id: 6, type: "email",     label: "Send Follow-up",   icon: Mail,         config: "Template: Follow-up #1" },
  { id: 7, type: "sms",       label: "Send SMS Reminder",icon: MessageSquare,config: "Template: Demo reminder SMS" },
];

const typeColor = {
  trigger:   "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600",
  email:     "bg-sky-100    dark:bg-sky-900/30    border-sky-300    dark:border-sky-600",
  sms:       "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-600",
  wait:      "bg-slate-100  dark:bg-slate-800     border-slate-300  dark:border-slate-600",
  condition: "bg-amber-100  dark:bg-amber-900/30  border-amber-300  dark:border-amber-600",
};

const typeIconColor = {
  trigger: "text-indigo-600 dark:text-indigo-400",
  email:   "text-sky-600    dark:text-sky-400",
  sms:     "text-emerald-600 dark:text-emerald-400",
  wait:    "text-slate-400",
  condition: "text-amber-600 dark:text-amber-400",
};

export default function CampaignBuilder() {
  const [name, setName] = useState("New Campaign Flow");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaign Builder"
        subtitle="Design trigger-based automation flows with branching and suppression rules"
        actions={
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition">
            <Save size={15} /> Save & Activate
          </button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Flow canvas */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader title="Automation Flow" icon={Zap} actions={
              <button className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                <Plus size={13} /> Add Step
              </button>
            } />
            <CardBody>
              <div className="space-y-2">
                {steps.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.id}>
                      <div className={`flex items-center gap-3 p-3 rounded-xl border ${typeColor[step.type]}`}>
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center bg-white dark:bg-slate-900 ${typeIconColor[step.type]}`}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{step.label}</p>
                          <p className="text-xs text-slate-500">{step.config}</p>
                        </div>
                        <StatusBadge label={step.type} variant="neutral" />
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

              <button className="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center justify-center gap-2">
                <Plus size={16} /> Add Step
              </button>
            </CardBody>
          </Card>
        </div>

        {/* Settings panel */}
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
              {[["Enrolled", "1,240"], ["Active", "318"], ["Completed", "814"], ["Unsubscribed", "22"]].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{v}</span>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
