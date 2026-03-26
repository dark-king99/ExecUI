import { useMemo } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { Target, TrendingUp, DollarSign, Users, Plus, AlertCircle } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { crm } from "../../services/api";

const RISK_VARIANT   = { low: "success", medium: "warning", high: "danger" };
const STAGE_VARIANT  = { Prospecting: "neutral", Qualified: "info", Proposal: "indigo", Negotiation: "warning", "Closed Won": "success" };
const STAGE_COLORS   = ["bg-slate-300 dark:bg-slate-600", "bg-sky-400", "bg-indigo-500", "bg-violet-500", "bg-emerald-500"];

export default function OpportunityWorkspace() {
  const { data: summary, loading: summaryLoading } = useApi(
    () => crm.opportunities.summary(), [], { pollingInterval: 60000 }
  );
  const { data: opportunities, loading: oppsLoading, error: oppsError } = useApi(
    () => crm.opportunities.list({ limit: 100 }), [], { pollingInterval: 60000 }
  );

  const allOpps = opportunities ?? [];

  const stages = useMemo(() => {
    const map = {};
    allOpps.forEach(o => {
      if (!map[o.stage]) map[o.stage] = { label: o.stage, count: 0, value: 0 };
      map[o.stage].count += 1;
      map[o.stage].value += o.rawValue ?? 0;
    });
    return Object.values(map);
  }, [allOpps]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opportunities"
        subtitle="Stage progression, risk scoring, next-best-action and stakeholder map"
        actions={
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition">
            <Plus size={15} /> New Opportunity
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Open Opps"      value={summaryLoading ? "…" : (summary?.openCount       ?? allOpps.length)} icon={Target}     color="indigo" />
        <Stat label="Pipeline Value" value={summaryLoading ? "…" : (summary?.pipelineValue   ?? "—")}            icon={DollarSign} color="sky" />
        <Stat label="Avg Deal Size"  value={summaryLoading ? "…" : (summary?.avgDealSize     ?? "—")}            icon={TrendingUp} color="emerald" delta={summary?.avgDealSizeDelta} />
        <Stat label="Win Rate (90d)" value={summaryLoading ? "…" : (summary?.winRate         ?? "—")}            icon={Users}      color="amber" />
      </div>

      <Card>
        <CardHeader title="Pipeline Funnel" icon={Target} />
        <CardBody>
          {oppsLoading && stages.length === 0 ? (
            <div className="space-y-3 animate-pulse">
              {[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-slate-100 dark:bg-slate-700 rounded-full" />)}
            </div>
          ) : stages.length > 0 ? (
            <div className="space-y-3">
              {stages.map((s, i) => (
                <div key={s.label} className="flex items-center gap-4">
                  <div className="w-28 text-sm text-slate-700 dark:text-slate-300 shrink-0">{s.label}</div>
                  <div className="flex-1 h-7 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${STAGE_COLORS[i % STAGE_COLORS.length]} flex items-center px-3`}
                      style={{ width: `${Math.max(15, 100 - i * 18)}%` }}
                    >
                      <span className="text-xs font-semibold text-white">{s.count} deals</span>
                    </div>
                  </div>
                  <div className="w-16 text-sm font-semibold text-slate-700 dark:text-slate-300 text-right">{s.value ? `$${(s.value/1000).toFixed(0)}k` : "—"}</div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500 text-center py-4">No pipeline data available.</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Active Opportunities" icon={DollarSign} />
        <CardBody>
          {oppsError && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mb-3">
              <AlertCircle size={15} /> {oppsError}
            </div>
          )}

          {oppsLoading && allOpps.length === 0 && (
            <div className="space-y-3 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
            </div>
          )}

          {!oppsLoading && !oppsError && allOpps.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">No opportunities found.</p>
          )}

          <div className="space-y-3">
            {allOpps.map(opp => (
              <div key={opp.id ?? opp.name} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{opp.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge label={opp.stage} variant={STAGE_VARIANT[opp.stage] ?? "neutral"} />
                    {opp.close && <span className="text-xs text-slate-400">Close: {opp.close}</span>}
                    {opp.owner && <span className="text-xs text-slate-400">Owner: {opp.owner}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {opp.risk && <StatusBadge label={`${opp.risk} risk`} variant={RISK_VARIANT[opp.risk] ?? "neutral"} dot />}
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{opp.value}</span>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
