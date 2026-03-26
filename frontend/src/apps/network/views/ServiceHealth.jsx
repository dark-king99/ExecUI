import PageHeader from "../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import { HeartPulse, CheckCircle, AlertTriangle, XCircle, AlertCircle } from "lucide-react";
import { useApi } from "../../../hooks/useApi";
import { network } from "../../../services/api";

const statusVariant = { healthy: "success", "at-risk": "warning", breached: "danger" };
const statusIcon    = { healthy: CheckCircle, "at-risk": AlertTriangle, breached: XCircle };

function BudgetBar({ budget }) {
  const color = budget > 50 ? "bg-emerald-500" : budget > 20 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${budget}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{budget}%</span>
    </div>
  );
}

export default function ServiceHealth() {
  const { data: services, loading, error } = useApi(
    () => network.serviceHealth.list(), [], { pollingInterval: 30000 }
  );

  const allServices = services ?? [];
  const healthy  = allServices.filter(s => s.status === "healthy").length;
  const atRisk   = allServices.filter(s => s.status === "at-risk").length;
  const breached = allServices.filter(s => s.status === "breached").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Health (SLO / SLI)"
        subtitle="Availability and error budget tracking for critical network services"
      />

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Healthy"  value={loading ? "…" : healthy}  icon={CheckCircle}  color="emerald" />
        <Stat label="At Risk"  value={loading ? "…" : atRisk}   icon={AlertTriangle} color="amber" />
        <Stat label="Breached" value={loading ? "…" : breached} icon={XCircle}      color="red" />
      </div>

      {loading && allServices.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
        </div>
      )}

      {!loading && !error && allServices.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">No service health data available.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {allServices.map(svc => {
          const Icon = statusIcon[svc.status] ?? HeartPulse;
          return (
            <Card key={svc.id ?? svc.name}>
              <CardBody>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{svc.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Tier {svc.tier}</p>
                  </div>
                  <StatusBadge label={svc.status.replace("-", " ")} variant={statusVariant[svc.status] ?? "neutral"} dot />
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">SLO Target</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{svc.slo}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Actual (30d)</span>
                    <span className={`font-semibold ${svc.actual >= svc.slo ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {svc.actual}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Error Budget</span>
                    <BudgetBar budget={svc.budget ?? 0} />
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
