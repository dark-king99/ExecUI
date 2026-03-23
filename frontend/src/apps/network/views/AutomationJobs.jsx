import { useState } from "react";
import PageHeader from "../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import DataTable from "../../../components/ui/DataTable";
import { Bot, Play, CheckCircle, XCircle, Clock, Plus } from "lucide-react";

const jobs = [
  { id: "JOB-01", name: "Nightly config backup",       trigger: "Scheduled",  status: "success", lastRun: "02:00 today",  duration: "4m 12s", targets: 48 },
  { id: "JOB-02", name: "Patch compliance scan",       trigger: "Scheduled",  status: "success", lastRun: "06:00 today",  duration: "8m 33s", targets: 112 },
  { id: "JOB-03", name: "Unused port shutdown",        trigger: "Manual",     status: "running", lastRun: "14:05 today",  duration: "—",      targets: 23 },
  { id: "JOB-04", name: "BGP prefix validation",       trigger: "On-change",  status: "failed",  lastRun: "13:40 today",  duration: "1m 04s", targets: 6 },
  { id: "JOB-05", name: "Certificate renewal",         trigger: "Scheduled",  status: "success", lastRun: "Yesterday",    duration: "2m 58s", targets: 14 },
  { id: "JOB-06", name: "Alert dedup flush",           trigger: "Scheduled",  status: "success", lastRun: "1h ago",       duration: "12s",    targets: 1 },
];

const templates = [
  "Config Backup",
  "Patch Scan",
  "Compliance Check",
  "Port Audit",
  "Certificate Monitor",
  "Traffic Baseline",
];

const statusVariant = { success: "success", running: "info", failed: "danger" };

const columns = [
  { key: "id",       label: "Job ID" },
  { key: "name",     label: "Name" },
  { key: "trigger",  label: "Trigger" },
  { key: "status",   label: "Status",   render: v => <StatusBadge label={v} variant={statusVariant[v]} dot /> },
  { key: "lastRun",  label: "Last Run" },
  { key: "duration", label: "Duration" },
  { key: "targets",  label: "Targets" },
];

export default function AutomationJobs() {
  const success = jobs.filter(j => j.status === "success").length;
  const failed  = jobs.filter(j => j.status === "failed").length;
  const running = jobs.filter(j => j.status === "running").length;

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

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Succeeded Today" value={success} icon={CheckCircle} color="emerald" />
        <Stat label="Running"         value={running} icon={Clock}       color="sky" />
        <Stat label="Failed"          value={failed}  icon={XCircle}     color="red" />
      </div>

      <Card>
        <CardHeader title="Job Run History" icon={Bot} />
        <CardBody>
          <DataTable columns={columns} data={jobs} searchable searchKeys={["name", "trigger"]} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Available Templates" icon={Play} />
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {templates.map(t => (
              <button
                key={t}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-left hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition group"
              >
                <Bot size={16} className="text-indigo-500 mb-2" />
                <p className="text-sm font-medium text-slate-900 dark:text-white">{t}</p>
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
