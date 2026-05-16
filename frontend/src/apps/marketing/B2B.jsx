import { useState, useMemo } from "react";
import {
  Building2, Users, Mail, Workflow, BarChart3, Target,
  Bot, ShieldCheck, PlayCircle, PauseCircle, Plus, Search,
  X, AlertCircle, Loader2, TrendingUp, ChevronRight,
  CheckCircle, Activity, FileText,
} from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { useToast } from "../../components/ui/Toast";
import { marketing } from "../../services/api";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";

const TABS = [
  { id: "dashboard",  label: "Dashboard",            icon: BarChart3 },
  { id: "accounts",   label: "Target Accounts",      icon: Building2 },
  { id: "journeys",   label: "Journeys",              icon: Workflow },
  { id: "channels",   label: "Channels",              icon: Mail },
  { id: "ai",         label: "AI & Scoring",          icon: Bot },
  { id: "reports",    label: "Attribution",           icon: FileText },
  { id: "compliance", label: "Compliance",            icon: ShieldCheck },
];

function NewJourneyModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", channels: "" });
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => marketing.b2b.journeys.create(d));

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(null);
    if (!form.name.trim()) { setErr("Journey name is required."); return; }
    try {
      await mutate({ ...form, channels: form.channels.split(",").map(s => s.trim()).filter(Boolean) });
      toast({ message: `Journey "${form.name}" created.`, type: "success" });
      onCreated?.();
      onClose();
    } catch (ex) { setErr(ex?.message ?? "Failed to create journey."); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">New B2B Journey</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {err && <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-3 py-2">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Journey name"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Channels <span className="text-[10px] text-slate-400">(comma-separated)</span></label>
            <input type="text" value={form.channels} onChange={e => setForm(p => ({ ...p, channels: e.target.value }))} placeholder="Email, LinkedIn Ads, Display"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white transition">{loading ? "Creating…" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function B2BMarketing() {
  const toast = useToast();
  const [showNewJourney, setShowNewJourney] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [query, setQuery] = useState("");
  const [selectedAccount, setSelectedAccount] = useState(null);

  const { data: accounts, loading: acctLoading, error: acctError } = useApi(
    () => marketing.b2b.accounts.list({ limit: 100 }), [], { pollingInterval: 60000 }
  );
  const { data: journeys, loading: jLoading, error: jError, refetch: refetchJourneys } = useApi(
    () => marketing.b2b.journeys.list(), [], { pollingInterval: 60000 }
  );
  const { data: summary, loading: sumLoading } = useApi(
    () => marketing.analytics.summary(), [], { pollingInterval: 60000 }
  );
  const { data: attribution } = useApi(() => marketing.attribution.channels(), [], { pollingInterval: 60000 });

  const allAccounts = accounts ?? [];
  const allJourneys = journeys ?? [];

  const filteredAccounts = useMemo(() =>
    allAccounts.filter(a => (a.name ?? "").toLowerCase().includes(query.toLowerCase())),
    [allAccounts, query]
  );

  return (
    <div className="space-y-6">
      {showNewJourney && <NewJourneyModal onClose={() => setShowNewJourney(false)} onCreated={refetchJourneys} />}

      <PageHeader
        title="B2B Marketing"
        subtitle="Account-based orchestration, journeys, revenue attribution, and growth automation."
        actions={
          <button
            onClick={() => setShowNewJourney(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            <Plus size={15} /> New Journey
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition ${
              tab === t.id
                ? "border-violet-600 text-violet-600 dark:text-violet-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Dashboard */}
      {tab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Target Accounts"     value={sumLoading ? "…" : (summary?.targetAccounts ?? allAccounts.length)}                              icon={Building2} color="indigo" />
            <Stat label="Active Journeys"     value={sumLoading ? "…" : (summary?.activeJourneys ?? allJourneys.filter(j => j.status === "Running").length)} icon={Workflow} color="emerald" />
            <Stat label="Pipeline Influenced" value={sumLoading ? "…" : (summary?.pipelineInfluenced ?? "—")}                                         icon={Target}    color="amber" />
            <Stat label="Revenue Attributed"  value={sumLoading ? "…" : (summary?.revenueAttributed ?? "—")}                                          icon={BarChart3} color="sky" />
          </div>

          {/* Channel performance */}
          <Card>
            <CardHeader title="Channel Performance" icon={Activity} />
            <CardBody>
              {(attribution ?? []).length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No attribution data available.</p>
              ) : (
                <div className="space-y-3">
                  {(attribution ?? []).slice(0, 6).map(ch => {
                    const pct = parseFloat(ch.percent ?? ch.share ?? "0");
                    return (
                      <div key={ch.name ?? ch.channel} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-slate-900 dark:text-white">{ch.name ?? ch.channel}</span>
                          <span className="text-slate-500 dark:text-slate-400">{ch.revenue ?? ch.influenced ?? ch.percent}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Target Accounts */}
      {tab === "accounts" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="h-full flex flex-col overflow-hidden">
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <Search size={14} className="text-slate-400" />
                <input
                  value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Search accounts…"
                  className="flex-1 text-sm outline-none bg-transparent text-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>
              {acctError && (
                <div className="p-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle size={14} /> {acctError}
                </div>
              )}
              {acctLoading && allAccounts.length === 0 && (
                <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
              )}
              {!acctLoading && filteredAccounts.length === 0 && !acctError && (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">No accounts found.</p>
              )}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAccounts.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAccount(selectedAccount?.id === a.id ? null : a)}
                    className={`w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group ${
                      selectedAccount?.id === a.id ? "bg-violet-50 dark:bg-violet-500/5 border-l-2 border-violet-500" : "border-l-2 border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{a.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {a.tier ?? "—"} · Intent: {a.intent ?? "—"}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <StatusBadge label={a.status ?? "unknown"} variant={a.status === "active" ? "success" : "neutral"} dot />
                        <ChevronRight size={13} className="text-slate-300 dark:text-slate-600 group-hover:text-violet-500 transition" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      Pipeline influenced: {a.pipeline ?? a.pipelineFormatted ?? "—"}
                    </p>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <CardBody>
              {!selectedAccount ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 dark:text-slate-500 text-sm">
                  <Building2 size={24} className="mb-2 opacity-30" />
                  Select an account to view details.
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">{selectedAccount.name}</h3>
                    <StatusBadge label={selectedAccount.status ?? "—"} variant={selectedAccount.status === "active" ? "success" : "neutral"} dot />
                  </div>
                  <div className="space-y-2 text-sm">
                    {[
                      { label: "Tier",     value: selectedAccount.tier },
                      { label: "Intent",   value: selectedAccount.intent },
                      { label: "Pipeline", value: selectedAccount.pipeline ?? selectedAccount.pipelineFormatted },
                      { label: "Industry", value: selectedAccount.industry },
                      { label: "Owner",    value: selectedAccount.owner },
                    ].map(({ label, value }) => value && (
                      <div key={label} className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">{label}</span>
                        <span className="font-medium text-slate-900 dark:text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setTab("journeys")}
                      className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                      View Journeys
                    </button>
                    <button
                      onClick={() => toast({ message: `Targeting updated for ${selectedAccount.name}.`, type: "success" })}
                      className="flex-1 text-xs px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition"
                    >
                      Edit Targeting
                    </button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Journeys */}
      {tab === "journeys" && (
        <Card>
          <CardHeader title="Journeys & Automation" icon={Workflow} actions={
            <button onClick={() => setShowNewJourney(true)} className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline">
              <Plus size={12} /> New
            </button>
          } />
          <CardBody className="p-0">
            {jError && (
              <div className="p-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle size={14} /> {jError}
              </div>
            )}
            {jLoading && allJourneys.length === 0 && (
              <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-slate-400" /></div>
            )}
            {!jLoading && allJourneys.length === 0 && !jError && (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No journeys yet.</p>
            )}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {allJourneys.map(j => (
                <div key={j.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{j.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {Array.isArray(j.channels) ? j.channels.join(", ") : (j.channels ?? "—")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {j.enrolled != null && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">{j.enrolled} enrolled</span>
                    )}
                    {j.status === "Running" || j.status === "active"
                      ? <PlayCircle size={18} className="text-emerald-500" />
                      : <PauseCircle size={18} className="text-amber-500" />
                    }
                    <StatusBadge label={j.status ?? "draft"} variant={j.status === "Running" || j.status === "active" ? "success" : "warning"} dot />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Channels */}
      {tab === "channels" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: "Email", desc: "Drip sequences, newsletters, and transactional sends.", icon: Mail },
            { name: "LinkedIn Ads", desc: "Sponsored content, InMail, and dynamic audience targeting.", icon: Users },
            { name: "Display Ads", desc: "Programmatic retargeting and intent-based ad placements.", icon: TrendingUp },
            { name: "Website Personalization", desc: "Dynamic content blocks and personalized CTAs per account.", icon: Activity },
          ].map(ch => (
            <Card key={ch.name}>
              <CardBody>
                <div className="h-9 w-9 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center mb-3">
                  <ch.icon size={18} className="text-violet-600 dark:text-violet-400" />
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{ch.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{ch.desc}</p>
                <button
                  onClick={() => toast({ message: `${ch.name} settings opened.`, type: "info" })}
                  className="mt-3 w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Configure
                </button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* AI & Scoring */}
      {tab === "ai" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { title: "Account Intent Scoring", desc: "Real-time signals from web activity, content engagement, and 3rd-party intent data to score purchase readiness.", color: "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800" },
            { title: "Buying Committee Heatmaps", desc: "Visualize engagement across all stakeholders in the buying group — identify champions, blockers, and silent influencers.", color: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800" },
            { title: "Next-Best-Action", desc: "AI recommends the optimal next touchpoint (call, email, ad, content) based on account stage and engagement pattern.", color: "bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800" },
            { title: "Send-Time Optimization", desc: "Predictive ML determines the best send window per contact to maximize open and click rates.", color: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" },
            { title: "Journey Path Optimization", desc: "Continuously A/B tests journey branches and auto-routes contacts through highest-converting paths.", color: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" },
            { title: "Churn & Expansion Signals", desc: "Flags accounts at risk of churn or ready for expansion based on product usage, NPS, and engagement trends.", color: "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800" },
          ].map(({ title, desc, color }) => (
            <div key={title} className={`rounded-xl border p-4 ${color}`}>
              <div className="flex items-center gap-2 mb-2">
                <Bot size={16} className="text-violet-600 dark:text-violet-400" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">{desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Attribution / Reports */}
      {tab === "reports" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Pipeline Influenced" value={sumLoading ? "…" : (summary?.pipelineInfluenced ?? "—")} icon={Target}    color="indigo" />
            <Stat label="Revenue Attributed"  value={sumLoading ? "…" : (summary?.revenueAttributed ?? "—")} icon={BarChart3} color="emerald" />
            <Stat label="Avg Deal Velocity"   value={sumLoading ? "…" : (summary?.avgDealVelocity ?? "—")}   icon={TrendingUp} color="amber" />
            <Stat label="Campaigns ROI"       value={sumLoading ? "…" : (summary?.campaignRoi ?? "—")}       icon={CheckCircle} color="sky" />
          </div>

          <Card>
            <CardHeader title="Channel Attribution" icon={FileText} />
            <CardBody>
              {(attribution ?? []).length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No attribution data available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        {["Channel", "Touches", "Pipeline", "Revenue", "Attribution %"].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(attribution ?? []).map(ch => (
                        <tr key={ch.name ?? ch.channel} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">{ch.name ?? ch.channel}</td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{ch.touches ?? "—"}</td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{ch.pipeline ?? "—"}</td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{ch.revenue ?? "—"}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-violet-500 rounded-full" style={{ width: ch.percent ?? "0%" }} />
                              </div>
                              <span className="text-xs text-slate-600 dark:text-slate-300 w-10 text-right">{ch.percent ?? "—"}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Compliance */}
      {tab === "compliance" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { title: "Consent & Preference Management", desc: "Manage contact opt-ins, opt-outs, channel preferences, and explicit consent records. Every preference change is logged.", status: "Active", color: "emerald" },
            { title: "GDPR / CAN-SPAM / CCPA", desc: "Automated compliance checks before any send. Right-to-be-forgotten requests processed within 72 hours.", status: "Active", color: "emerald" },
            { title: "Audit Trail", desc: "Immutable log of all marketing sends, suppression decisions, and consent changes — filterable by date, contact, and channel.", status: "Active", color: "emerald" },
            { title: "Suppression Lists", desc: "Global suppression, unsubscribe management, and hard-bounce cleanup with automatic list hygiene.", status: "Active", color: "emerald" },
            { title: "Data Residency Controls", desc: "Configure where contact data is stored and processed. EU, US, and APAC regions supported.", status: "Configured", color: "sky" },
            { title: "Frequency Caps", desc: "Maximum touchpoint limits per contact per channel per period — prevents fatigue and maintains deliverability.", status: "Active", color: "emerald" },
          ].map(({ title, desc, status, color }) => (
            <div key={title} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={15} className="text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
                </div>
                <StatusBadge label={status} variant={color === "emerald" ? "success" : "info"} dot />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
