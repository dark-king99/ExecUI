import { useState } from "react";
import { Megaphone, DollarSign, Users, TrendingUp, RefreshCw, AlertCircle, BarChart3, Play, Pause } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../components/ui/Card";
import StatusBadge from "../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../components/ui/Skeleton";
import { useApi } from "../hooks/useApi";
import { marketing } from "../services/api";

const STATUS_VARIANT = { active: "success", paused: "warning", draft: "neutral", completed: "info", scheduled: "indigo" };
const CHANNEL_COLORS = { email: "bg-violet-500", social: "bg-sky-500", paid: "bg-amber-500", organic: "bg-emerald-500", direct: "bg-slate-400" };

export default function MarketingView() {
  const [refresh, setRefresh] = useState(0);
  const { data: campaigns, loading: campLoading, error } = useApi(() => marketing.campaigns.list({ limit: 8 }), [refresh], { pollingInterval: 60000 });
  const { data: summary, loading: sumLoading } = useApi(() => marketing.campaigns.summary(), [refresh], { pollingInterval: 120000 });
  const { data: channelPerf } = useApi(() => marketing.analytics.channelPerf(), [refresh], { pollingInterval: 120000 });
  const { data: attrSummary } = useApi(() => marketing.attribution.summary(), [refresh], { pollingInterval: 120000 });

  const allCampaigns = campaigns ?? [];
  const channels = channelPerf ?? [];
  const attr = attrSummary ?? {};
  const active = allCampaigns.filter(c => c.status === "active").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Marketing" subtitle="Campaign performance, channel analytics, and audience insights"
        actions={
          <button onClick={() => setRefresh(r => r + 1)} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition">
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />

      {sumLoading && allCampaigns.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Active Campaigns" value={summary?.activeCampaigns ?? active} icon={Megaphone} color="violet" />
          <Stat label="Revenue Attributed" value={summary?.revenueAttributed ?? attr.totalRevenue ?? "—"} icon={DollarSign} color="emerald" />
          <Stat label="Total Leads" value={summary?.totalLeads ?? "—"} icon={Users} color="sky" delta={summary?.leadsDelta} />
          <Stat label="Avg CTR" value={summary?.avgCtr != null ? `${summary.avgCtr}%` : "—"} icon={TrendingUp} color="amber" delta={summary?.ctrDelta} />
        </div>
      )}

      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Campaigns */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Recent Campaigns" icon={Megaphone} />
            {campLoading && allCampaigns.length === 0 ? <div className="p-4"><SkeletonTable rows={6} /></div> : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {allCampaigns.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No campaigns found.</p> : allCampaigns.map((c, i) => (
                  <div key={c.id ?? i} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{c.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{c.type ?? c.objective ?? ""}{c.owner ? ` • ${c.owner}` : ""}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right text-xs text-slate-500">
                        {c.leads != null && <div>{c.leads} leads</div>}
                        {c.revenue && <div className="font-semibold text-slate-900 dark:text-white">{c.revenue}</div>}
                      </div>
                      <StatusBadge label={c.status ?? "draft"} variant={STATUS_VARIANT[c.status] ?? "neutral"} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Channel Performance */}
        <div>
          <Card>
            <CardHeader title="Channel Performance" icon={BarChart3} />
            <CardBody className="space-y-4">
              {channels.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No channel data.</p>
              ) : (
                (() => {
                  const maxVal = Math.max(...channels.map(ch => ch.revenue ?? ch.value ?? ch.leads ?? 0));
                  return channels.map((ch, i) => {
                    const val = ch.revenue ?? ch.value ?? ch.leads ?? 0;
                    const pct = maxVal ? Math.max(8, Math.round((val / maxVal) * 100)) : 8;
                    const color = CHANNEL_COLORS[ch.channel?.toLowerCase()] ?? "bg-violet-500";
                    return (
                      <div key={ch.channel ?? i} className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span className="capitalize font-medium text-slate-700 dark:text-slate-300">{ch.channel ?? ch.name}</span>
                          <span>{ch.ctr != null ? `${ch.ctr}% CTR` : ch.leads != null ? `${ch.leads} leads` : ""}</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </CardBody>
          </Card>

          {attr.ltvCac && (
            <Card className="mt-4">
              <CardHeader title="LTV / CAC" icon={DollarSign} />
              <CardBody>
                <div className="grid grid-cols-2 gap-3 text-center">
                  {[["LTV", attr.ltv], ["CAC", attr.cac], ["LTV:CAC", attr.ltvCacRatio]].filter(([, v]) => v != null).map(([l, v]) => (
                    <div key={l} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">{l}</div>
                      <div className="font-bold text-slate-900 dark:text-white">{v}</div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
