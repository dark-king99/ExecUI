import { useState } from "react";
import { HeartPulse, RefreshCw, AlertCircle, CheckCircle, AlertTriangle, XCircle, ChevronRight, X } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../../components/ui/Skeleton";
import { useApi } from "../../../hooks/useApi";
import { network } from "../../../services/api";

const STATUS_VARIANT = { healthy: "success", "at-risk": "warning", breached: "danger", degraded: "warning", down: "danger" };
const STATUS_ICON = { healthy: CheckCircle, "at-risk": AlertTriangle, breached: XCircle, degraded: AlertTriangle, down: XCircle };

function BudgetBar({ budget }) {
  const pct = budget ?? 0;
  const color = pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold ${pct > 50 ? "text-emerald-600 dark:text-emerald-400" : pct > 20 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>{pct}%</span>
    </div>
  );
}

export default function ServiceHealth() {
  const [selected, setSelected] = useState(null);

  const { data: services, loading, error, refetch } = useApi(() => network.serviceHealth.list(), [], { pollingInterval: 30000 });
  const { data: detail, loading: detailLoading } = useApi(
    () => selected ? network.serviceHealth.get(selected) : Promise.resolve(null),
    [selected], {}
  );

  const all = services ?? [];
  const selectedSvc = detail ?? all.find(s => s.id === selected);
  const healthy = all.filter(s => s.status === "healthy").length;
  const atRisk = all.filter(s => s.status === "at-risk" || s.status === "degraded").length;
  const breached = all.filter(s => s.status === "breached" || s.status === "down").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Service Health (SLOs)" subtitle="Track SLO compliance, error budgets, and service uptime"
        actions={<button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh</button>}
      />

      {loading && all.length === 0 ? (
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Healthy" value={healthy} icon={CheckCircle} color="emerald" />
          <Stat label="At Risk" value={atRisk} icon={AlertTriangle} color="amber" />
          <Stat label="Breached" value={breached} icon={XCircle} color="red" />
        </div>
      )}

      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}

      <div className={`grid gap-4 ${selectedSvc ? "grid-cols-1 lg:grid-cols-5" : "grid-cols-1"}`}>
        <div className={selectedSvc ? "lg:col-span-3" : ""}>
          <Card>
            {loading && all.length === 0 ? <div className="p-5"><SkeletonTable rows={8} /></div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      {["Service", "Status", "SLO Target", "Current", "Error Budget", "Uptime", ""].map(h => (
                        <th key={h} className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {all.length === 0 ? (
                      <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-500">No services tracked. Configure service health monitoring.</td></tr>
                    ) : all.map((svc, i) => {
                      const Icon = STATUS_ICON[svc.status] ?? HeartPulse;
                      return (
                        <tr key={svc.id ?? i} onClick={() => setSelected(svc.id === selected ? null : svc.id)} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition ${selected === svc.id ? "bg-emerald-50 dark:bg-emerald-900/10" : ""}`}>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Icon size={14} className={svc.status === "healthy" ? "text-emerald-500" : svc.status === "at-risk" || svc.status === "degraded" ? "text-amber-500" : "text-red-500"} />
                              <div>
                                <div className="font-medium text-slate-900 dark:text-white">{svc.name}</div>
                                {svc.team && <div className="text-xs text-slate-400">{svc.team}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="p-4"><StatusBadge label={svc.status ?? "healthy"} variant={STATUS_VARIANT[svc.status] ?? "neutral"} dot /></td>
                          <td className="p-4 text-slate-500">{svc.sloTarget ?? svc.target ?? "—"}</td>
                          <td className="p-4">
                            <span className={`font-semibold ${(svc.current ?? 100) < (parseFloat(svc.sloTarget ?? "100")) ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                              {svc.current ?? svc.availability ?? "—"}
                            </span>
                          </td>
                          <td className="p-4"><BudgetBar budget={svc.errorBudget ?? svc.budget} /></td>
                          <td className="p-4 text-slate-500">{svc.uptime ?? "—"}</td>
                          <td className="p-4"><ChevronRight size={14} className="text-slate-300" /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {selectedSvc && (
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white truncate pr-2">{selectedSvc.name}</h3>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 shrink-0"><X size={16} /></button>
              </div>
              <CardBody className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Error Budget Remaining</span>
                  <BudgetBar budget={selectedSvc.errorBudget ?? selectedSvc.budget} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["Status", selectedSvc.status],
                    ["Team", selectedSvc.team ?? "—"],
                    ["SLO Target", selectedSvc.sloTarget ?? selectedSvc.target ?? "—"],
                    ["Current", String(selectedSvc.current ?? selectedSvc.availability ?? "—")],
                    ["Uptime", selectedSvc.uptime ?? "—"],
                    ["MTTR", selectedSvc.mttr ?? "—"],
                    ["Incidents (30d)", String(selectedSvc.incidents30d ?? selectedSvc.incidentCount ?? "—")],
                    ["Last Incident", selectedSvc.lastIncident ?? "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5">
                      <div className="text-[10px] text-slate-400 mb-0.5">{label}</div>
                      {label === "Status" ? <StatusBadge label={value ?? "healthy"} variant={STATUS_VARIANT[value] ?? "neutral"} dot /> : <div className="text-sm font-medium text-slate-900 dark:text-white">{value}</div>}
                    </div>
                  ))}
                </div>
                {selectedSvc.description && (
                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-1">Description</div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{selectedSvc.description}</p>
                  </div>
                )}
                {detailLoading && <div className="animate-pulse h-4 bg-slate-200 dark:bg-slate-700 rounded" />}
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
