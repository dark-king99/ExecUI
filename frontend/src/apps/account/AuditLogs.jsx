import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import DataTable from "../../components/ui/DataTable";
import { FileText, Download } from "lucide-react";

const logs = [
  { time: "14:03",     user: "J. Torres",  action: "Login",                resource: "Auth",          ip: "192.168.1.10", result: "success" },
  { time: "14:08",     user: "J. Torres",  action: "Create API Key",       resource: "API Keys",      ip: "192.168.1.10", result: "success" },
  { time: "13:40",     user: "M. Patel",   action: "Update Deal",          resource: "CRM: Deals",    ip: "10.0.0.24",    result: "success" },
  { time: "13:21",     user: "A. Kim",     action: "Export Report",        resource: "Analytics",     ip: "10.0.0.31",    result: "success" },
  { time: "12:55",     user: "S. Lee",     action: "Delete Contact",       resource: "CRM: Contacts", ip: "10.0.0.19",    result: "success" },
  { time: "12:30",     user: "L. Osei",    action: "Login Failed",         resource: "Auth",          ip: "45.33.10.22",  result: "failed" },
  { time: "11:45",     user: "T. Garcia",  action: "Acknowledge Incident", resource: "Network: Ops",  ip: "10.0.0.42",    result: "success" },
  { time: "11:02",     user: "J. Torres",  action: "Invite Member",        resource: "Team",          ip: "192.168.1.10", result: "success" },
  { time: "10:30",     user: "M. Patel",   action: "Campaign Published",   resource: "Marketing",     ip: "10.0.0.24",    result: "success" },
  { time: "09:15",     user: "System",     action: "Config Backup",        resource: "Network: Auto", ip: "internal",     result: "success" },
];

const columns = [
  { key: "time",     label: "Time" },
  { key: "user",     label: "User" },
  { key: "action",   label: "Action" },
  { key: "resource", label: "Resource" },
  { key: "ip",       label: "IP Address" },
  { key: "result",   label: "Result", render: v => <StatusBadge label={v} variant={v === "success" ? "success" : "danger"} dot /> },
];

export default function AuditLogs() {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? logs :
    filter === "failed" ? logs.filter(l => l.result === "failed") :
    logs.filter(l => l.result === "success");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle="All platform actions, admin operations and security events"
        actions={
          <button className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm px-4 py-2 rounded-lg hover:border-indigo-400 transition">
            <Download size={15} /> Export CSV
          </button>
        }
      />

      <div className="flex gap-2">
        {["all", "success", "failed"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition capitalize ${
              filter === f
                ? "bg-indigo-600 text-white"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader title="Event Log" icon={FileText} />
        <CardBody>
          <DataTable columns={columns} data={filtered} searchable searchKeys={["user", "action", "resource"]} />
        </CardBody>
      </Card>
    </div>
  );
}
