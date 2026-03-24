import { useMemo } from "react";
import PageHeader from "../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import DataTable from "../../../components/ui/DataTable";
import { GitBranch, Clock, CheckCircle, AlertTriangle, Plus, AlertCircle } from "lucide-react";
import { useApi } from "../../../hooks/useApi";
import { network } from "../../../services/api";

const riskVariant   = { low: "success", medium: "warning", high: "danger" };
const statusVariant = { approved: "success", pending: "warning", "in-progress": "info", scheduled: "neutral" };
const typeVariant   = { standard: "neutral", normal: "info", emergency: "danger" };

const columns = [
  { key: "id",     label: "ID" },
  { key: "title",  label: "Title" },
  { key: "type",   label: "Type",   render: v => <StatusBadge label={v} variant={typeVariant[v] ?? "neutral"} /> },
  { key: "status", label: "Status", render: v => <StatusBadge label={v} variant={statusVariant[v] ?? "neutral"} dot /> },
  { key: "risk",   label: "Risk",   render: v => <StatusBadge label={v} variant={riskVariant[v] ?? "neutral"} /> },
  { key: "window", label: "Maintenance Window" },
  { key: "owner",  label: "Owner" },
];

export default function ChangeManagement() {
  const { data: changes, loading, error } = useApi(
    () => network.changes.list(), [], { pollingInterval: 30000 }
  );

  const allChanges = changes ?? [];

  const { pending, approved, emergency, thisWeek } = useMemo(() => ({
    pending:   allChanges.filter(c => c.status === "pending").length,
    approved:  allChanges.filter(c => c.status === "approved").length,
    emergency: allChanges.filter(c => c.type === "emergency").length,
    thisWeek:  allChanges.length,
  }), [allChanges]);

  const maintenanceWindows = useMemo(() =>
    allChanges.filter(c => c.status === "approved" || c.status === "scheduled"),
    [allChanges]
  );

  const rollbackItems = useMemo(() =>
    allChanges.filter(c => c.hasRollback || c.rollback),
    [allChanges]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Change Management"
        subtitle="Planned changes, approvals, rollback plans and maintenance windows"
        actions={
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition">
            <Plus size={15} /> Submit Change
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Pending Approval" value={loading ? "…" : pending}   icon={Clock}         color="amber" />
        <Stat label="Approved"         value={loading ? "…" : approved}  icon={CheckCircle}   color="emerald" />
        <Stat label="Emergency"        value={loading ? "…" : emergency} icon={AlertTriangle} color="red" />
        <Stat label="This Week"        value={loading ? "…" : thisWeek}  icon={GitBranch}     color="indigo" />
      </div>

      <Card>
        <CardHeader title="Change Requests" icon={GitBranch} />
        <CardBody>
          {loading && allChanges.length === 0 && (
            <div className="space-y-2 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded" />)}
            </div>
          )}
          {!loading && !error && allChanges.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">No change requests found.</p>
          )}
          {allChanges.length > 0 && (
            <DataTable columns={columns} data={allChanges} searchable searchKeys={["id", "title", "owner"]} />
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Upcoming Maintenance Windows" icon={Clock} />
          <CardBody className="space-y-3">
            {maintenanceWindows.length === 0 && !loading && (
              <p className="text-sm text-slate-500">No upcoming maintenance windows.</p>
            )}
            {maintenanceWindows.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{c.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{c.window}</p>
                </div>
                <StatusBadge label={c.risk} variant={riskVariant[c.risk] ?? "neutral"} />
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Rollback Plans" icon={GitBranch} />
          <CardBody className="space-y-3">
            {rollbackItems.length === 0 && !loading && (
              <p className="text-sm text-slate-500">No rollback plans found.</p>
            )}
            {rollbackItems.map(c => (
              <div key={c.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{c.id}</p>
                <p className="text-xs text-slate-500 mt-1">{c.rollbackNote ?? "Rollback procedure documented. Estimated time: 15 min."}</p>
                <button className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">View runbook →</button>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
