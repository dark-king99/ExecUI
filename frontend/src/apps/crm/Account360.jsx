import { useMemo, useState } from "react";
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Phone,
  Calendar,
  FileText,
  Activity,
  Plus,
  History,
  Target,
} from "lucide-react";

// --- Mock Account (mirrors real CRM shape) ---
const ACCOUNT = {
  id: "A-8891",
  name: "Acme Industries",
  segment: "Enterprise",
  owner: "Alice Johnson",
  health: "attention", // ok | attention
  renewalDate: "2026-07-01",
  arr: 420000,
  expansionPotential: 180000,
  contacts: [
    { name: "John Miller", role: "CTO", email: "john@acme.com", phone: "+1 555 221 9911" },
    { name: "Sara Lee", role: "Procurement", email: "sara@acme.com", phone: "+1 555 882 4411" },
    { name: "Liam Chen", role: "Security Lead", email: "liam@acme.com", phone: "+1 555 111 7766" },
  ],
};

const DEALS = [
  { id: 1, name: "Platform Rollout", stage: "Negotiation", value: 120000, probability: 0.75 },
  { id: 2, name: "Security Add-on", stage: "Proposal", value: 80000, probability: 0.6 },
  { id: 3, name: "Support Upgrade", stage: "Won", value: 50000, probability: 1 },
];

const TIMELINE = [
  { id: 1, ts: "2026-02-22", type: "email", text: "Sent revised pricing proposal" },
  { id: 2, ts: "2026-02-21", type: "meeting", text: "Quarterly business review" },
  { id: 3, ts: "2026-02-20", type: "call", text: "Discussed security roadmap" },
  { id: 4, ts: "2026-02-18", type: "note", text: "Customer concerned about support SLA" },
];

const TYPE_ICON = {
  email: Mail,
  call: Phone,
  meeting: Calendar,
  note: FileText,
};

function currency(n) {
  return `$${n.toLocaleString()}`;
}

export default function Account360() {
  const [notes, setNotes] = useState("");
  const [activity, setActivity] = useState(TIMELINE);

  const metrics = useMemo(() => {
    const openDeals = DEALS.filter((d) => d.stage !== "Won");
    const pipelineValue = openDeals.reduce((s, d) => s + d.value, 0);
    const weighted = openDeals.reduce((s, d) => s + d.value * d.probability, 0);
    const wonValue = DEALS.filter((d) => d.stage === "Won").reduce((s, d) => s + d.value, 0);
    return { pipelineValue, weighted, wonValue };
  }, []);

  const addNote = () => {
    if (!notes.trim()) return;
    setActivity((prev) => [
      { id: Date.now(), ts: new Date().toISOString().slice(0, 10), type: "note", text: notes },
      ...prev,
    ]);
    setNotes("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          {ACCOUNT.name}
        </h1>
        <p className="text-slate-500">
          Account ID {ACCOUNT.id} · Segment: {ACCOUNT.segment} · Owner: {ACCOUNT.owner}
        </p>
      </div>

      {/* Executive KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPI icon={DollarSign} label="Current ARR" value={currency(ACCOUNT.arr)} />
        <KPI icon={TrendingUp} label="Open Pipeline" value={currency(metrics.pipelineValue)} />
        <KPI icon={Target} label="Weighted Forecast" value={currency(Math.round(metrics.weighted))} />
        <KPI icon={DollarSign} label="Expansion Potential" value={currency(ACCOUNT.expansionPotential)} />
      </div>

      {/* Health + Renewal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Account Health">
          {ACCOUNT.health === "attention" ? (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Attention required — risk signals detected
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              Healthy — no major risks detected
            </div>
          )}
        </Panel>
        <Panel title="Renewal & Lifecycle">
          <div className="text-sm">
            <div>Renewal Date: <strong>{ACCOUNT.renewalDate}</strong></div>
            <div className="text-slate-500 mt-1">Proactive renewal planning recommended</div>
          </div>
        </Panel>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Contacts + Deals */}
        <div className="space-y-6">
          <Panel title="Stakeholders & Contacts" icon={Users}>
            <div className="space-y-2">
              {ACCOUNT.contacts.map((c) => (
                <div key={c.email} className="rounded border p-3">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.role}</div>
                  <div className="text-xs text-slate-500">{c.email} · {c.phone}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Deals & Opportunities" icon={TrendingUp}>
            <div className="space-y-2">
              {DEALS.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded border p-3 text-sm">
                  <div>
                    <div className="font-medium">{d.name}</div>
                    <div className="text-xs text-slate-500">Stage: {d.stage}</div>
                  </div>
                  <div className="text-right">
                    <div>{currency(d.value)}</div>
                    <div className="text-xs text-slate-500">{Math.round(d.probability * 100)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Center: Unified Activity Timeline */}
        <Panel title="Unified Account Timeline" icon={Activity} className="lg:col-span-1">
          <div className="space-y-3">
            {activity.map((e) => {
              const Icon = TYPE_ICON[e.type] || History;
              return (
                <div key={e.id} className="rounded border p-3 bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="flex items-center gap-1">
                      <Icon className="h-4 w-4" /> {e.type}
                    </span>
                    <span>{e.ts}</span>
                  </div>
                  <div className="text-sm">{e.text}</div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Right: Notes + Actions */}
        <div className="space-y-6">
          <Panel title="Account Notes & Actions">
            <div className="flex gap-2 mb-3">
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add note or action…"
                className="flex-1 px-3 py-2 rounded border bg-white dark:bg-slate-900 text-sm"
              />
              <button
                onClick={addNote}
                className="px-3 py-2 rounded bg-indigo-600 text-white text-sm flex items-center gap-1"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            <div className="text-sm text-slate-500">
              Notes appear in the unified timeline and audit trail.
            </div>
          </Panel>

          <Panel title="Expansion & Growth Signals">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Cross-sell opportunities</span>
                <span className="font-medium">Security, Analytics</span>
              </div>
              <div className="flex justify-between">
                <span>Upsell potential</span>
                <span className="font-medium">{currency(ACCOUNT.expansionPotential)}</span>
              </div>
              <div className="flex justify-between">
                <span>Engagement trend</span>
                <span className="font-medium text-emerald-600">Positive</span>
              </div>
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