import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import { BarChart3, TrendingUp, Users, Target, AlertCircle } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { crm } from "../../services/api";

export default function CRMAnalytics() {
  const { data: summary, loading: summaryLoading } = useApi(() => crm.analytics.summary(), [], { pollingInterval: 60000 });
  const { data: funnel,  loading: funnelLoading,   error: funnelError }  = useApi(() => crm.analytics.funnel(),   [], { pollingInterval: 60000 });
  const { data: velocity, loading: velocityLoading } = useApi(() => crm.analytics.velocity(), [], { pollingInterval: 60000 });
  const { data: winLoss,  loading: winLossLoading }  = useApi(() => crm.analytics.winLoss(),  [], { pollingInterval: 60000 });

  const funnelData  = funnel  ?? [];
  const velocityData = velocity ?? [];
  const winLossData  = winLoss  ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM Analytics"
        subtitle="Pipeline velocity, conversion funnel, win/loss analysis and revenue trends"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Pipeline Velocity" value={summaryLoading ? "…" : (summary?.pipelineVelocity ?? "—")} icon={TrendingUp} color="indigo" delta={summary?.pipelineVelocityDelta} />
        <Stat label="Conversion Rate"   value={summaryLoading ? "…" : (summary?.conversionRate   ?? "—")} icon={Target}    color="emerald" delta={summary?.conversionRateDelta} />
        <Stat label="Avg Sales Cycle"   value={summaryLoading ? "…" : (summary?.avgSalesCycle     ?? "—")} icon={BarChart3} color="sky" />
        <Stat label="Win Rate"          value={summaryLoading ? "…" : (summary?.winRate           ?? "—")} icon={Users}     color="amber" delta={summary?.winRateDelta} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Conversion Funnel" icon={Target} />
          <CardBody className="space-y-3">
            {funnelError && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle size={15} /> {funnelError}
              </div>
            )}
            {funnelLoading && funnelData.length === 0 && (
              <div className="space-y-2 animate-pulse">
                {[1,2,3,4].map(i => <div key={i} className="h-8 bg-slate-100 dark:bg-slate-700 rounded" />)}
              </div>
            )}
            {funnelData.map(s => (
              <div key={s.stage} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">{s.stage}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {s.count} <span className="font-normal text-slate-400 text-xs">({s.pct}%)</span>
                  </span>
                </div>
                <div className="h-6 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full flex items-center px-3 transition-all" style={{ width: `${s.pct}%` }}>
                    {s.pct > 15 && <span className="text-xs font-semibold text-white">{s.pct}%</span>}
                  </div>
                </div>
              </div>
            ))}
            {!funnelLoading && !funnelError && funnelData.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No funnel data available.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Stage Velocity" icon={TrendingUp} />
          <CardBody className="space-y-3">
            {velocityLoading && velocityData.length === 0 && (
              <div className="space-y-2 animate-pulse">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
              </div>
            )}
            {velocityData.map(v => (
              <div key={v.stage} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <p className="text-sm text-slate-700 dark:text-slate-300">{v.stage}</p>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">{v.avg}</span>
                  {v.change != null && (
                    <span className={`text-xs font-medium ${v.change < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {v.change < 0 ? `${v.change}%` : `+${v.change}%`}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {!velocityLoading && velocityData.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No velocity data available.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Win / Loss Reasons" icon={BarChart3} />
        <CardBody className="space-y-3">
          {winLossLoading && winLossData.length === 0 && (
            <div className="space-y-2 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-8 bg-slate-100 dark:bg-slate-700 rounded" />)}
            </div>
          )}
          {winLossData.map(w => {
            const total = (w.win ?? 0) + (w.loss ?? 0);
            const winPct = total > 0 ? Math.round((w.win / total) * 100) : 0;
            return (
              <div key={w.reason} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">{w.reason}</span>
                  <div className="flex gap-3 text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">W:{w.win}</span>
                    <span className="text-red-500 font-semibold">L:{w.loss}</span>
                  </div>
                </div>
                <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                  <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: `${winPct}%` }} />
                  <div className="h-full bg-red-400 rounded-r-full"   style={{ width: `${100 - winPct}%` }} />
                </div>
              </div>
            );
          })}
          {!winLossLoading && winLossData.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">No win/loss data available.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
