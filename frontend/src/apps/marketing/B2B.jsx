import { useState, useMemo } from "react";
import {
  Building2,
  Users,
  Mail,
  Workflow,
  BarChart3,
  Target,
  Bot,
  ShieldCheck,
  PlayCircle,
  PauseCircle,
  Plus,
  Search,
  Settings,
  FileText,
} from "lucide-react";

// ---- MOCK ENTERPRISE DATA ----
const MOCK_ACCOUNTS = [
  { id: "A-001", name: "Acme Industries", tier: "Tier 1", intent: "High", pipeline: "$420k", status: "Active" },
  { id: "A-002", name: "Nova Retail", tier: "Tier 2", intent: "Medium", pipeline: "$180k", status: "Active" },
  { id: "A-003", name: "Atlas Energy", tier: "Tier 1", intent: "High", pipeline: "$760k", status: "Paused" },
];

const MOCK_JOURNEYS = [
  { id: "J-01", name: "Enterprise ABM Nurture", channels: ["Email", "LinkedIn", "Web"], status: "Running" },
  { id: "J-02", name: "Reactivation Play", channels: ["Email", "Ads"], status: "Paused" },
];

export default function B2BMarketing() {
  const [tab, setTab] = useState("dashboard");
  const [query, setQuery] = useState("");
  const [selectedAccount, setSelectedAccount] = useState(null);

  const filteredAccounts = useMemo(() => {
    return MOCK_ACCOUNTS.filter((a) =>
      a.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">B2B Marketing Automation</h1>
          <p className="text-slate-500">
            Account-based orchestration, journeys, revenue attribution, and growth automation
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded border flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Journey
          </button>
          <button className="px-3 py-2 rounded border flex items-center gap-2">
            <Settings className="h-4 w-4" /> Settings
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { id: "dashboard", label: "Dashboard", icon: BarChart3 },
          { id: "accounts", label: "Target Accounts", icon: Building2 },
          { id: "journeys", label: "Journeys & Automation", icon: Workflow },
          { id: "channels", label: "Channels", icon: Mail },
          { id: "ai", label: "AI & Scoring", icon: Bot },
          { id: "reports", label: "Reports & Attribution", icon: FileText },
          { id: "compliance", label: "Compliance", icon: ShieldCheck },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2 text-sm border-b-2 ${
              tab === t.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {tab === "dashboard" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPI title="Target Accounts" value="128" icon={Building2} />
          <KPI title="Active Journeys" value="12" icon={Workflow} />
          <KPI title="Pipeline Influenced" value="$4.2M" icon={Target} />
          <KPI title="Revenue Attributed" value="$1.6M" icon={BarChart3} />

          <div className="md:col-span-4 rounded-xl border p-4 bg-white dark:bg-slate-900">
            <div className="font-medium mb-2">Performance Overview</div>
            <div className="h-32 flex items-center justify-center text-slate-400 text-sm">
              Funnel, pipeline, and attribution charts placeholder
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNTS */}
      {tab === "accounts" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border bg-white dark:bg-slate-900">
            <div className="p-3 border-b flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search accounts..."
                className="flex-1 outline-none text-sm bg-transparent"
              />
            </div>

            <div className="divide-y">
              {filteredAccounts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAccount(a)}
                  className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs text-slate-500">
                        {a.tier} • Intent: {a.intent}
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">{a.status}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Pipeline influenced: {a.pipeline}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-white dark:bg-slate-900 p-4">
            {!selectedAccount ? (
              <div className="text-sm text-slate-500">Select an account</div>
            ) : (
              <div className="space-y-3">
                <div className="font-semibold text-lg">{selectedAccount.name}</div>
                <div className="text-sm"><strong>Tier:</strong> {selectedAccount.tier}</div>
                <div className="text-sm"><strong>Intent:</strong> {selectedAccount.intent}</div>
                <div className="text-sm"><strong>Status:</strong> {selectedAccount.status}</div>
                <div className="text-sm"><strong>Pipeline:</strong> {selectedAccount.pipeline}</div>

                <div className="pt-2 flex gap-2">
                  <button className="px-3 py-1 rounded border text-sm">View Journey</button>
                  <button className="px-3 py-1 rounded border text-sm">Edit Targeting</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* JOURNEYS */}
      {tab === "journeys" && (
        <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 space-y-3">
          <div className="font-medium">Journeys & Automation</div>
          <div className="divide-y">
            {MOCK_JOURNEYS.map((j) => (
              <div key={j.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{j.name}</div>
                  <div className="text-xs text-slate-500">
                    Channels: {j.channels.join(", ")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {j.status === "Running" ? (
                    <PlayCircle className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <PauseCircle className="h-5 w-5 text-amber-600" />
                  )}
                  <span className="text-sm">{j.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CHANNELS */}
      {tab === "channels" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ChannelCard title="Email" />
          <ChannelCard title="LinkedIn Ads" />
          <ChannelCard title="Display Ads" />
          <ChannelCard title="Website Personalization" />
        </div>
      )}

      {/* AI */}
      {tab === "ai" && (
        <div className="rounded-xl border p-4 bg-white dark:bg-slate-900 space-y-2">
          <div className="font-medium">AI Scoring & Recommendations</div>
          <ul className="text-sm text-slate-600 list-disc ml-5 space-y-1">
            <li>Account intent scoring</li>
            <li>Buying committee engagement heatmaps</li>
            <li>Next-best-action recommendations</li>
            <li>Send-time optimization</li>
            <li>Journey optimization suggestions</li>
          </ul>
        </div>
      )}

      {/* REPORTS */}
      {tab === "reports" && (
        <div className="rounded-xl border p-4 bg-white dark:bg-slate-900 space-y-2">
          <div className="font-medium">Reports & Revenue Attribution</div>
          <ul className="text-sm text-slate-600 list-disc ml-5 space-y-1">
            <li>Multi-touch attribution</li>
            <li>Pipeline influence by channel</li>
            <li>Account engagement trends</li>
            <li>Campaign ROI</li>
            <li>Journey performance</li>
          </ul>
        </div>
      )}

      {/* COMPLIANCE */}
      {tab === "compliance" && (
        <div className="rounded-xl border p-4 bg-white dark:bg-slate-900 space-y-2">
          <div className="font-medium">Compliance & Governance</div>
          <ul className="text-sm text-slate-600 list-disc ml-5 space-y-1">
            <li>Consent & preference management</li>
            <li>GDPR / CAN-SPAM compliance</li>
            <li>Audit trail of all sends</li>
            <li>Suppression lists</li>
            <li>Data residency controls</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function KPI({ title, value, icon: Icon }) {
  return (
    <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
        <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div>
        <div className="text-xs text-slate-500">{title}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    </div>
  );
}

function ChannelCard({ title }) {
  return (
    <div className="rounded-xl border bg-white dark:bg-slate-900 p-4">
      <div className="font-medium">{title}</div>
      <div className="text-sm text-slate-500 mt-1">
        Orchestrate campaigns and personalization
      </div>
      <button className="mt-3 px-3 py-1 rounded border text-sm">
        Configure
      </button>
    </div>
  );
}