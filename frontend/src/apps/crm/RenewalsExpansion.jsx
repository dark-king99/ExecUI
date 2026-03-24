import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { RefreshCw, TrendingUp, AlertTriangle, DollarSign, AlertCircle } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { crm } from "../../services/api";

const HEALTH_DOT   = { green: "bg-emerald-500", yellow: "bg-amber-500", red: "bg-red-500" };
const STATUS_VARIANT = { "on-track": "success", "at-risk": "warning", critical: "danger" };

export default function RenewalsExpansion() {
  const { data: renewals, loading: renewalsLoading, error: renewalsError } = useApi(
    () => crm.renewals.list({ limit: 100 }), [], { pollingInterval: 60000 }
  );
  const { data: summary, loading: summaryLoading } = useApi(
    () => crm.renewals.summary(), [], { pollingInterval: 60000 }
  );

  const allRenewals = renewals ?? [];
  const atRisk = allRenewals.filter(r => r.status !== "on-track").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Renewals & Expansion"
        subtitle="Contract milestones, health scores and expansion opportunity tracking"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Renewing ARR"       value={summaryLoading ? "…" : (summary?.renewingArr    ?? "—")} icon={DollarSign}    color="indigo" />
        <Stat label="Expansion Pipeline" value={summaryLoading ? "…" : (summary?.expansionTotal ?? "—")} icon={TrendingUp}    color="emerald" />
        <Stat label="At Risk"            value={summaryLoading ? "…" : (summary?.atRisk         ?? atRisk)} icon={AlertTriangle} color="amber" />
        <Stat label="Avg Days to Renew"  value={summaryLoading ? "…" : (summary?.avgDays        ?? "—")} icon={RefreshCw}     color="sky" />
      </div>

      {renewalsError && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {renewalsError}
        </div>
      )}

      {renewalsLoading && allRenewals.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-36 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
        </div>
      )}

      {!renewalsLoading && !renewalsError && allRenewals.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">No renewal records found.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {allRenewals.map(r => (
          <Card key={r.account ?? r.id}>
            <CardBody>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {r.health && <div className={`h-2.5 w-2.5 rounded-full ${HEALTH_DOT[r.health] ?? "bg-slate-400"}`} />}
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{r.account}</p>
                </div>
                <StatusBadge label={r.status?.replace("-", " ")} variant={STATUS_VARIANT[r.status] ?? "neutral"} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <span className="block text-slate-400">ARR</span>
                  <span className="font-bold text-slate-900 dark:text-white">{r.arr}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <span className="block text-slate-400">Renews in</span>
                  <span className={`font-bold ${(r.daysLeft ?? 99) <= 14 ? "text-red-600 dark:text-red-400" : (r.daysLeft ?? 99) <= 30 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
                    {r.daysLeft ?? "—"}d
                  </span>
                </div>
              </div>
              {r.expansion && r.expansion !== "$0" && r.expansion !== 0 && (
                <div className="mt-3 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    Expansion opportunity: {r.expansion}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
