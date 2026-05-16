import { useMemo, useState } from "react";
import { useApi, useMutation } from "../../hooks/useApi";
import { marketing } from "../../services/api";
import { useToast } from "../../components/ui/Toast";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import PageHeader from "../../components/ui/PageHeader";
import { Stat } from "../../components/ui/Card";
import {
  Megaphone, Plus, Search, Calendar, Users, Target, BarChart3,
  DollarSign, Mail, PlayCircle, PauseCircle, CheckCircle2,
  ShieldCheck, FileText, ArrowUpRight, RefreshCw, Loader2, X, AlertCircle,
} from "lucide-react";

const TABS = [
  { id: "overview",    label: "Overview" },
  { id: "targeting",   label: "Targeting" },
  { id: "channels",    label: "Channels" },
  { id: "budget",      label: "Budget" },
  { id: "performance", label: "Performance" },
  { id: "governance",  label: "Governance" },
];

const EMPTY_C = { name: "", objective: "", owner: "", start: "", end: "" };

function NewCampaignModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_C);
  const [formError, setFormError] = useState(null);
  const { mutate, loading } = useMutation((d) => marketing.campaigns.create(d));
  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }
  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) { setFormError("Campaign name is required."); return; }
    try {
      await mutate(form);
      toast({ message: "Campaign created.", type: "success" });
      onCreated(); onClose();
    } catch (err) { setFormError(err?.message ?? "Failed to create campaign."); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">New Campaign</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {formError && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{formError}</div>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Campaign name"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Objective</label>
            <input type="text" value={form.objective} onChange={e => set("objective", e.target.value)} placeholder="e.g. Lead Generation"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Start</label>
              <input type="date" value={form.start} onChange={e => set("start", e.target.value)}
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">End</label>
              <input type="date" value={form.end} onChange={e => set("end", e.target.value)}
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Owner</label>
            <input type="text" value={form.owner} onChange={e => set("owner", e.target.value)} placeholder="Owner name"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading}
              className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white transition">
              {loading ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Campaign() {
  const toast = useToast();
  const [showNewCampaign, setShowNewCampaign] = useState(false);

  const {
    data: campaigns,
    loading,
    error,
    refetch,
  } = useApi(() => marketing.campaigns.list({ limit: 100 }), [], { pollingInterval: 60000 });

  const {
    data: campaignSummary,
    loading: summaryLoading,
  } = useApi(() => marketing.campaigns.summary(), [], { pollingInterval: 60000 });

  const [query,    setQuery]    = useState("");
  const [selected, setSelected] = useState(null);
  const [tab,      setTab]      = useState("overview");

  const { mutate: startCampaign,  loading: starting  } = useMutation(
    (id) => marketing.campaigns.start(id),
    {
      onSuccess: () => { refetch(); toast({ message: "Campaign started.", type: "success" }); },
      onError:   (err) => toast({ message: err?.message ?? "Failed.", type: "error" }),
    }
  );

  const { mutate: pauseCampaign, loading: pausing } = useMutation(
    (id) => marketing.campaigns.pause(id),
    {
      onSuccess: () => { refetch(); toast({ message: "Campaign paused.", type: "success" }); },
      onError:   (err) => toast({ message: err?.message ?? "Failed.", type: "error" }),
    }
  );

  const filtered = useMemo(() => {
    if (!campaigns) return [];
    if (!query.trim()) return campaigns;
    return campaigns.filter((c) =>
      c.name?.toLowerCase().includes(query.toLowerCase())
    );
  }, [campaigns, query]);

  return (
    <div className="space-y-6">
      {showNewCampaign && <NewCampaignModal onClose={() => setShowNewCampaign(false)} onCreated={refetch} />}

      <PageHeader
        title="Campaign Management"
        subtitle="Plan, execute, govern, and measure enterprise marketing campaigns."
        actions={
          <div className="flex gap-2">
            <button onClick={refetch} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition">
              <RefreshCw size={13} /> Refresh
            </button>
            <button onClick={() => setShowNewCampaign(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg transition">
              <Plus size={15} /> New Campaign
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Budget"        value={summaryLoading ? "…" : (campaignSummary?.totalBudget    ?? "—")} icon={DollarSign} color="indigo" />
        <Stat label="Total Spend"         value={summaryLoading ? "…" : (campaignSummary?.totalSpend     ?? "—")} icon={DollarSign} color="amber" />
        <Stat label="Pipeline Influenced" value={summaryLoading ? "…" : (campaignSummary?.totalPipeline  ?? "—")} icon={Target}    color="emerald" />
        <Stat label="Revenue Attributed"  value={summaryLoading ? "…" : (campaignSummary?.totalRevenue   ?? "—")} icon={BarChart3} color="sky" />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
          <button onClick={refetch} className="ml-auto text-xs hover:underline flex items-center gap-1"><RefreshCw size={11} /> Retry</button>
        </div>
      )}

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

          {loading ? (
            <div className="p-4"><SkeletonTable rows={4} /></div>
          ) : filtered.length > 0 ? (
            <div className="divide-y">
              {filtered.map((c) => {
                const progress = c.budget > 0 ? Math.min(100, Math.round(((c.spend ?? 0) / c.budget) * 100)) : 0;
                return (
                  <button
                    key={c.id}
                    onClick={() => { setSelected(c); setTab("overview"); }}
                    className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{c.name}</div>
                        <div className="text-xs text-slate-500">
                          {c.objective ?? "—"} · Owner: {c.owner ?? "—"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {c.status === "Running" || c.status === "Active"
                          ? <PlayCircle className="h-4 w-4 text-emerald-600" />
                          : <PauseCircle className="h-4 w-4 text-amber-600" />}
                        {c.status ?? "—"}
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-violet-500" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Spend ${(c.spend ?? 0).toLocaleString()} / ${(c.budget ?? 0).toLocaleString()}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-10 text-center text-sm text-slate-500">No campaigns found.</div>
          )}
        </div>

        {/* Detail panel */}
        <div className="rounded-xl border bg-white dark:bg-slate-900 p-4">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-500">
              Select a campaign to view details
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="font-semibold text-lg">{selected.name}</div>
                <div className="text-sm text-slate-500">{selected.objective ?? "—"}</div>
              </div>

              <div className="flex gap-2 border-b text-sm overflow-x-auto pb-0">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`pb-2 whitespace-nowrap transition ${
                      tab === t.id
                        ? "border-b-2 border-violet-600 text-violet-600 dark:text-violet-400"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === "overview" && (
                <div className="space-y-2 text-sm">
                  <div><strong>Status:</strong> {selected.status ?? "—"}</div>
                  <div><strong>Owner:</strong> {selected.owner ?? "—"}</div>
                  <div><strong>Timeline:</strong> {selected.start ?? "—"} → {selected.end ?? "—"}</div>
                  <div><strong>Channels:</strong> {selected.channels?.join(", ") ?? "—"}</div>
                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={() => startCampaign(selected.id)}
                      disabled={starting}
                      className="px-3 py-1 rounded border text-sm flex items-center gap-1 disabled:opacity-50"
                    >
                      {starting ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle className="h-4 w-4" />} Start
                    </button>
                    <button
                      onClick={() => pauseCampaign(selected.id)}
                      disabled={pausing}
                      className="px-3 py-1 rounded border text-sm flex items-center gap-1 disabled:opacity-50"
                    >
                      {pausing ? <Loader2 size={14} className="animate-spin" /> : <PauseCircle className="h-4 w-4" />} Pause
                    </button>
                  </div>
                </div>
              )}

              {tab === "targeting" && (
                <div className="space-y-2 text-sm">
                  <div className="font-medium flex items-center gap-1"><Users className="h-4 w-4" /> Target Accounts & Personas</div>
                  {selected.targeting ? (
                    <ul className="list-disc ml-5 text-slate-600 dark:text-slate-400 space-y-1">
                      {(Array.isArray(selected.targeting)
                        ? selected.targeting
                        : Object.entries(selected.targeting).map(([k, v]) => `${k}: ${v}`)
                      ).map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  ) : (
                    <p className="text-slate-500">No targeting data available.</p>
                  )}
                </div>
              )}

              {tab === "channels" && (
                <div className="space-y-2 text-sm">
                  <div className="font-medium flex items-center gap-1"><Mail className="h-4 w-4" /> Active Channels</div>
                  {selected.channels?.length > 0 ? (
                    <ul className="list-disc ml-5 text-slate-600 dark:text-slate-400">
                      {selected.channels.map((c) => <li key={c}>{c}</li>)}
                    </ul>
                  ) : (
                    <p className="text-slate-500">No channels assigned.</p>
                  )}
                </div>
              )}

              {tab === "budget" && (
                <div className="space-y-2 text-sm">
                  <div><strong>Total Budget:</strong> ${(selected.budget ?? 0).toLocaleString()}</div>
                  <div><strong>Spent:</strong> ${(selected.spend ?? 0).toLocaleString()}</div>
                  <div><strong>Remaining:</strong> ${((selected.budget ?? 0) - (selected.spend ?? 0)).toLocaleString()}</div>
                </div>
              )}

              {tab === "performance" && (
                <div className="space-y-2 text-sm">
                  <div><strong>Pipeline Influenced:</strong> ${(selected.influencedPipeline ?? 0).toLocaleString()}</div>
                  <div><strong>Revenue Attributed:</strong> ${(selected.attributedRevenue ?? 0).toLocaleString()}</div>
                  <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline">
                    <ArrowUpRight className="h-4 w-4" /> View detailed attribution report
                  </div>
                </div>
              )}

              {tab === "governance" && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> Compliance & Approvals</div>
                  {selected.approvalsRequired ? (
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded">
                      Approval required before launch
                    </div>
                  ) : (
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded flex items-center gap-1">
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

