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
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { useToast } from "../../components/ui/Toast";
import { marketing } from "../../services/api";

export default function B2BMarketing() {
  const toast = useToast();
  const [tab, setTab] = useState("dashboard");
  const [query, setQuery] = useState("");
  const [selectedAccount, setSelectedAccount] = useState(null);

  const { data: accounts, loading: acctLoading, error: acctError } = useApi(
    () => marketing.b2b.accounts.list({ limit: 100 }), [], { pollingInterval: 60000 }
  );
  const { data: journeys, loading: jLoading, error: jError } = useApi(
    () => marketing.b2b.journeys.list(), [], { pollingInterval: 60000 }
  );
  const { data: summary, loading: sumLoading } = useApi(
    () => marketing.analytics.summary(), [], { pollingInterval: 60000 }
  );

  const allAccounts = accounts ?? [];
  const allJourneys = journeys ?? [];

  const filteredAccounts = useMemo(() =>
    allAccounts.filter(a => a.name.toLowerCase().includes(query.toLowerCase())),
    [allAccounts, query]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className=" text-slate-900 dark:text-white text-2xl font-semibold">B2B Marketing Automation</h1>
          <p className="text-slate-300">
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

      <div className="flex text-slate-900 dark:text-white gap-2 border-b">
        {[
          { id: "dashboard",  label: "Dashboard",           icon: BarChart3 },
          { id: "accounts",   label: "Target Accounts",     icon: Building2 },
          { id: "journeys",   label: "Journeys & Automation",icon: Workflow },
          { id: "channels",   label: "Channels",            icon: Mail },
          { id: "ai",         label: "AI & Scoring",        icon: Bot },
          { id: "reports",    label: "Reports & Attribution",icon: FileText },
          { id: "compliance", label: "Compliance",          icon: ShieldCheck },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2 text-sm border-b-2 ${
              tab === t.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-300 hover:text-slate-800"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPI title="Target Accounts"    value={sumLoading ? "…" : (summary?.targetAccounts ?? allAccounts.length)} icon={Building2} />
          <KPI title="Active Journeys"    value={sumLoading ? "…" : (summary?.activeJourneys ?? allJourneys.filter(j => j.status === "Running").length)} icon={Workflow} />
          <KPI title="Pipeline Influenced" value={sumLoading ? "…" : (summary?.pipelineInfluenced ?? "—")} icon={Target} />
          <KPI title="Revenue Attributed"  value={sumLoading ? "…" : (summary?.revenueAttributed ?? "—")} icon={BarChart3} />

          <div className="md:col-span-4 rounded-xl border p-4 bg-white dark:bg-slate-900">
            <div className=" text-slate-900 dark:text-white font-medium mb-2">Performance Overview</div>
            <div className="h-32 flex items-center justify-center text-slate-300 text-sm">
              Connect analytics endpoints to render funnel and attribution charts
            </div>
          </div>
        </div>
      )}

      {tab === "accounts" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border bg-white dark:bg-slate-900">
            <div className="p-3 border-b flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-300" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search accounts..."
                className="flex-1 outline-none text-sm bg-transparent"
              />
            </div>

            {acctError && (
              <div className="p-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle size={14} /> {acctError}
              </div>
            )}

            {acctLoading && allAccounts.length === 0 && (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="animate-spin text-slate-400" />
              </div>
            )}

            {!acctLoading && filteredAccounts.length === 0 && !acctError && (
              <p className="text-sm text-slate-300 text-center py-6">No accounts found.</p>
            )}

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
                      <div className="text-xs text-slate-300">
                        {a.tier} • Intent: {a.intent}
                      </div>
                    </div>
                    <span className="text-xs text-slate-300">{a.status}</span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    Pipeline influenced: {a.pipeline ?? a.pipelineFormatted ?? "—"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4">
            {!selectedAccount ? (
              <div className="text-sm text-slate-300">Select an account</div>
            ) : (
              <div className="space-y-3">
                <div className="font-semibold text-lg">{selectedAccount.name}</div>
                <div className="text-sm"><strong>Tier:</strong> {selectedAccount.tier}</div>
                <div className="text-sm"><strong>Intent:</strong> {selectedAccount.intent}</div>
                <div className="text-sm"><strong>Status:</strong> {selectedAccount.status}</div>
                <div className="text-sm"><strong>Pipeline:</strong> {selectedAccount.pipeline ?? selectedAccount.pipelineFormatted ?? "—"}</div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => setTab("journeys")}
                    className="px-3 py-1 rounded border text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    View Journey
                  </button>
                  <button
                    onClick={() => toast({ message: `Targeting updated for ${selectedAccount.name}.`, type: "info" })}
                    className="px-3 py-1 rounded border text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    Edit Targeting
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "journeys" && (
        <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 space-y-3">
          <div className="text-slate-900 dark:text-white font-medium">Journeys & Automation</div>

          {jError && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle size={14} /> {jError}
            </div>
          )}

          {jLoading && allJourneys.length === 0 && (
            <div className="flex justify-center py-4">
              <Loader2 size={18} className="animate-spin text-slate-300" />
            </div>
          )}

          {!jLoading && allJourneys.length === 0 && !jError && (
            <p className="text-sm text-slate-300">No journeys found.</p>
          )}

          <div className="divide-y">
            {allJourneys.map((j) => (
              <div key={j.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{j.name}</div>
                  <div className="text-xs text-slate-300">
                    Channels: {Array.isArray(j.channels) ? j.channels.join(", ") : j.channels}
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

      {tab === "channels" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ChannelCard title="Email" />
          <ChannelCard title="LinkedIn Ads" />
          <ChannelCard title="Display Ads" />
          <ChannelCard title="Website Personalization" />
        </div>
      )}

      {tab === "ai" && (
        <div className="rounded-xl border p-4 bg-white dark:bg-slate-900 space-y-2">
          <div className="text-slate-900 dark:text-white font-medium">AI Scoring & Recommendations</div>
          <ul className="text-sm text-slate-300 list-disc ml-5 space-y-1">
            <li>Account intent scoring</li>
            <li>Buying committee engagement heatmaps</li>
            <li>Next-best-action recommendations</li>
            <li>Send-time optimization</li>
            <li>Journey optimization suggestions</li>
          </ul>
        </div>
      )}

      {tab === "reports" && (
        <div className="rounded-xl border p-4 bg-white dark:bg-slate-900 space-y-2">
          <div className="font-medium">Reports & Revenue Attribution</div>
          <ul className="text-sm text-slate-300 list-disc ml-5 space-y-1">
            <li>Multi-touch attribution</li>
            <li>Pipeline influence by channel</li>
            <li>Account engagement trends</li>
            <li>Campaign ROI</li>
            <li>Journey performance</li>
          </ul>
        </div>
      )}

      {tab === "compliance" && (
        <div className="rounded-xl border p-4 bg-white dark:bg-slate-900 space-y-2">
          <div className="text-slate-900 dark:text-white font-medium">Compliance & Governance</div>
          <ul className="text-sm text-slate-300 list-disc ml-5 space-y-1">
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
        <div className="text-xs text-slate-300">{title}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    </div>
  );
}

function ChannelCard({ title }) {
  return (
    <div className="rounded-xl border bg-white dark:bg-slate-900 p-4">
      <div className="font-medium">{title}</div>
      <div className="text-sm text-slate-300 mt-1">
        Orchestrate campaigns and personalization
      </div>
      <button className="mt-3 px-3 py-1 rounded border text-sm">
        Configure
      </button>
    </div>
  );
}
