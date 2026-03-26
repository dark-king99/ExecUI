import { useState, useMemo } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { ScreenShareIcon, DollarSign, Users, TrendingUp, Plus, AlertCircle, X } from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { useToast } from "../../components/ui/Toast";
import { marketing } from "../../services/api";

const statusVariant = { active: "success", scheduled: "info", paused: "warning", completed: "neutral" };

function BudgetPacing({ budget, spent }) {
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const color = pct > 85 ? "bg-red-500" : pct > 65 ? "bg-amber-500" : "bg-emerald-500";
  const fmt = (n) => n != null ? `$${Number(n).toLocaleString()}` : "—";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{fmt(spent)}</span><span>{fmt(budget)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const EMPTY = { name: "", objective: "", owner: "", start: "", end: "" };

function NewCampaignModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState(null);
  const { mutate, loading } = useMutation((data) => marketing.campaigns.create(data));

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) { setFormError("Campaign name is required."); return; }
    try {
      await mutate(form);
      toast({ message: "Campaign created.", type: "success" });
      onCreated();
      onClose();
    } catch (err) {
      setFormError(err?.message ?? "Failed to create campaign.");
    }
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
            <input type="text" value={form.objective} onChange={e => set("objective", e.target.value)} placeholder="e.g. Lead Generation, Brand Awareness"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
              <input type="date" value={form.start} onChange={e => set("start", e.target.value)}
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">End Date</label>
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
              {loading ? "Creating…" : "Create Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CampaignOverview() {
  const [showModal, setShowModal] = useState(false);

  const { data: campaigns, loading, error, refetch } = useApi(
    () => marketing.campaigns.list({ limit: 100 }), [], { pollingInterval: 60000 }
  );
  const { data: summary, loading: sumLoading } = useApi(
    () => marketing.campaigns.summary(), [], { pollingInterval: 60000 }
  );

  const allCampaigns = campaigns ?? [];

  const derived = useMemo(() => ({
    active:      allCampaigns.filter(c => c.status === "active").length,
    totalLeads:  allCampaigns.reduce((s, c) => s + (c.leads ?? 0), 0),
  }), [allCampaigns]);

  return (
    <div className="space-y-6">
      {showModal && <NewCampaignModal onClose={() => setShowModal(false)} onCreated={refetch} />}

      <PageHeader
        title="Campaign Overview"
        subtitle="Status, budget pacing, channel mix and timeline across all campaigns"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            <Plus size={15} /> New Campaign
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Active Campaigns" value={sumLoading ? "…" : (summary?.activeCampaigns ?? derived.active)} icon={ScreenShareIcon} color="indigo" />
        <Stat label="Total Budget"     value={sumLoading ? "…" : (summary?.totalBudget ?? "—")}                icon={DollarSign}     color="sky" />
        <Stat label="Leads Generated"  value={sumLoading ? "…" : (summary?.totalLeads ?? derived.totalLeads)}  icon={Users}          color="emerald" />
        <Stat label="Pipeline Value"   value={sumLoading ? "…" : (summary?.totalPipeline ?? "—")}              icon={TrendingUp}     color="amber" />
      </div>

      <Card>
        <CardHeader title="All Campaigns" icon={ScreenShareIcon} />
        <CardBody>
          {loading && allCampaigns.length === 0 && (
            <div className="space-y-3 animate-pulse">
              {[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
            </div>
          )}
          {!loading && !error && allCampaigns.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">No campaigns found. Create your first campaign above.</p>
          )}
          <div className="space-y-4">
            {allCampaigns.map(c => (
              <div key={c.id ?? c.name} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{c.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{c.objective ?? "—"} · {c.owner ?? "—"}</p>
                  </div>
                  <StatusBadge label={c.status} variant={statusVariant[c.status?.toLowerCase()] ?? "neutral"} dot />
                </div>
                <BudgetPacing budget={c.budget} spent={c.spend ?? c.spent ?? 0} />
                <div className="grid grid-cols-3 gap-3 mt-3 text-xs text-slate-500">
                  <div>Leads: <strong className="text-slate-800 dark:text-slate-200">{c.leads ?? "—"}</strong></div>
                  <div>Conv: <strong className="text-slate-800 dark:text-slate-200">{c.conversion ?? "—"}</strong></div>
                  <div>ROI: <strong className="text-emerald-600 dark:text-emerald-400">{c.roi ?? "—"}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
