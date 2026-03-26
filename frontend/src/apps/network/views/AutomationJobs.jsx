import { useApi } from "../../../hooks/useApi";
import { network } from "../../../services/api";
import PageHeader from "../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import DataTable from "../../../components/ui/DataTable";
import { Bot, Play, CheckCircle, XCircle, Clock, Plus, AlertCircle } from "lucide-react";

const statusVariant = { success: "success", running: "info", failed: "danger" };

export default function AutomationJobs() {
  const { data: jobs, loading: jobsLoading, error: jobsError } = useApi(
    () => network.automation.jobs(), [], { pollingInterval: 15000 }
  );
  const { data: templates, loading: tmplLoading } = useApi(
    () => network.automation.templates(), [], { pollingInterval: 120000 }
  );

  const allJobs = jobs ?? [];
  const allTemplates = templates ?? [];

  const success = allJobs.filter(j => j.status === "success").length;
  const failed  = allJobs.filter(j => j.status === "failed").length;
  const running = allJobs.filter(j => j.status === "running").length;

  const columns = [
    { key: "id",       label: "Job ID" },
    { key: "name",     label: "Name" },
    { key: "trigger",  label: "Trigger" },
    { key: "status",   label: "Status",   render: v => <StatusBadge label={v} variant={statusVariant[v] ?? "neutral"} dot /> },
    { key: "lastRun",  label: "Last Run" },
    { key: "duration", label: "Duration" },
    { key: "targets",  label: "Targets" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automation Jobs"
        subtitle="Run history, templates, dry-run / apply and job status"
        actions={
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition">
            <Plus size={15} /> New Job
          </button>
        }
      />

      {jobsError && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {jobsError}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Succeeded Today" value={jobsLoading ? "…" : success} icon={CheckCircle} color="emerald" />
        <Stat label="Running"         value={jobsLoading ? "…" : running} icon={Clock}       color="sky" />
        <Stat label="Failed"          value={jobsLoading ? "…" : failed}  icon={XCircle}     color="red" />
      </div>

      <Card>
        <CardHeader title="Job Run History" icon={Bot} />
        <CardBody>
          {jobsLoading && allJobs.length === 0 && (
            <div className="space-y-2 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded" />)}
            </div>
          )}
          {!jobsLoading && allJobs.length === 0 && !jobsError && (
            <p className="text-sm text-slate-500 text-center py-4">No jobs found.</p>
          )}
          {allJobs.length > 0 && (
            <DataTable columns={columns} data={allJobs} searchable searchKeys={["name", "trigger"]} />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Available Templates" icon={Play} />
        <CardBody>
          {tmplLoading && allTemplates.length === 0 && (
            <div className="grid grid-cols-3 gap-3 animate-pulse">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded-lg" />)}
            </div>
          )}
          {!tmplLoading && allTemplates.length === 0 && (
            <p className="text-sm text-slate-500">No templates available.</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {allTemplates.map(t => (
              <button
                key={t.id ?? t.name ?? t}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-left hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition group"
              >
                <Bot size={16} className="text-indigo-500 mb-2" />
                <p className="text-sm font-medium text-slate-900 dark:text-white">{t.name ?? t}</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 opacity-0 group-hover:opacity-100 transition">
                  Click to configure →
                </p>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
