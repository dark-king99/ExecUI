import { useState } from "react";
import { BarChart3, TrendingUp, Users, MousePointer, RefreshCw, AlertCircle } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useApi } from "../../hooks/useApi";
import { marketing } from "../../services/api";

const CHANNEL_COLORS = { email: "bg-violet-500", social: "bg-sky-500", paid: "bg-amber-500", organic: "bg-emerald-500", direct: "bg-slate-400" };

export default function MarketingAnalytics() {
  const [period, setPeriod] = useState("30d");
  const { data: summary, loading: sumLoading, error, refetch } = useApi(() => marketing.analytics.summary(), [], { pollingInterval: 120000 });
  const { data: trend } = useApi(() => marketing.analytics.trend({ period }), [period], { pollingInterval: 120000 });
  const { data: channelPerf } = useApi(() => marketing.analytics.channelPerf(), [], { pollingInterval: 120000 });
  const s = summary ?? {};
  const channels = channelPerf ?? [];
  const trendData = trend ?? [];
  const maxRev = Math.max(1, ...channels.map(c => c.revenue ?? c.value ?? 0));
  return (
    <div className="space-y-6">
      <PageHeader title="Marketing Analytics" subtitle="Measure and optimize your marketing performance"
        actions={<button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh</button>}
      />
      {sumLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total Leads" value={s.totalLeads?.toLocaleString() ?? "—"} icon={Users} color="violet" delta={s.leadsDelta} />
          <Stat label="Avg CTR" value={s.avgCtr != null ? `${s.avgCtr}%` : "—"} icon={MousePointer} color="sky" delta={s.ctrDelta} />
          <Stat label="Conversion Rate" value={s.conversionRate != null ? `${s.conversionRate}%` : "—"} icon={TrendingUp} color="emerald" delta={s.conversionDelta} />
          <Stat label="Revenue Influenced" value={s.revenueInfluenced ?? "—"} icon={BarChart3} color="amber" delta={s.revenueDelta} />
        </div>
      )}
      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}
      <div className="flex gap-1.5">
        {["7d", "30d", "90d", "ytd"].map(p => (
          <button key={p} onClick={() => setPeriod(p)} className={`text-xs px-3 py-1.5 rounded-full border transition ${period === p ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-400"}`}>{p}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Channel Performance" icon={BarChart3} />
          <CardBody className="space-y-4">
            {channels.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">No channel data.</p> : channels.map((ch, i) => {
              const rev = ch.revenue ?? ch.value ?? 0;
              const color = CHANNEL_COLORS[ch.channel?.toLowerCase()] ?? "bg-violet-500";
              return (
                <div key={ch.channel ?? i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize font-medium text-slate-700 dark:text-slate-300">{ch.channel ?? ch.name}</span>
                    <div className="flex gap-3 text-xs">
                      {ch.leads != null && <span className="text-slate-400">{ch.leads} leads</span>}
                      {ch.ctr != null && <span className="text-slate-400">{ch.ctr}% CTR</span>}
                      {ch.revenue && <span className="font-semibold text-slate-900 dark:text-white">{ch.revenue}</span>}
                    </div>
                  </div>
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.max(4, Math.round((rev / maxRev) * 100))}%` }} />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Performance Summary" icon={TrendingUp} />
          <CardBody>
            {sumLoading ? <SkeletonTable rows={6} /> : (
              <div className="space-y-3">
                {[
                  ["Total Impressions", s.totalImpressions?.toLocaleString()],
                  ["Total Clicks", s.totalClicks?.toLocaleString()],
                  ["Form Fills", s.formFills?.toLocaleString()],
                  ["MQLs Generated", s.mqls?.toLocaleString()],
                  ["SQLs Created", s.sqls?.toLocaleString()],
                  ["Cost per Lead", s.costPerLead],
                  ["Marketing Qualified Leads", s.mqlRate != null ? `${s.mqlRate}% MQL rate` : null],
                ].filter(([, v]) => v != null).map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 text-sm">
                    <span className="text-slate-600 dark:text-slate-400">{l}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{v}</span>
                  </div>
                ))}
                {Object.keys(s).length === 0 && <p className="text-sm text-slate-500">No data available.</p>}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
      {trendData.length > 0 && (
        <Card>
          <CardHeader title={`Trend (${period})`} icon={TrendingUp} />
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    {Object.keys(trendData[0] ?? {}).map(k => (
                      <th key={k} className="text-left pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider pr-4 capitalize">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {trendData.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      {Object.values(row).map((v, vi) => (
                        <td key={vi} className="py-2.5 pr-4 text-slate-700 dark:text-slate-300">{String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
