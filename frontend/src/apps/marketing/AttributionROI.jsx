import { useMemo } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import { DollarSign, TrendingUp, Users, Target, AlertCircle } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { marketing } from "../../services/api";

export default function AttributionROI() {
  const { data: summary, loading: sumLoading, error: sumError } = useApi(
    () => marketing.attribution.summary(), [], { pollingInterval: 60000 }
  );
  const { data: channels, loading: chLoading } = useApi(
    () => marketing.attribution.channels(), [], { pollingInterval: 60000 }
  );
  const { data: models, loading: modLoading } = useApi(
    () => marketing.attribution.models(), [], { pollingInterval: 120000 }
  );
  const { data: ltvCac, loading: ltvLoading } = useApi(
    () => marketing.attribution.ltvCac(), [], { pollingInterval: 120000 }
  );

  const allChannels = channels ?? [];
  const allModels = models ?? [];
  const allLtvCac = ltvCac ?? [];

  const maxRevenue = useMemo(() =>
    allChannels.length > 0 ? Math.max(...allChannels.map(c => c.revenue ?? 0)) : 1,
    [allChannels]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attribution & ROI"
        subtitle="Multi-touch attribution, CAC / LTV dashboards and channel mix analysis"
      />

      {sumError && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {sumError}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Attributed Revenue" value={sumLoading ? "…" : (summary?.attributedRevenue ?? "—")} icon={DollarSign} color="indigo" delta={summary?.revenueDelta} />
        <Stat label="Total Spend"        value={sumLoading ? "…" : (summary?.totalSpend ?? "—")}       icon={Target}      color="amber" />
        <Stat label="Blended ROAS"       value={sumLoading ? "…" : (summary?.blendedRoas ?? "—")}      icon={TrendingUp}  color="emerald" delta={summary?.roasDelta} />
        <Stat label="Blended CAC"        value={sumLoading ? "…" : (summary?.blendedCac ?? "—")}       icon={Users}       color="sky" delta={summary?.cacDelta} />
      </div>

      <Card>
        <CardHeader title="Channel Attribution (Linear Multi-Touch)" icon={TrendingUp} />
        <CardBody className="space-y-4">
          {chLoading && allChannels.length === 0 && (
            <div className="space-y-3 animate-pulse">
              {[1,2,3,4].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded" />)}
            </div>
          )}
          {!chLoading && allChannels.length === 0 && (
            <p className="text-sm text-slate-500">No channel attribution data available.</p>
          )}
          {allChannels.map(ch => {
            const pct = maxRevenue > 0 ? Math.round(((ch.revenue ?? 0) / maxRevenue) * 100) : 0;
            return (
              <div key={ch.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300 w-36">{ch.name}</span>
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span>Revenue: <strong className="text-slate-800 dark:text-slate-200">{ch.revenueFormatted ?? ch.revenue}</strong></span>
                    <span>ROAS: <strong className="text-emerald-600 dark:text-emerald-400">{ch.roas}x</strong></span>
                    <span>CAC: <strong className="text-slate-800 dark:text-slate-200">{ch.cacFormatted ?? ch.cac}</strong></span>
                  </div>
                </div>
                <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Attribution Models" icon={Target} />
          <CardBody className="space-y-2">
            {modLoading && allModels.length === 0 && (
              <div className="space-y-2 animate-pulse">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700 rounded-lg" />)}
              </div>
            )}
            {!modLoading && allModels.length === 0 && (
              <p className="text-sm text-slate-500">No model data available.</p>
            )}
            {allModels.map(m => (
              <div key={m.model} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="text-sm text-slate-700 dark:text-slate-300">{m.model}</span>
                <div className="text-right text-xs">
                  <p className="font-semibold text-slate-900 dark:text-white">{m.revenue ?? m.rev}</p>
                  <p className="text-slate-400">Top: {m.topChannel ?? m.top}</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="LTV / CAC Ratio by Segment" icon={DollarSign} />
          <CardBody className="space-y-3">
            {ltvLoading && allLtvCac.length === 0 && (
              <div className="space-y-2 animate-pulse">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
              </div>
            )}
            {!ltvLoading && allLtvCac.length === 0 && (
              <p className="text-sm text-slate-500">No LTV/CAC data available.</p>
            )}
            {allLtvCac.map(s => (
              <div key={s.segment} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.segment}</p>
                  <p className="text-xs text-slate-400">LTV {s.ltvFormatted ?? s.ltv} · CAC {s.cacFormatted ?? s.cac}</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${(s.ratio ?? 0) >= 15 ? "text-emerald-600 dark:text-emerald-400" : (s.ratio ?? 0) >= 10 ? "text-amber-600 dark:text-amber-400" : "text-red-500"}`}>
                    {s.ratio}x
                  </p>
                  <p className="text-xs text-slate-400">LTV:CAC</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
