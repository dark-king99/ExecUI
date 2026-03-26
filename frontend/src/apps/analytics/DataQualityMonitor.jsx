import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useApi, useMutation } from "../../hooks/useApi";
import { analytics } from "../../services/api";
import { useToast } from "../../components/ui/Toast";
import { Database, CheckCircle, AlertTriangle, Clock, XCircle, RefreshCw } from "lucide-react";

const STATUS_VARIANT = { healthy: "success", warning: "warning", critical: "danger" };

function QualityBar({ pct }) {
  const color = pct >= 95 ? "bg-emerald-500" : pct >= 80 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 rounded-full bg-slate-200 dark:bg-slate-700">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{pct}%</span>
    </div>
  );
}

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

export default function DataQualityMonitor() {
  const toast = useToast();

  const {
    data: datasets,
    loading,
    error,
    refetch,
  } = useApi(() => analytics.datasets(), [], { pollingInterval: 60000 });

  const { mutate: deduplicate, loading: deduping } = useMutation(
    (id) => analytics.deduplicateDataset(id),
    {
      onSuccess: () => {
        toast({ message: "Deduplication job queued successfully.", type: "success" });
        refetch();
      },
      onError: (err) => toast({ message: err?.message ?? "Deduplication failed.", type: "error" }),
    }
  );

  const healthy    = datasets?.filter((d) => d.status === "healthy").length ?? 0;
  const warning    = datasets?.filter((d) => d.status === "warning").length ?? 0;
  const critical   = datasets?.filter((d) => d.status === "critical").length ?? 0;
  const avgComplete = datasets?.length
    ? Math.round(datasets.reduce((s, d) => s + d.completeness, 0) / datasets.length)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Quality Monitor"
        subtitle="Dataset freshness, completeness, schema drift and deduplication"
        actions={
          <button
            onClick={refetch}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />

      {/* Summary */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Datasets Healthy" value={healthy}           icon={CheckCircle}  color="emerald" />
          <Stat label="Warnings"         value={warning}           icon={AlertTriangle} color="amber" />
          <Stat label="Critical"         value={critical}          icon={XCircle}      color="red" />
          <Stat label="Avg Completeness" value={`${avgComplete}%`} icon={Database}     color="indigo" />
        </div>
      )}

      {/* Dataset health table */}
      <Card>
        <CardHeader title="Dataset Health" icon={Database} />
        <CardBody>
          {error && <ErrorBanner message={error} onRetry={refetch} />}
          {loading ? (
            <SkeletonTable rows={5} />
          ) : datasets?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    {["Dataset","Freshness","Completeness","Schema","Duplicates","Status"].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {datasets.map((ds) => (
                    <tr key={ds.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{ds.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-slate-400" /> {ds.freshness}
                        </span>
                      </td>
                      <td className="px-4 py-3"><QualityBar pct={ds.completeness} /></td>
                      <td className="px-4 py-3">
                        <StatusBadge label={ds.schema} variant={ds.schema === "drift" ? "warning" : "success"} />
                      </td>
                      <td className="px-4 py-3">
                        {ds.duplicates > 0
                          ? <span className="text-amber-600 dark:text-amber-400 font-semibold">{ds.duplicates}</span>
                          : <span className="text-emerald-500">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge label={ds.status} variant={STATUS_VARIANT[ds.status] ?? "neutral"} dot />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-6">No dataset records found.</p>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Schema drift alerts */}
        <Card>
          <CardHeader title="Schema Drift Alerts" icon={AlertTriangle} />
          <CardBody className="space-y-3">
            {loading ? (
              <SkeletonTable rows={2} />
            ) : datasets?.filter((d) => d.schema === "drift").length > 0 ? (
              datasets.filter((d) => d.schema === "drift").map((d) => (
                <div key={d.name} className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{d.name}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    Schema drift detected. Downstream pipelines may be affected.
                  </p>
                  <button className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 hover:underline">
                    Review diff →
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No schema drift detected.</p>
            )}
          </CardBody>
        </Card>

        {/* Deduplication queue */}
        <Card>
          <CardHeader title="Deduplication Queue" icon={Database} />
          <CardBody className="space-y-3">
            {loading ? (
              <SkeletonTable rows={2} />
            ) : datasets?.filter((d) => d.duplicates > 0).length > 0 ? (
              datasets.filter((d) => d.duplicates > 0).map((d) => (
                <div key={d.name} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{d.name}</p>
                    <p className="text-xs text-slate-400">{d.duplicates} duplicate records</p>
                  </div>
                  <button
                    onClick={() => deduplicate(d.id ?? d.name)}
                    disabled={deduping}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
                  >
                    Deduplicate →
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No duplicates detected.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
