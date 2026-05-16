import { useState } from "react";
import { TrendingUp, DollarSign, BarChart2, Award, RefreshCw, AlertCircle } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useApi } from "../../hooks/useApi";
import { crm } from "../../services/api";

function MetricBar({ label, value, max, color = "bg-orange-500" }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-600 dark:text-slate-400">{label}</span>
        <span className="font-semibold text-slate-900 dark:text-white">{typeof value === "number" ? value.toLocaleString() : value}</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function RevenueIntelligence() {
  const [tab, setTab] = useState("overview");
  const { data: summary, loading: sumLoading, error, refetch } = useApi(() => crm.analytics.summary(), [], { pollingInterval: 120000 });
  const { data: funnel, loading: funnelLoading } = useApi(() => crm.analytics.funnel(), [], { pollingInterval: 120000 });
  const { data: velocity, loading: velLoading } = useApi(() => crm.analytics.velocity(), [], { pollingInterval: 120000 });
  const { data: winLoss, loading: wlLoading } = useApi(() => crm.analytics.winLoss(), [], { pollingInterval: 120000 });

  const funnelStages = funnel ?? [];
  const velMetrics = velocity ?? {};
  const wlData = winLoss ?? {};

  return (
    <div className="space-y-6">
      <PageHeader title="Revenue Intelligence" subtitle="AI-powered insights across your full revenue motion"
        actions={<button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh</button>}
      />

      {sumLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total Revenue" value={summary?.totalRevenue ?? "—"} icon={DollarSign} color="orange" delta={summary?.revenueDelta} />
          <Stat label="Win Rate" value={summary?.winRate != null ? `${summary.winRate}%` : "—"} icon={Award} color="emerald" delta={summary?.winRateDelta} />
          <Stat label="Avg Cycle (days)" value={summary?.avgCycleDays ?? "—"} icon={BarChart2} color="sky" />
          <Stat label="Revenue Growth" value={summary?.growth != null ? `${summary.growth}%` : "—"} icon={TrendingUp} color="amber" delta={summary?.growthDelta} />
        </div>
      )}

      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}

      <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden w-fit">
        {["overview", "funnel", "velocity", "win-loss"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm font-medium capitalize transition ${tab === t ? "bg-orange-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{t.replace("-", " ")}</button>
        ))}
      </div>

      {tab === "overview" && summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Revenue Breakdown" icon={DollarSign} />
            <CardBody className="space-y-4">
              {[["New Business", summary.newBusiness], ["Renewals", summary.renewals], ["Expansion", summary.expansion], ["Services", summary.services]].filter(([, v]) => v != null).map(([l, v], i) => (
                <div key={l} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">{l}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{v}</span>
                </div>
              ))}
              {!summary.newBusiness && <p className="text-sm text-slate-500">Detailed breakdown not available.</p>}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Key Metrics" icon={TrendingUp} />
            <CardBody className="space-y-4">
              {[["Pipeline Coverage", summary.pipelineCoverage, "3x"], ["Forecast Accuracy", summary.forecastAccuracy, "100%"], ["Lead Conversion", summary.leadConversion, "100%"], ["Quota Attainment", summary.quotaAttainment, "100%"]].filter(([, v]) => v != null).map(([l, v, max]) => (
                <div key={l} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">{l}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{typeof v === "number" && l !== "Pipeline Coverage" ? `${v}%` : v}</span>
                </div>
              ))}
              {!summary.pipelineCoverage && <p className="text-sm text-slate-500">Metrics not available.</p>}
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "funnel" && (
        <Card>
          <CardHeader title="Conversion Funnel" icon={BarChart2} />
          <CardBody>
            {funnelLoading ? <SkeletonTable rows={6} /> : funnelStages.length === 0 ? (
              <p className="text-sm text-center text-slate-500 py-6">No funnel data available.</p>
            ) : (
              <div className="space-y-5">
                {funnelStages.map((s, i) => {
                  const maxCount = Math.max(...funnelStages.map(f => f.count ?? f.deals ?? 0));
                  return (
                    <div key={s.stage ?? i} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{s.stage ?? s.name}</span>
                        <div className="flex gap-4 text-xs text-slate-500">
                          <span>{s.count ?? s.deals ?? 0} deals</span>
                          {s.value && <span className="font-semibold text-slate-900 dark:text-white">{s.value}</span>}
                          {s.conversion != null && <span className="text-orange-600">{s.conversion}% conv.</span>}
                        </div>
                      </div>
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${Math.max(4, ((s.count ?? s.deals ?? 0) / Math.max(1, maxCount)) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {tab === "velocity" && (
        <Card>
          <CardHeader title="Deal Velocity" icon={TrendingUp} />
          <CardBody>
            {velLoading ? <SkeletonTable rows={4} /> : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  ["Avg Days to Close", velMetrics.avgDaysToClose ?? velMetrics.avgCycle],
                  ["Avg Deal Size", velMetrics.avgDealSize],
                  ["Deals / Month", velMetrics.dealsPerMonth],
                  ["Win Rate", velMetrics.winRate != null ? `${velMetrics.winRate}%` : null],
                  ["Revenue Velocity", velMetrics.revenueVelocity],
                  ["Leads / Deal", velMetrics.leadsPerDeal],
                ].filter(([, v]) => v != null).map(([l, v]) => (
                  <div key={l} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-500 mb-1">{l}</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white">{v}</div>
                  </div>
                ))}
                {Object.keys(velMetrics).length === 0 && <p className="col-span-3 text-sm text-slate-500 text-center py-4">Velocity data not available.</p>}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {tab === "win-loss" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Win Analysis" icon={Award} />
            <CardBody>
              {wlLoading ? <SkeletonTable rows={4} /> : (
                <div className="space-y-3">
                  {(wlData.winReasons ?? []).length === 0 ? <p className="text-sm text-slate-500">No win reason data.</p> : (wlData.winReasons ?? []).map((r, i) => (
                    <div key={r.reason ?? i} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 dark:text-slate-300">{r.reason}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${r.pct ?? 0}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-emerald-600">{r.pct ?? 0}%</span>
                      </div>
                    </div>
                  ))}
                  {wlData.wonCount != null && <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-sm font-semibold text-slate-900 dark:text-white">{wlData.wonCount} won deals</div>}
                </div>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Loss Analysis" icon={BarChart2} />
            <CardBody>
              {wlLoading ? <SkeletonTable rows={4} /> : (
                <div className="space-y-3">
                  {(wlData.lossReasons ?? []).length === 0 ? <p className="text-sm text-slate-500">No loss reason data.</p> : (wlData.lossReasons ?? []).map((r, i) => (
                    <div key={r.reason ?? i} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 dark:text-slate-300">{r.reason}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${r.pct ?? 0}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-red-600">{r.pct ?? 0}%</span>
                      </div>
                    </div>
                  ))}
                  {wlData.lostCount != null && <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-sm font-semibold text-slate-900 dark:text-white">{wlData.lostCount} lost deals</div>}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
