import { useMemo } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import { BarChart3, TrendingUp, Users, DollarSign, Mail, Globe, AlertCircle } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { marketing } from "../../services/api";

export default function MarketingAnalytics() {
  const { data: summary, loading: sumLoading, error: sumError } = useApi(
    () => marketing.analytics.summary(), [], { pollingInterval: 60000 }
  );
  const { data: trend, loading: trendLoading } = useApi(
    () => marketing.analytics.trend({ months: 6 }), [], { pollingInterval: 60000 }
  );
  const { data: channelPerf, loading: chLoading } = useApi(
    () => marketing.analytics.channelPerf(), [], { pollingInterval: 60000 }
  );

  const allTrend = trend ?? [];
  const allChannels = channelPerf ?? [];

  const maxLeads = useMemo(() =>
    allTrend.length > 0 ? Math.max(...allTrend.map(d => d.leads ?? 0)) : 1,
    [allTrend]
  );
  const maxRevenue = useMemo(() =>
    allTrend.length > 0 ? Math.max(...allTrend.map(d => d.revenue ?? 0)) : 1,
    [allTrend]
  );

  const colorMap = ["bg-indigo-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-purple-500"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing Analytics"
        subtitle="Executive and operator views — leads, revenue, channel performance and ROI drill-down"
      />

      {sumError && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {sumError}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Leads (MTD)"     value={sumLoading ? "…" : (summary?.leadsMtd ?? "—")}     icon={Users}     color="indigo" delta={summary?.leadsDelta} />
        <Stat label="Pipeline (MTD)"  value={sumLoading ? "…" : (summary?.pipelineMtd ?? "—")}  icon={DollarSign} color="sky"  delta={summary?.pipelineDelta} />
        <Stat label="Email Open Rate" value={sumLoading ? "…" : (summary?.emailOpenRate ?? "—")} icon={Mail}      color="emerald" delta={summary?.openRateDelta} />
        <Stat label="MQL → SQL"       value={sumLoading ? "…" : (summary?.mqlToSql ?? "—")}     icon={TrendingUp} color="amber" delta={summary?.mqlToSqlDelta} />
      </div>

      <Card>
        <CardHeader title="Lead & Revenue Trend" icon={BarChart3} />
        <CardBody>
          {trendLoading && allTrend.length === 0 && (
            <div className="h-40 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
          )}
          {!trendLoading && allTrend.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">No trend data available.</p>
          )}
          {allTrend.length > 0 && (
            <>
              <div className="flex items-end gap-3 h-40">
                {allTrend.map(d => (
                  <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end gap-0.5 h-32">
                      <div
                        className="flex-1 bg-indigo-500 rounded-t"
                        style={{ height: `${maxLeads > 0 ? ((d.leads ?? 0) / maxLeads) * 100 : 0}%` }}
                        title={`Leads: ${d.leads}`}
                      />
                      <div
                        className="flex-1 bg-emerald-400 rounded-t opacity-70"
                        style={{ height: `${maxRevenue > 0 ? ((d.revenue ?? 0) / maxRevenue) * 100 : 0}%` }}
                        title={`Revenue: $${d.revenue}k`}
                      />
                    </div>
                    <span className="text-xs text-slate-400">{d.month}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-indigo-500" />Leads</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-400" />Revenue ($k)</span>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Channel Performance" icon={Globe} />
        <CardBody className="space-y-3">
          {chLoading && allChannels.length === 0 && (
            <div className="space-y-2 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
            </div>
          )}
          {!chLoading && allChannels.length === 0 && (
            <p className="text-sm text-slate-500">No channel performance data available.</p>
          )}
          {allChannels.map((ch, idx) => (
            <div key={ch.channel} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <div className={`h-3 w-3 rounded-full ${colorMap[idx % colorMap.length]} shrink-0`} />
              <span className="w-32 text-sm font-medium text-slate-700 dark:text-slate-300">{ch.channel}</span>
              <div className="flex gap-6 text-xs text-slate-500 flex-1">
                {ch.openRate && ch.openRate !== "—" && <span>Open: <strong className="text-slate-800 dark:text-slate-200">{ch.openRate}</strong></span>}
                {ch.clickRate && <span>CTR: <strong className="text-slate-800 dark:text-slate-200">{ch.clickRate}</strong></span>}
                {ch.convRate && <span>Conv: <strong className="text-emerald-600 dark:text-emerald-400">{ch.convRate}</strong></span>}
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
