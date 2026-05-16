import { useState } from "react";
import { DollarSign, TrendingUp, BarChart3, Target, RefreshCw, AlertCircle } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useApi } from "../../hooks/useApi";
import { marketing } from "../../services/api";

const CHANNEL_COLORS = { email: "bg-violet-500", social: "bg-sky-500", paid: "bg-amber-500", organic: "bg-emerald-500", direct: "bg-slate-400", events: "bg-indigo-500", content: "bg-orange-500" };

export default function AttributionROI() {
  const [tab, setTab] = useState("channels");
  const { data: channels, loading: chanLoading, error, refetch } = useApi(() => marketing.attribution.channels(), [], { pollingInterval: 120000 });
  const { data: summary, loading: sumLoading } = useApi(() => marketing.attribution.summary(), [], { pollingInterval: 120000 });
  const { data: models } = useApi(() => marketing.attribution.models(), [], { pollingInterval: 300000 });
  const { data: ltvCac } = useApi(() => marketing.attribution.ltvCac(), [], { pollingInterval: 300000 });

  const allChannels = channels ?? [];
  const s = summary ?? {};
  const allModels = models ?? [];
  const ltv = ltvCac ?? {};
  const maxRev = Math.max(1, ...allChannels.map(c => c.revenue ?? c.value ?? 0));

  return (
    <div className="space-y-6">
      <PageHeader title="Attribution & ROI" subtitle="Understand the true impact and ROI of every marketing channel"
        actions={<button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh</button>}
      />
      {sumLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total Revenue" value={s.totalRevenue ?? "—"} icon={DollarSign} color="violet" delta={s.revenueDelta} />
          <Stat label="Marketing ROI" value={s.roi != null ? `${s.roi}%` : "—"} icon={TrendingUp} color="emerald" />
          <Stat label="Avg LTV" value={ltv.ltv ?? s.avgLtv ?? "—"} icon={Target} color="sky" />
          <Stat label="CAC" value={ltv.cac ?? s.cac ?? "—"} icon={BarChart3} color="amber" />
        </div>
      )}
      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}
      <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden w-fit">
        {["channels", "models", "ltv-cac"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm font-medium capitalize transition ${tab === t ? "bg-violet-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{t.replace("-", " ")}</button>
        ))}
      </div>
      {tab === "channels" && (
        <Card>
          <CardHeader title="Channel Attribution" icon={BarChart3} />
          <CardBody>
            {chanLoading ? <SkeletonTable rows={6} /> : allChannels.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No channel data available.</p>
            ) : (
              <div className="space-y-5">
                {allChannels.map((ch, i) => {
                  const rev = ch.revenue ?? ch.value ?? 0;
                  const pct = Math.max(4, Math.round((rev / maxRev) * 100));
                  const color = CHANNEL_COLORS[ch.channel?.toLowerCase()] ?? "bg-violet-500";
                  return (
                    <div key={ch.channel ?? i} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">{ch.channel ?? ch.name}</span>
                        <div className="flex items-center gap-4 text-xs">
                          {ch.leads != null && <span className="text-slate-500">{ch.leads} leads</span>}
                          {ch.conversion != null && <span className="text-slate-500">{ch.conversion}% conv.</span>}
                          {ch.roi != null && <span className="text-emerald-600 font-semibold">{ch.roi}% ROI</span>}
                          <span className="font-bold text-slate-900 dark:text-white">{ch.revenue ?? ch.value ?? "—"}</span>
                        </div>
                      </div>
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      )}
      {tab === "models" && (
        <Card>
          <CardHeader title="Attribution Models" icon={Target} />
          <CardBody>
            {allModels.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No model data available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allModels.map((m, i) => (
                  <div key={m.name ?? i} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{m.name}</h3>
                      {m.active && <span className="text-xs text-violet-600 font-medium bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 rounded-full">Active</span>}
                    </div>
                    {m.description && <p className="text-xs text-slate-500 mb-3">{m.description}</p>}
                    {m.channels && (
                      <div className="space-y-1">
                        {Object.entries(m.channels).map(([ch, pct]) => (
                          <div key={ch} className="flex items-center gap-2 text-xs">
                            <span className="w-20 text-slate-500 capitalize">{ch}</span>
                            <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-slate-600 dark:text-slate-300 w-8 text-right">{pct}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}
      {tab === "ltv-cac" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Customer Lifetime Value" icon={TrendingUp} />
            <CardBody>
              <div className="space-y-3">
                {[["Average LTV", ltv.ltv ?? s.avgLtv], ["LTV by Segment", null], ...Object.entries(ltv.bySegment ?? {}).map(([k, v]) => [k, v])].filter(([, v]) => v != null).map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 text-sm">
                    <span className="text-slate-600 dark:text-slate-400 capitalize">{l}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{v}</span>
                  </div>
                ))}
                {!ltv.ltv && !s.avgLtv && <p className="text-sm text-slate-500">No LTV data available.</p>}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Customer Acquisition Cost" icon={DollarSign} />
            <CardBody>
              <div className="space-y-3">
                {[["Overall CAC", ltv.cac ?? s.cac], ["LTV:CAC Ratio", ltv.ltvCacRatio], ...Object.entries(ltv.cacByChannel ?? {}).map(([k, v]) => [`${k} CAC`, v])].filter(([, v]) => v != null).map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 text-sm">
                    <span className="text-slate-600 dark:text-slate-400 capitalize">{l}</span>
                    <span className={`font-semibold ${l.includes("Ratio") && v >= 3 ? "text-emerald-600" : "text-slate-900 dark:text-white"}`}>{v}</span>
                  </div>
                ))}
                {!ltv.cac && !s.cac && <p className="text-sm text-slate-500">No CAC data available.</p>}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
