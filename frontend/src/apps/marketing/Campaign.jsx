import { useMemo, useState } from "react";
import {
  Megaphone,
  Plus,
  Search,
  Calendar,
  Users,
  Target,
  BarChart3,
  DollarSign,
  Mail,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  Settings,
  ShieldCheck,
  FileText,
  ArrowUpRight,
} from "lucide-react";

// ---- MOCK ENTERPRISE DATA ----
const MOCK_CAMPAIGNS = [
  {
    id: "CMP-001",
    name: "Q4 Enterprise ABM Push",
    objective: "Pipeline Growth",
    owner: "Marketing Ops",
    status: "Running",
    budget: 120000,
    spend: 54000,
    channels: ["Email", "LinkedIn", "Web"],
    start: "2026-10-01",
    end: "2026-12-31",
    influencedPipeline: 840000,
    attributedRevenue: 210000,
    approvalsRequired: false,
  },
  {
    id: "CMP-002",
    name: "Product Launch: Nova",
    objective: "Demand Gen",
    owner: "Growth Team",
    status: "Paused",
    budget: 80000,
    spend: 23000,
    channels: ["Email", "Ads"],
    start: "2026-08-01",
    end: "2026-09-30",
    influencedPipeline: 320000,
    attributedRevenue: 74000,
    approvalsRequired: true,
  },
];

export default function Campaign() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("overview");

  const filtered = useMemo(() => {
    return MOCK_CAMPAIGNS.filter((c) =>
      c.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  const totals = useMemo(() => {
    const budget = MOCK_CAMPAIGNS.reduce((s, c) => s + c.budget, 0);
    const spend = MOCK_CAMPAIGNS.reduce((s, c) => s + c.spend, 0);
    const pipeline = MOCK_CAMPAIGNS.reduce((s, c) => s + c.influencedPipeline, 0);
    const revenue = MOCK_CAMPAIGNS.reduce((s, c) => s + c.attributedRevenue, 0);
    return { budget, spend, pipeline, revenue };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Megaphone className="h-6 w-6" />
            Campaign Management
          </h1>
          <p className="text-slate-500">
            Plan, execute, govern, and measure enterprise marketing campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded border flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Campaign
          </button>
          <button className="px-3 py-2 rounded border flex items-center gap-2">
            <Settings className="h-4 w-4" /> Settings
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPI title="Total Budget" value={`$${totals.budget.toLocaleString()}`} icon={DollarSign} />
        <KPI title="Total Spend" value={`$${totals.spend.toLocaleString()}`} icon={DollarSign} />
        <KPI title="Pipeline Influenced" value={`$${totals.pipeline.toLocaleString()}`} icon={Target} />
        <KPI title="Revenue Attributed" value={`$${totals.revenue.toLocaleString()}`} icon={BarChart3} />
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign List */}
        <div className="lg:col-span-2 rounded-xl border bg-white dark:bg-slate-900">
          <div className="p-3 border-b flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search campaigns..."
              className="flex-1 outline-none text-sm bg-transparent"
            />
          </div>

          <div className="divide-y">
            {filtered.map((c) => {
              const progress = Math.min(100, Math.round((c.spend / c.budget) * 100));
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelected(c);
                    setTab("overview");
                  }}
                  className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-slate-500">
                        {c.objective} • Owner: {c.owner}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {c.status === "Running" ? (
                        <PlayCircle className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <PauseCircle className="h-4 w-4 text-amber-600" />
                      )}
                      {c.status}
                    </div>
                  </div>

                  <div className="mt-2 h-2 bg-slate-200 rounded">
                    <div
                      className="h-2 rounded bg-indigo-600"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Spend ${c.spend.toLocaleString()} / ${c.budget.toLocaleString()}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Panel */}
        <div className="rounded-xl border bg-white dark:bg-slate-900 p-4">
          {!selected ? (
            <div className="text-sm text-slate-500">Select a campaign</div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="font-semibold text-lg">{selected.name}</div>
                <div className="text-sm text-slate-500">{selected.objective}</div>
              </div>

              {/* Sub Tabs */}
              <div className="flex gap-2 border-b text-sm">
                {[
                  { id: "overview", label: "Overview" },
                  { id: "targeting", label: "Targeting" },
                  { id: "channels", label: "Channels" },
                  { id: "budget", label: "Budget" },
                  { id: "performance", label: "Performance" },
                  { id: "governance", label: "Governance" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`pb-2 ${
                      tab === t.id
                        ? "border-b-2 border-indigo-600 text-indigo-600"
                        : "text-slate-500"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Overview */}
              {tab === "overview" && (
                <div className="space-y-2 text-sm">
                  <div><strong>Status:</strong> {selected.status}</div>
                  <div><strong>Owner:</strong> {selected.owner}</div>
                  <div><strong>Timeline:</strong> {selected.start} → {selected.end}</div>
                  <div><strong>Channels:</strong> {selected.channels.join(", ")}</div>
                  <div className="pt-2 flex gap-2">
                    <button className="px-3 py-1 rounded border text-sm flex items-center gap-1">
                      <PlayCircle className="h-4 w-4" /> Start
                    </button>
                    <button className="px-3 py-1 rounded border text-sm flex items-center gap-1">
                      <PauseCircle className="h-4 w-4" /> Pause
                    </button>
                  </div>
                </div>
              )}

              {/* Targeting */}
              {tab === "targeting" && (
                <div className="space-y-2 text-sm">
                  <div className="font-medium flex items-center gap-1">
                    <Users className="h-4 w-4" /> Target Accounts & Personas
                  </div>
                  <ul className="list-disc ml-5 text-slate-600">
                    <li>Enterprise Accounts (Tier 1)</li>
                    <li>Buying Committees: CIO, VP IT, Ops</li>
                    <li>Intent: High / Medium</li>
                    <li>Regions: North America, EU</li>
                  </ul>
                </div>
              )}

              {/* Channels */}
              {tab === "channels" && (
                <div className="space-y-2 text-sm">
                  <div className="font-medium flex items-center gap-1">
                    <Mail className="h-4 w-4" /> Active Channels
                  </div>
                  <ul className="list-disc ml-5 text-slate-600">
                    {selected.channels.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Budget */}
              {tab === "budget" && (
                <div className="space-y-2 text-sm">
                  <div><strong>Total Budget:</strong> ${selected.budget.toLocaleString()}</div>
                  <div><strong>Spent:</strong> ${selected.spend.toLocaleString()}</div>
                  <div>
                    <strong>Remaining:</strong>{" "}
                    ${(selected.budget - selected.spend).toLocaleString()}
                  </div>
                </div>
              )}

              {/* Performance */}
              {tab === "performance" && (
                <div className="space-y-2 text-sm">
                  <div><strong>Pipeline Influenced:</strong> ${selected.influencedPipeline.toLocaleString()}</div>
                  <div><strong>Revenue Attributed:</strong> ${selected.attributedRevenue.toLocaleString()}</div>
                  <div className="flex items-center gap-1 text-indigo-600">
                    <ArrowUpRight className="h-4 w-4" /> View detailed attribution report
                  </div>
                </div>
              )}

              {/* Governance */}
              {tab === "governance" && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4" />
                    Compliance & Approvals
                  </div>
                  {selected.approvalsRequired ? (
                    <div className="p-2 bg-amber-100 text-amber-700 rounded">
                      Approval required before launch
                    </div>
                  ) : (
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> Approved & compliant
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-sm">
                    <FileText className="h-4 w-4" /> Audit trail available
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
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