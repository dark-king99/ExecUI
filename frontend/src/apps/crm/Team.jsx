import { useState, useMemo } from "react";
import { Users, TrendingUp, Award, Target, RefreshCw, Search, AlertCircle } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useApi } from "../../hooks/useApi";
import { crm } from "../../services/api";

const TIER_VARIANT = { elite: "success", strong: "info", developing: "warning", new: "neutral" };

export default function Team() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("reps");
  const { data: reps, loading, error, refetch } = useApi(() => crm.reps.list({ limit: 100 }), [], { pollingInterval: 60000 });
  const { data: summary, loading: sumLoading } = useApi(() => crm.reps.summary(), [], { pollingInterval: 120000 });
  const all = reps ?? [];

  const filtered = useMemo(() => all.filter(r =>
    !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.email?.toLowerCase().includes(search.toLowerCase())
  ), [all, search]);

  const stats = useMemo(() => ({
    total: all.length,
    quota: Math.round(all.filter(r => (r.attainment ?? 0) >= 100).length / Math.max(1, all.length) * 100),
    avgAttainment: all.length ? Math.round(all.reduce((s, r) => s + (r.attainment ?? 0), 0) / all.length) : 0,
    topPerformer: all.reduce((best, r) => (r.attainment ?? 0) > (best?.attainment ?? 0) ? r : best, null),
  }), [all]);

  return (
    <div className="space-y-6">
      <PageHeader title="Sales Team" subtitle="Performance overview for every rep on your team"
        actions={<button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh</button>}
      />

      {sumLoading && all.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total Reps" value={summary?.totalReps ?? all.length} icon={Users} color="orange" />
          <Stat label="Avg Attainment" value={summary?.avgAttainment != null ? `${summary.avgAttainment}%` : stats.avgAttainment ? `${stats.avgAttainment}%` : "—"} icon={Target} color="sky" />
          <Stat label="At Quota" value={summary?.atQuota != null ? `${summary.atQuota}%` : stats.quota ? `${stats.quota}%` : "—"} icon={Award} color="emerald" />
          <Stat label="Team Revenue" value={summary?.teamRevenue ?? "—"} icon={TrendingUp} color="amber" />
        </div>
      )}

      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}

      <div className="flex items-center gap-3">
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          {["reps", "leaderboard"].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm font-medium capitalize transition ${tab === t ? "bg-orange-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{t}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 flex-1 max-w-64">
          <Search size={14} className="text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reps…" className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white" />
        </div>
      </div>

      {tab === "reps" && (
        <Card>
          {loading && all.length === 0 ? <div className="p-5"><SkeletonTable rows={8} /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    {["Rep", "Title / Region", "Open Deals", "Pipeline", "Won", "Attainment", "Tier"].map(h => (
                      <th key={h} className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-500">No reps found.</td></tr>
                  ) : filtered.map((r, i) => (
                    <tr key={r.id ?? i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 font-semibold text-sm">{(r.name ?? r.rep ?? "?")[0].toUpperCase()}</div>
                          <div>
                            <div className="font-medium text-slate-900 dark:text-white">{r.name ?? r.rep}</div>
                            <div className="text-xs text-slate-400">{r.email ?? ""}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">{r.title ?? r.role ?? "—"}{r.region ? ` • ${r.region}` : ""}</td>
                      <td className="p-4 text-slate-900 dark:text-white font-medium">{r.openDeals ?? r.deals ?? "—"}</td>
                      <td className="p-4 text-slate-900 dark:text-white">{r.pipeline ?? "—"}</td>
                      <td className="p-4 text-slate-900 dark:text-white font-semibold">{r.won ?? r.wonRevenue ?? "—"}</td>
                      <td className="p-4">
                        {r.attainment != null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${r.attainment >= 100 ? "bg-emerald-500" : r.attainment >= 70 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, r.attainment)}%` }} />
                            </div>
                            <span className={`text-xs font-bold ${r.attainment >= 100 ? "text-emerald-600" : r.attainment >= 70 ? "text-amber-600" : "text-red-500"}`}>{r.attainment}%</span>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="p-4">{r.tier ? <StatusBadge label={r.tier} variant={TIER_VARIANT[r.tier] ?? "neutral"} /> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "leaderboard" && (
        <Card>
          <CardHeader title="Quota Attainment Leaderboard" icon={Award} />
          <CardBody>
            {loading && all.length === 0 ? <SkeletonTable rows={8} /> : (
              <div className="space-y-3">
                {[...filtered].sort((a, b) => (b.attainment ?? 0) - (a.attainment ?? 0)).map((r, i) => {
                  const att = r.attainment ?? 0;
                  return (
                    <div key={r.id ?? i} className="flex items-center gap-4">
                      <div className="w-6 text-sm font-bold text-slate-400 text-right shrink-0">{i + 1}</div>
                      <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 font-semibold text-sm shrink-0">{(r.name ?? r.rep ?? "?")[0].toUpperCase()}</div>
                      <div className="w-32 shrink-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{r.name ?? r.rep}</div>
                        <div className="text-xs text-slate-400">{r.won ?? r.wonRevenue ?? ""}</div>
                      </div>
                      <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${att >= 100 ? "bg-emerald-500" : att >= 70 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, att)}%` }} />
                      </div>
                      <div className={`w-12 text-right text-sm font-bold shrink-0 ${att >= 100 ? "text-emerald-600" : att >= 70 ? "text-amber-600" : "text-red-500"}`}>{att}%</div>
                    </div>
                  );
                })}
                {filtered.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No reps to display.</p>}
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
