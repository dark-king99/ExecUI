import { useState } from "react";
import { BarChart2, TrendingUp, Target, Award, RefreshCw, AlertCircle } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useApi } from "../../hooks/useApi";
import { crm } from "../../services/api";

export default function CRMAnalytics() {
  const [tab, setTab] = useState("overview");
  const { data: summary, loading: sumLoading, error, refetch } = useApi(() => crm.analytics.summary(), [], { pollingInterval: 120000 });
  const { data: funnel, loading: funnelLoading } = useApi(() => crm.analytics.funnel(), [], { pollingInterval: 120000 });
  const { data: velocity } = useApi(() => crm.analytics.velocity(), [], { pollingInterval: 120000 });
  const { data: winLoss } = useApi(() => crm.analytics.winLoss(), [], { pollingInterval: 120000 });
  const funnelStages = funnel ?? [];
  const velData = velocity ?? {};
  const wlData = winLoss ?? {};
  const maxCount = Math.max(1, ...funnelStages.map(s => s.count ?? s.deals ?? 0));

  return (
    <div className="space-y-6">
      <PageHeader title="CRM Analytics" subtitle="Comprehensive performance metrics and sales analytics"
        actions={<button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh</button>}
      />

      {sumLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total Revenue" value={summary?.totalRevenue ?? "—"} icon={BarChart2} color="orange" delta={summary?.revenueDelta} />
          <Stat label="Win Rate" value={summary?.winRate != null ? `${summary.winRate}%` : "—"} icon={Award} color="emerald" />
          <Stat label="Avg Deal Size" value={summary?.avgDealSize ?? "—"} icon={Target} color="sky" />
          <Stat label="Sales Velocity" value={summary?.salesVelocity ?? "—"} icon={TrendingUp} color="amber" />
        </div>
      )}

      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}

      <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden w-fit">
        {["overview", "funnel", "velocity", "win/loss"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm font-medium capitalize transition ${tab === t ? "bg-orange-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{t}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Performance Summary" icon={BarChart2} />
            <CardBody>
              {sumLoading ? <SkeletonTable rows={5} /> : !summary ? <p className="text-sm text-slate-500">No data available.</p> : (
                <div className="space-y-3">
                  {[
                    ["Pipeline Value", summary.pipelineValue],
                    ["Avg Sales Cycle", summary.avgCycleDays != null ? `${summary.avgCycleDays} days` : null],
                    ["Lead Conversion Rate", summary.leadConversionRate != null ? `${summary.leadConversionRate}%` : null],
                    ["Quota Attainment", summary.quotaAttainment != null ? `${summary.quotaAttainment}%` : null],
                    ["Customer Acquisition Cost", summary.cac],
                    ["Customer Lifetime Value", summary.ltv],
                  ].filter(([, v]) => v != null).map(([l, v]) => (
                    <div key={l} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 text-sm">
                      <span className="text-slate-600 dark:text-slate-400">{l}</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Activity Metrics" icon={TrendingUp} />
            <CardBody>
              {sumLoading ? <SkeletonTable rows={5} /> : !summary ? <p className="text-sm text-slate-500">No data available.</p> : (
                <div className="space-y-3">
                  {[
                    ["Calls Made", summary.callsMade],
                    ["Emails Sent", summary.emailsSent],
                    ["Meetings Booked", summary.meetingsBooked],
                    ["Demos Completed", summary.demosCompleted],
                    ["Proposals Sent", summary.proposalsSent],
                    ["Active Reps", summary.activeReps],
                  ].filter(([, v]) => v != null).map(([l, v]) => (
                    <div key={l} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 text-sm">
                      <span className="text-slate-600 dark:text-slate-400">{l}</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{v}</span>
                    </div>
                  ))}
                  {!summary.callsMade && <p className="text-sm text-slate-500">Activity data not available.</p>}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "funnel" && (
        <Card>
          <CardHeader title="Pipeline Funnel Analysis" icon={BarChart2} />
          <CardBody>
            {funnelLoading ? <SkeletonTable rows={6} /> : funnelStages.length === 0 ? (
              <p className="text-sm text-center text-slate-500 py-6">No funnel data available.</p>
            ) : (
              <div className="space-y-5">
                {funnelStages.map((s, i) => (
                  <div key={s.stage ?? i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{s.stage ?? s.name}</span>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-slate-500">{s.count ?? s.deals ?? 0} deals</span>
                        {s.value && <span className="font-semibold text-slate-900 dark:text-white">{s.value}</span>}
                        {s.conversion != null && <span className="text-orange-600 font-medium">{s.conversion}% conv.</span>}
                      </div>
                    </div>
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${Math.max(4, ((s.count ?? s.deals ?? 0) / maxCount) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {tab === "velocity" && (
        <Card>
          <CardHeader title="Sales Velocity Analysis" icon={TrendingUp} />
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                ["Avg Days to Close", velData.avgDaysToClose ?? velData.avgCycle],
                ["Deals / Month", velData.dealsPerMonth],
                ["Revenue Velocity", velData.revenueVelocity],
                ["Avg Deal Value", velData.avgDealSize ?? velData.avgDealValue],
                ["Win Rate", velData.winRate != null ? `${velData.winRate}%` : null],
                ["Pipeline Turns", velData.pipelineTurns],
              ].filter(([, v]) => v != null).map(([l, v]) => (
                <div key={l} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                  <div className="text-xs text-slate-500 mb-1">{l}</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white">{v}</div>
                </div>
              ))}
              {Object.keys(velData).length === 0 && <p className="col-span-3 text-sm text-slate-500 text-center py-4">Velocity data not available.</p>}
            </div>
          </CardBody>
        </Card>
      )}

      {tab === "win/loss" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[["Win Reasons", wlData.winReasons ?? [], "bg-emerald-500", "text-emerald-600"], ["Loss Reasons", wlData.lossReasons ?? [], "bg-red-500", "text-red-600"]].map(([title, reasons, barColor, textColor]) => (
            <Card key={title}>
              <CardHeader title={title} icon={Award} />
              <CardBody>
                {reasons.length === 0 ? <p className="text-sm text-slate-500">No data available.</p> : (
                  <div className="space-y-3">
                    {reasons.map((r, i) => (
                      <div key={r.reason ?? i} className="flex items-center justify-between text-sm gap-3">
                        <span className="text-slate-700 dark:text-slate-300 flex-1 min-w-0 truncate">{r.reason}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-20 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full ${barColor} rounded-full`} style={{ width: `${r.pct ?? 0}%` }} />
                          </div>
                          <span className={`text-xs font-semibold ${textColor} w-8 text-right`}>{r.pct ?? 0}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
