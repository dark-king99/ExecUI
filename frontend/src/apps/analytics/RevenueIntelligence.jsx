import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useApi } from "../../hooks/useApi";
import { analytics } from "../../services/api";
import { DollarSign, TrendingUp, Users, RefreshCw } from "lucide-react";

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3">
      <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline">
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}

export default function RevenueIntelligence() {
  const {
    data: segments,
    loading: segLoading,
    error: segError,
    refetch: refetchSeg,
  } = useApi(() => analytics.revenueSegments(), [], { pollingInterval: 120000 });

  const {
    data: expansion,
    loading: expLoading,
    error: expError,
    refetch: refetchExp,
  } = useApi(() => analytics.expansionPipeline(), [], { pollingInterval: 120000 });

  const {
    data: kpis,
    loading: kpisLoading,
  } = useApi(() => analytics.kpis(), [], { pollingInterval: 120000 });

  const arrKpi      = kpis?.find((k) => k.label === "ARR");
  const nrrKpi      = kpis?.find((k) => k.label === "NRR");
  const expansionArr = expansion?.reduce((s, e) => s + (e.upsideRaw ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue Intelligence"
        subtitle="ARR breakdown, NRR, expansion pipeline and upsell signals"
        actions={
          <button
            onClick={() => { refetchSeg(); refetchExp(); }}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />

      {/* Top KPIs */}
      {kpisLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total ARR"     value={arrKpi?.value ?? "—"}  icon={DollarSign}  color="indigo" delta={arrKpi?.delta} />
          <Stat label="NRR"           value={nrrKpi?.value ?? "—"}  icon={TrendingUp}  color="emerald" delta={nrrKpi?.delta} />
          <Stat
            label="Expansion ARR"
            value={expansionArr != null ? `$${(expansionArr / 1000).toFixed(0)}k` : "—"}
            icon={RefreshCw}
            color="sky"
          />
          <Stat label="Gross Churn"   value={segments?.length ? "—" : "—"} icon={Users} color="amber" />
        </div>
      )}

      {/* ARR by segment */}
      <Card>
        <CardHeader title="ARR by Segment" icon={DollarSign} />
        <CardBody className="space-y-4">
          {segError && <ErrorBanner message={segError} onRetry={refetchSeg} />}
          {segLoading ? (
            <SkeletonTable rows={4} />
          ) : segments?.length > 0 ? (
            segments.map((seg) => (
              <div key={seg.name} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${
                      seg.health === "green" ? "bg-emerald-500" : seg.health === "yellow" ? "bg-amber-500" : "bg-red-500"
                    }`} />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{seg.name}</p>
                  </div>
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{seg.arr}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs text-slate-500">
                  <div><p className="font-semibold text-slate-800 dark:text-slate-200">+{seg.growth}%</p>YoY Growth</div>
                  <div><p className="font-semibold text-slate-800 dark:text-slate-200">{seg.churn}</p>Gross Churn</div>
                  <div>
                    <p className={`font-semibold ${seg.nrr !== "—" && parseFloat(seg.nrr) >= 100 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                      {seg.nrr}
                    </p>
                    NRR
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 text-center py-6">No segment data available.</p>
          )}
        </CardBody>
      </Card>

      {/* Expansion pipeline */}
      <Card>
        <CardHeader title="Expansion Pipeline" icon={TrendingUp} />
        <CardBody className="space-y-3">
          {expError && <ErrorBanner message={expError} onRetry={refetchExp} />}
          {expLoading ? (
            <SkeletonTable rows={4} />
          ) : expansion?.length > 0 ? (
            expansion.map((exp) => (
              <div key={exp.account} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{exp.account}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{exp.product} · Current ARR: {exp.arr}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{exp.upside}</p>
                  <p className="text-xs text-slate-400">{exp.probability}% probability</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 text-center py-6">No expansion opportunities found.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
