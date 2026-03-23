import PageHeader from "../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import { HeartPulse, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

const services = [
  { name: "Customer Portal",    slo: 99.9,  actual: 99.95, budget: 100, status: "healthy",  tier: "P1" },
  { name: "API Gateway",        slo: 99.5,  actual: 99.2,  budget: 12,  status: "at-risk",  tier: "P1" },
  { name: "VPN Service",        slo: 99.0,  actual: 98.7,  budget: 6,   status: "breached", tier: "P2" },
  { name: "DNS Resolution",     slo: 99.9,  actual: 99.98, budget: 100, status: "healthy",  tier: "P1" },
  { name: "Network Monitoring", slo: 99.0,  actual: 99.5,  budget: 100, status: "healthy",  tier: "P2" },
  { name: "Remote Access",      slo: 98.0,  actual: 98.2,  budget: 85,  status: "healthy",  tier: "P3" },
];

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
  const healthy  = services.filter(s => s.status === "healthy").length;
  const atRisk   = services.filter(s => s.status === "at-risk").length;
  const breached = services.filter(s => s.status === "breached").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Health (SLO / SLI)"
        subtitle="Availability and error budget tracking for critical network services"
      />

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Healthy"  value={healthy}  icon={CheckCircle}  color="emerald" />
        <Stat label="At Risk"  value={atRisk}   icon={AlertTriangle} color="amber" />
        <Stat label="Breached" value={breached} icon={XCircle}      color="red" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {services.map(svc => {
          const Icon = statusIcon[svc.status];
          return (
            <Card key={svc.name}>
              <CardBody>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{svc.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Tier {svc.tier}</p>
                  </div>
                  <StatusBadge label={svc.status.replace("-", " ")} variant={statusVariant[svc.status]} dot />
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
                    <BudgetBar budget={svc.budget} />
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
