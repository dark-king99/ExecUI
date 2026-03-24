import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import DataTable from "../../components/ui/DataTable";
import { FileText, Download, AlertCircle } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { account } from "../../services/api";

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

  const { data: logs, loading, error } = useApi(
    () => account.auditLogs.list({ limit: 200 }),
    [],
    { pollingInterval: 30000 }
  );

  const allLogs = logs ?? [];
  const filtered = filter === "all" ? allLogs
    : filter === "failed" ? allLogs.filter(l => l.result === "failed")
    : allLogs.filter(l => l.result === "success");

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
          {error && (
            <div className="flex items-center gap-3 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {loading && !logs && (
            <div className="space-y-2 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded" />
              ))}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">No audit log entries found.</p>
          )}

          {filtered.length > 0 && (
            <DataTable columns={columns} data={filtered} searchable searchKeys={["user", "action", "resource"]} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
