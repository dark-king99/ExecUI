import { useState } from "react";
import PageHeader from "../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import DataTable from "../../../components/ui/DataTable";
import { AlertTriangle, Clock, Users, Activity, Plus, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useApi } from "../../../hooks/useApi";
import { network } from "../../../services/api";

const severityVariant = { critical: "danger", high: "warning", medium: "info", low: "neutral" };
const statusVariant   = { open: "danger", "in-progress": "warning", resolved: "success" };

export default function IncidentCenter() {
  const [selected, setSelected] = useState(null);

  const { data: incidents, loading, error } = useApi(
    () => network.incidents.list(), [], { pollingInterval: 15000 }
  );
  const { data: timeline, loading: tlLoading } = useApi(
    () => selected ? network.incidents.timeline(selected) : Promise.resolve([]),
    [selected]
  );

  const allIncidents = incidents ?? [];
  const allTimeline  = timeline ?? [];

  const open     = allIncidents.filter(i => i.status !== "resolved").length;
  const critical = allIncidents.filter(i => i.severity === "critical").length;
  const inProg   = allIncidents.filter(i => i.status === "in-progress").length;
  const resolved = allIncidents.filter(i => i.status === "resolved").length;

  const columns = [
    { key: "id",       label: "ID",       sortable: false },
    { key: "title",    label: "Title",    sortable: false },
    { key: "severity", label: "Severity", render: v => <StatusBadge label={v} variant={severityVariant[v] ?? "neutral"} dot /> },
    { key: "status",   label: "Status",   render: v => <StatusBadge label={v} variant={statusVariant[v] ?? "neutral"} dot /> },
    { key: "owner",    label: "Owner" },
    { key: "sla",      label: "SLA Clock" },
    { key: "blast",    label: "Blast Radius" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incident Center"
        subtitle="Live incident tracking, blast radius, ownership and SLA management"
        actions={
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition">
            <Plus size={15} /> New Incident
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Open Incidents"  value={loading ? "…" : open}     icon={AlertTriangle} color="red" />
        <Stat label="Critical"        value={loading ? "…" : critical}  icon={Activity}      color="red" />
        <Stat label="In Progress"     value={loading ? "…" : inProg}    icon={Clock}         color="amber" />
        <Stat label="Resolved Today"  value={loading ? "…" : resolved}  icon={CheckCircle}   color="emerald" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Card>
            <CardHeader title="Active Incidents" icon={AlertTriangle} />
            <CardBody>
              {loading && allIncidents.length === 0 && (
                <div className="space-y-2 animate-pulse">
                  {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded" />)}
                </div>
              )}
              {!loading && allIncidents.length === 0 && !error && (
                <p className="text-sm text-slate-500 text-center py-4">No incidents found.</p>
              )}
              {allIncidents.length > 0 && (
                <DataTable
                  columns={columns}
                  data={allIncidents}
                  searchable
                  searchKeys={["id", "title", "owner"]}
                  onRowClick={(row) => setSelected(row.id)}
                />
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="Incident Timeline" subtitle={selected ?? "Select an incident"} icon={Clock} />
          <CardBody className="space-y-4">
            {!selected && (
              <p className="text-sm text-slate-500">Click an incident to view its timeline.</p>
            )}
            {tlLoading && selected && (
              <div className="flex justify-center py-4">
                <Loader2 size={18} className="animate-spin text-slate-400" />
              </div>
            )}
            {!tlLoading && allTimeline.length === 0 && selected && (
              <p className="text-sm text-slate-500">No timeline events.</p>
            )}
            {allTimeline.map((e, i) => (
              <div key={e.id ?? i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  {i < allTimeline.length - 1 && <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />}
                </div>
                <div className="pb-3">
                  <span className="text-xs text-slate-400">{e.time ?? e.ts}</span>
                  <p className="text-sm text-slate-900 dark:text-white font-medium">{e.actor}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{e.text ?? e.message}</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
