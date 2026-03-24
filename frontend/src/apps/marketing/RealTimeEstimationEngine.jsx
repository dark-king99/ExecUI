import {
  Activity,
  TrendingUp,
  Zap,
  Database,
  Brain,
  Timer,
  ShieldCheck,
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { marketing } from "../../services/api";

export default function RealTimeEstimationEngine() {
  const { data: cdpMetrics, loading } = useApi(
    () => marketing.cdp.metrics(), [], { pollingInterval: 5000 }
  );

  const audience       = cdpMetrics?.estimatedAudience ?? cdpMetrics?.unifiedProfiles ?? null;
  const audienceDelta  = cdpMetrics?.audienceDelta ?? null;
  const confidence     = cdpMetrics?.matchConfidence ?? null;
  const latency        = cdpMetrics?.computeLatency ?? null;
  const projectedLift  = cdpMetrics?.projectedLift ?? null;
  const dataSources    = cdpMetrics?.activeDataSources ?? null;
  const idResolutionImpact = cdpMetrics?.identityResolutionImpact ?? null;
  const refreshMode    = cdpMetrics?.refreshMode ?? "Streaming";
  const engineStatus   = cdpMetrics?.engineStatus ?? null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">

      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Activity size={18} /> Real-Time Estimation Engine
      </h2>

      <div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Estimated Audience Size
        </div>
        <div className="text-3xl font-bold mt-1 flex items-center gap-3">
          {loading && audience === null ? "…" : audience != null ? Number(audience).toLocaleString() : "—"}
          {audienceDelta != null && (
            <span className={`text-sm ${audienceDelta >= 0 ? "text-green-500" : "text-red-500"}`}>
              {audienceDelta >= 0 ? "+" : ""}{audienceDelta.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">

        <Metric
          icon={ShieldCheck}
          label="Match Confidence"
          value={loading ? "…" : confidence != null ? `${confidence}%` : "—"}
        />

        <Metric
          icon={Timer}
          label="Compute Latency"
          value={loading ? "…" : latency != null ? `${latency}ms` : "—"}
        />

        <Metric
          icon={TrendingUp}
          label="Projected Lift"
          value={loading ? "…" : projectedLift != null ? `+${projectedLift}%` : "—"}
        />

        <Metric
          icon={Database}
          label="Data Sources Used"
          value={loading ? "…" : dataSources != null ? `${dataSources} Sources` : "—"}
        />

        <Metric
          icon={Brain}
          label="Identity Resolution Impact"
          value={loading ? "…" : idResolutionImpact != null ? `+${idResolutionImpact}%` : "—"}
        />

        <Metric
          icon={Zap}
          label="Refresh Mode"
          value={loading ? "…" : refreshMode}
        />

      </div>

      <div className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-4">
        {engineStatus ?? "Engine Status: Streaming recomputation active"}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="bg-slate-100 dark:bg-slate-800 rounded-md p-3">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Icon size={14} /> {label}
      </div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
