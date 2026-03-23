import { useMemo, useState } from "react";
import {
  DollarSign,
  Target,
  CalendarClock,
  Users,
  Mail,
  Phone,
  MessageSquare,
  Share2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  FileText,
  History,
  Plus,
} from "lucide-react";

// --- Mock Deal (shape mirrors real CRM object) ---
const DEAL = {
  id: "D-1042",
  name: "Acme Industries — Platform Rollout",
  owner: "Alice Johnson",
  stage: "Negotiation",
  value: 120000,
  probability: 0.75,
  forecastCategory: "Commit",
  ageDays: 41,
  daysInStage: 12,
  closeDate: "2026-03-20",
  riskLevel: "attention", // "ok" | "attention"
  account: "Acme Industries",
  contacts: [
    { name: "John Miller", role: "CTO", email: "john@acme.com" },
    { name: "Sara Lee", role: "Procurement", email: "sara@acme.com" },
  ],
};

// --- Unified Timeline (deal-scoped) ---
const TIMELINE = [
  {
    id: 1,
    ts: "2026-02-22 09:14",
    type: "email",
    title: "Re: Q2 Pricing Proposal",
    summary: "Asked for volume tiers and 24-month option.",
  },
  {
    id: 2,
    ts: "2026-02-21 16:10",
    type: "meeting",
    title: "Negotiation Call",
    summary: "Discussed security add-ons and support SLA.",
  },
  {
    id: 3,
    ts: "2026-02-20 14:02",
    type: "campaign",
    title: "Case Study Sent",
    summary: "Shared enterprise security case study.",
  },
  {
    id: 4,
    ts: "2026-02-18 11:33",
    type: "call",
    title: "Follow-up Call",
    summary: "Confirmed stakeholders and approval flow.",
  },
];

const TYPE_META = {
  email: { icon: Mail, cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
  call: { icon: Phone, cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  chat: { icon: MessageSquare, cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
  social: { icon: Share2, cls: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300" },
  meeting: { icon: Calendar, cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  campaign: { icon: FileText, cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
};

// --- Tasks / Next Actions ---
const INITIAL_TASKS = [
  { id: 1, title: "Send revised pricing", done: false },
  { id: 2, title: "Schedule exec sponsor call", done: false },
  { id: 3, title: "Confirm legal terms", done: true },
];

// --- Audit Trail ---
const AUDIT = [
  { id: 1, ts: "2026-02-21 16:20", text: "Stage changed to Negotiation by Alice Johnson" },
  { id: 2, ts: "2026-02-20 14:10", text: "Forecast category set to Commit" },
  { id: 3, ts: "2026-02-18 11:40", text: "Value updated to $120,000" },
];

function currency(n) {
  return `$${n.toLocaleString()}`;
}

export default function DealCommandCenter() {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [newTask, setNewTask] = useState("");

  const weighted = useMemo(() => Math.round(DEAL.value * DEAL.probability), []);

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks((prev) => [
      { id: Date.now(), title: newTask, done: false },
      ...prev,
    ]);
    setNewTask("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">{DEAL.name}</h1>
        <p className="text-slate-500">
          Deal ID {DEAL.id} · Account: {DEAL.account}
        </p>
      </div>

      {/* Executive KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPI icon={DollarSign} label="Deal Value" value={currency(DEAL.value)} />
        <KPI icon={Target} label="Probability" value={`${Math.round(DEAL.probability * 100)}%`} />
        <KPI icon={TrendingUp} label="Weighted Forecast" value={currency(weighted)} />
        <KPI icon={CalendarClock} label="Age (days)" value={DEAL.ageDays} />
        <KPI icon={CalendarClock} label="Close Date" value={DEAL.closeDate} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Deal Overview + Stakeholders */}
        <div className="space-y-6">
          <Panel title="Deal Overview">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Owner" value={DEAL.owner} />
              <Field label="Stage" value={DEAL.stage} />
              <Field label="Forecast Category" value={DEAL.forecastCategory} />
              <Field label="Days in Stage" value={DEAL.daysInStage} />
              <Field label="Risk">
                {DEAL.riskLevel === "attention" ? (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" /> Attention
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> Healthy
                  </span>
                )}
              </Field>
            </div>
          </Panel>

          <Panel title="Stakeholders & Contacts" icon={Users}>
            <div className="space-y-2">
              {DEAL.contacts.map((c) => (
                <div
                  key={c.email}
                  className="flex items-center justify-between rounded border p-3"
                >
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-slate-500">{c.role}</div>
                  </div>
                  <div className="text-xs text-slate-500">{c.email}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Center: Unified Timeline */}
        <Panel title="Deal Activity Timeline" className="lg:col-span-1">
          <div className="space-y-3">
            {TIMELINE.map((e) => {
              const meta = TYPE_META[e.type] || TYPE_META.email;
              const Icon = meta.icon;
              return (
                <div key={e.id} className="rounded border p-3 bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${meta.cls}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {e.type}
                    </span>
                    <span className="text-xs text-slate-500">{e.ts}</span>
                  </div>
                  <div className="font-medium text-sm">{e.title}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {e.summary}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Right: Next Actions + Forecast Impact + Audit */}
        <div className="space-y-6">
          <Panel title="Next Actions">
            <div className="flex gap-2 mb-3">
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add next action…"
                className="flex-1 px-3 py-2 rounded border bg-white dark:bg-slate-900 text-sm"
              />
              <button
                onClick={addTask}
                className="px-3 py-2 rounded bg-indigo-600 text-white text-sm flex items-center gap-1"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() => toggleTask(t.id)}
                  />
                  <span className={t.done ? "line-through text-slate-400" : ""}>
                    {t.title}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Forecast Impact">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Deal Value</span>
                <span className="font-medium">{currency(DEAL.value)}</span>
              </div>
              <div className="flex justify-between">
                <span>Probability</span>
                <span className="font-medium">{Math.round(DEAL.probability * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Weighted Impact</span>
                <span className="font-medium">{currency(weighted)}</span>
              </div>
              <div className="flex justify-between">
                <span>Forecast Category</span>
                <span className="font-medium">{DEAL.forecastCategory}</span>
              </div>
            </div>
          </Panel>

          <Panel title="Audit Trail" icon={History}>
            <div className="space-y-2 text-sm">
              {AUDIT.map((a) => (
                <div key={a.id} className="text-slate-600 dark:text-slate-400">
                  <div className="text-xs text-slate-500">{a.ts}</div>
                  <div>{a.text}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
        <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children, className = "" }) {
  return (
    <div className={`rounded-xl border bg-white dark:bg-slate-900 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
        <div className="font-semibold">{title}</div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, children }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-medium">{children || value}</div>
    </div>
  );
}