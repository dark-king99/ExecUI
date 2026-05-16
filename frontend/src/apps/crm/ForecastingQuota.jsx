import { useState } from "react";
import { Target, DollarSign, TrendingUp, Award, RefreshCw, AlertCircle } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useApi } from "../../hooks/useApi";
import { crm } from "../../services/api";

const CATEGORY_VARIANT = { Commit: "success", "Best Case": "info", Pipeline: "warning", Omit: "neutral" };

function QuotaBar({ label, actual, quota, color }) {
  const pct = quota ? Math.min(100, Math.round((actual / quota) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <span className="text-slate-500 text-xs">{pct}% of quota</span>
      </div>
      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-slate-400">
        <span>Actual: {actual != null ? `$${(actual / 1000).toFixed(0)}k` : "—"}</span>
        <span>Quota: {quota != null ? `$${(quota / 1000).toFixed(0)}k` : "—"}</span>
      </div>
    </div>
  );
}

export default function ForecastingQuota() {
  const [tab, setTab] = useState("summary");
  const { data: summary, loading: sumLoading, error, refetch } = useApi(() => crm.forecast.summary(), [], { pollingInterval: 120000 });
  const { data: byRep, loading: repLoading } = useApi(() => crm.forecast.byRep(), [], { pollingInterval: 120000 });
  const { data: categories, loading: catLoading } = useApi(() => crm.forecast.categories(), [], { pollingInterval: 120000 });
  const reps = byRep ?? [];
  const cats = categories ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Forecasting & Quota" subtitle="Revenue forecast, quota attainment, and category breakdown"
        actions={<button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh</button>}
      />

      {sumLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Forecast (QTD)" value={summary?.forecast ?? "—"} icon={Target} color="orange" />
          <Stat label="Quota" value={summary?.quota ?? "—"} icon={DollarSign} color="emerald" />
          <Stat label="Attainment" value={summary?.attainment != null ? `${summary.attainment}%` : "—"} icon={TrendingUp} color="sky" delta={summary?.attainmentDelta} />
          <Stat label="Commit" value={summary?.commit ?? "—"} icon={Award} color="amber" />
        </div>
      )}

      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}

      {summary && (
        <Card>
          <CardHeader title="Quota Attainment" icon={Target} />
          <CardBody className="space-y-5">
            <QuotaBar label="Closed Won" actual={summary.closedWonRaw} quota={summary.quotaRaw} color="bg-emerald-500" />
            <QuotaBar label="Commit" actual={summary.commitRaw} quota={summary.quotaRaw} color="bg-sky-500" />
            <QuotaBar label="Best Case" actual={summary.bestCaseRaw} quota={summary.quotaRaw} color="bg-indigo-500" />
            <QuotaBar label="Pipeline" actual={summary.pipelineRaw} quota={summary.quotaRaw} color="bg-amber-400" />
          </CardBody>
        </Card>
      )}

      <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden w-fit">
        {["summary", "by-rep", "categories"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm font-medium capitalize transition ${tab === t ? "bg-orange-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{t.replace("-", " ")}</button>
        ))}
      </div>

      {tab === "by-rep" && (
        <Card>
          <CardHeader title="Forecast by Rep" icon={TrendingUp} />
          <CardBody>
            {repLoading ? <SkeletonTable rows={6} /> : reps.length === 0 ? (
              <p className="text-sm text-center text-slate-500 py-6">No rep data available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      {["Rep", "Quota", "Commit", "Best Case", "Pipeline", "Attainment"].map(h => (
                        <th key={h} className="text-left pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider pr-4 last:pr-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reps.map((r, i) => {
                      const att = r.quota && r.commit ? Math.round((r.commitRaw / r.quotaRaw) * 100) : r.attainment;
                      return (
                        <tr key={r.id ?? i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">{r.name ?? r.rep}</td>
                          <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{r.quota ?? "—"}</td>
                          <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{r.commit ?? "—"}</td>
                          <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{r.bestCase ?? r.best_case ?? "—"}</td>
                          <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{r.pipeline ?? "—"}</td>
                          <td className="py-3">
                            <span className={`text-xs font-bold ${(att ?? 0) >= 100 ? "text-emerald-600" : (att ?? 0) >= 70 ? "text-amber-600" : "text-red-500"}`}>
                              {att != null ? `${att}%` : "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {tab === "categories" && (
        <Card>
          <CardHeader title="Forecast Categories" icon={Award} />
          <CardBody>
            {catLoading ? <SkeletonTable rows={4} /> : cats.length === 0 ? (
              <p className="text-sm text-center text-slate-500 py-6">No category data available.</p>
            ) : (
              <div className="space-y-4">
                {cats.map((c, i) => (
                  <div key={c.category ?? i} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">{c.category}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{c.count ?? 0} deals</span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${c.pct ?? 0}%` }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-slate-900 dark:text-white">{c.value ?? "—"}</div>
                      <div className="text-xs text-slate-400">{c.pct != null ? `${c.pct}% of forecast` : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {tab === "summary" && summary && (
        <Card>
          <CardHeader title="Summary Metrics" icon={DollarSign} />
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                ["Closed Won", summary.closedWon],
                ["Commit", summary.commit],
                ["Best Case", summary.bestCase ?? summary.best_case],
                ["Pipeline", summary.pipeline],
                ["Gap to Quota", summary.gap],
                ["Expected Close", summary.expectedClose ?? summary.expected],
              ].map(([l, v]) => v != null ? (
                <div key={l} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="text-xs text-slate-500 mb-1">{l}</div>
                  <div className="font-bold text-slate-900 dark:text-white">{v}</div>
                </div>
              ) : null)}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
