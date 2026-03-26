import { useMemo } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { ScreenShareIcon, DollarSign, Users, TrendingUp, Plus, AlertCircle } from "lucide-react";
import { useApi } from "../../hooks/useApi";
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

export default function CampaignOverview() {
  const { data: campaigns, loading, error } = useApi(
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
      <PageHeader
        title="Campaign Overview"
        subtitle="Status, budget pacing, channel mix and timeline across all campaigns"
        actions={
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition">
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
        <Stat label="Active Campaigns" value={loading ? "…" : derived.active}                    icon={ScreenShareIcon} color="indigo" />
        <Stat label="Total Leads"      value={loading ? "…" : derived.totalLeads.toLocaleString()} icon={Users}         color="sky" delta={summary?.leadsDelta} />
        <Stat label="Avg CTR"          value={sumLoading ? "…" : (summary?.avgCtr ?? "—")}        icon={TrendingUp}     color="emerald" delta={summary?.ctrDelta} />
        <Stat label="Budget Spent"     value={sumLoading ? "…" : (summary?.totalSpent ?? "—")}    icon={DollarSign}     color="amber" />
      </div>

      <Card>
        <CardHeader title="All Campaigns" icon={ScreenShareIcon} />
        <CardBody className="space-y-3">
          {loading && allCampaigns.length === 0 && (
            <div className="space-y-3 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
            </div>
          )}
          {!loading && !error && allCampaigns.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">No campaigns found.</p>
          )}
          {allCampaigns.map(c => (
            <div key={c.id ?? c.name} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{c.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{c.channel}</p>
                </div>
                <StatusBadge label={c.status} variant={statusVariant[c.status] ?? "neutral"} dot />
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs text-slate-500 mb-3">
                <div><span className="font-semibold text-slate-800 dark:text-slate-200 block">{(c.leads ?? 0).toLocaleString()}</span>Leads</div>
                <div><span className="font-semibold text-slate-800 dark:text-slate-200 block">{c.ctr ?? "—"}</span>CTR</div>
                <div><span className="font-semibold text-slate-800 dark:text-slate-200 block">{c.spentFormatted ?? (c.spent != null ? `$${Number(c.spent).toLocaleString()}` : "—")}</span>Spent</div>
              </div>
              <BudgetPacing budget={c.budget ?? 0} spent={c.spent ?? 0} />
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
