import { useMemo } from "react";
import PageHeader from "../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import DataTable from "../../../components/ui/DataTable";
import { ShieldCheck, AlertTriangle, XCircle, CheckCircle, AlertCircle } from "lucide-react";
import { useApi } from "../../../hooks/useApi";
import { useToast } from "../../../components/ui/Toast";
import { network } from "../../../services/api";

const statusVariant = { pass: "success", warn: "warning", fail: "danger" };

const columns = [
  { key: "id",         label: "ID" },
  { key: "name",       label: "Policy Name" },
  { key: "standard",   label: "Standard" },
  { key: "score",      label: "Score", render: v => (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-2 rounded-full ${v >= 90 ? "bg-emerald-500" : v >= 75 ? "bg-amber-500" : "bg-red-500"}`}
          style={{ width: `${v}%` }}
        />
      </div>
      <span className="text-xs font-semibold">{v}%</span>
    </div>
  )},
  { key: "status",     label: "Status",     render: v => <StatusBadge label={(v ?? "").toUpperCase()} variant={statusVariant[v] ?? "neutral"} dot /> },
  { key: "exceptions", label: "Exceptions", render: v => v > 0
    ? <span className="text-amber-600 dark:text-amber-400 font-semibold text-sm">{v}</span>
    : <span className="text-emerald-500 text-sm">—</span>
  },
];

export default function PolicyCompliance() {
  const toast = useToast();
  const { data: policies, loading, error } = useApi(
    () => network.policies.list(), [], { pollingInterval: 30000 }
  );

  const allPolicies = policies ?? [];

  const { passing, failing, exceptions, avgScore } = useMemo(() => ({
    passing:    allPolicies.filter(p => p.status === "pass").length,
    failing:    allPolicies.filter(p => p.status === "fail").length,
    exceptions: allPolicies.reduce((s, p) => s + (p.exceptions ?? 0), 0),
    avgScore:   allPolicies.length > 0
      ? Math.round(allPolicies.reduce((s, p) => s + (p.score ?? 0), 0) / allPolicies.length)
      : 0,
  }), [allPolicies]);

  const withExceptions = useMemo(() =>
    allPolicies.filter(p => (p.exceptions ?? 0) > 0),
    [allPolicies]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Policy & Compliance"
        subtitle="Network policy checks, zero-trust posture, CIS benchmark scoring and exceptions"
      />

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="CIS Benchmark Score" value={loading ? "…" : `${avgScore}%`}  icon={ShieldCheck} color="indigo" />
        <Stat label="Policies Passing"    value={loading ? "…" : passing}          icon={CheckCircle}  color="emerald" />
        <Stat label="Policies Failing"    value={loading ? "…" : failing}          icon={XCircle}      color="red" />
        <Stat label="Open Exceptions"     value={loading ? "…" : exceptions}       icon={AlertTriangle} color="amber" />
      </div>

      <Card>
        <CardHeader title="Policy Checks" icon={ShieldCheck} />
        <CardBody>
          {loading && allPolicies.length === 0 && (
            <div className="space-y-2 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded" />)}
            </div>
          )}
          {!loading && !error && allPolicies.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">No policies found.</p>
          )}
          {allPolicies.length > 0 && (
            <DataTable columns={columns} data={allPolicies} searchable searchKeys={["name", "standard"]} />
          )}
        </CardBody>
      </Card>

      {withExceptions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {withExceptions.map(p => (
            <Card key={p.id}>
              <CardBody>
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{p.name}</p>
                  <StatusBadge label={`${p.exceptions} exc.`} variant="warning" />
                </div>
                <p className="text-xs text-slate-500 mb-3">Standard: {p.standard} · Score: {p.score}%</p>
                <button
                  onClick={() => toast({ message: `Reviewing ${p.exceptions} exception(s) for ${p.name}.`, type: "info" })}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Review exceptions →
                </button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
