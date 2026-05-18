import { useState, useMemo } from "react";
import { BarChart2, DollarSign, TrendingUp, Users, RefreshCw, AlertCircle } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useApi } from "../../hooks/useApi";
import { crm } from "../../services/api";

const STAGES = ["Discovery", "Qualified", "Proposal", "Negotiation", "Closed Won"];
const STAGE_VARIANT = { Discovery: "neutral", Qualified: "info", Proposal: "warning", Negotiation: "indigo", "Closed Won": "success" };
const STAGE_COLORS = ["bg-slate-400", "bg-sky-500", "bg-indigo-500", "bg-violet-500", "bg-emerald-500"];

export default function PipelineTracking() {
  const [view, setView] = useState("stages");
  const { data: summary, loading: sumLoading } = useApi(() => crm.pipeline.summary(), [], { pollingInterval: 60000 });
  const { data: owners, loading: ownLoading } = useApi(() => crm.pipeline.owners(), [], { pollingInterval: 60000 });
  const { data: deals, loading: dealsLoading, error, refetch } = useApi(() => crm.deals.list({ limit: 300 }), [], { pollingInterval: 60000 });
  const all = deals ?? [];
  const ownersList = owners ?? [];

  const stageData = useMemo(() => STAGES.map((stage, i) => {
    const stageDeals = all.filter(d => d.stage === stage);
    const total = stageDeals.reduce((s, d) => s + (d.rawValue ?? 0), 0);
    return { stage, count: stageDeals.length, total, color: STAGE_COLORS[i], deals: stageDeals };
  }), [all]);

  const maxCount = Math.max(1, ...stageData.map(s => s.count));
  const totalPipeline = all.filter(d => d.stage !== "Closed Won" && d.stage !== "Closed Lost").reduce((s, d) => s + (d.rawValue ?? 0), 0);
  const closedWon = all.filter(d => d.stage === "Closed Won").reduce((s, d) => s + (d.rawValue ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Pipeline Tracking" subtitle="Monitor deal flow and conversion across every stage"
        actions={<button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh</button>}
      />

      {sumLoading && all.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total Pipeline" value={totalPipeline ? `$${(totalPipeline / 1000).toFixed(0)}k` : (summary?.totalPipeline ?? "—")} icon={DollarSign} color="orange" />
          <Stat label="Deals in Pipeline" value={all.filter(d => d.stage !== "Closed Won" && d.stage !== "Closed Lost").length} icon={BarChart2} color="sky" />
          <Stat label="Won Revenue" value={closedWon ? `$${(closedWon / 1000).toFixed(0)}k` : (summary?.wonRevenue ?? "—")} icon={TrendingUp} color="emerald" />
          <Stat label="Active Reps" value={summary?.activeReps ?? (ownersList.length || "—")} icon={Users} color="amber" />
        </div>
      )}

      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}

      <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden w-fit">
        {["stages", "owners", "deals"].map(v => (
          <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 text-sm font-medium capitalize transition ${view === v ? "bg-orange-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{v}</button>
        ))}
      </div>

      {view === "stages" && (
        <Card>
          <CardHeader title="Stage Funnel" icon={BarChart2} />
          <CardBody className="space-y-5">
            {dealsLoading && all.length === 0 ? <SkeletonTable rows={5} /> : stageData.map(({ stage, count, total, color }) => (
              <div key={stage} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{stage}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-500">{count} deals</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{total ? `$${(total / 1000).toFixed(0)}k` : "—"}</span>
                  </div>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.max(4, (count / maxCount) * 100)}%` }} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {view === "owners" && (
        <Card>
          <CardHeader title="Pipeline by Owner" icon={Users} />
          <CardBody>
            {ownLoading ? <SkeletonTable rows={6} /> : ownersList.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No owner data available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      {["Rep", "Open Deals", "Pipeline Value", "Avg Deal", "Win Rate"].map(h => (
                        <th key={h} className="text-left pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {ownersList.map((o, i) => (
                      <tr key={o.id ?? i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">{o.name ?? o.rep}</td>
                        <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{o.openDeals ?? o.deals ?? "—"}</td>
                        <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-white">{o.pipelineValue ?? o.value ?? "—"}</td>
                        <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{o.avgDeal ?? "—"}</td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs font-semibold ${(o.winRate ?? 0) >= 50 ? "text-emerald-600" : "text-amber-600"}`}>{o.winRate != null ? `${o.winRate}%` : "—"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {view === "deals" && (
        <Card>
          <CardHeader title="All Deals" icon={BarChart2} />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {dealsLoading && all.length === 0 ? <div className="p-5"><SkeletonTable rows={8} /></div> : all.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">No deals found.</p>
            ) : all.map(d => (
              <div key={d.id ?? d.name} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-slate-900 dark:text-white">{d.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{d.account}{d.owner ? ` • ${d.owner}` : ""}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge label={d.stage} variant={STAGE_VARIANT[d.stage] ?? "neutral"} />
                  <span className="font-bold text-sm text-slate-900 dark:text-white min-w-16 text-right">{d.value}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
