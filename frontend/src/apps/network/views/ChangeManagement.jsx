import PageHeader from "../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import DataTable from "../../../components/ui/DataTable";
import { GitBranch, Clock, CheckCircle, AlertTriangle, Plus } from "lucide-react";

const changes = [
  { id: "CHG-041", title: "Upgrade core router firmware", type: "standard",   status: "approved",  risk: "medium", window: "Sat 02:00–04:00", owner: "J. Torres" },
  { id: "CHG-042", title: "Add VLAN 120 – Finance",        type: "normal",    status: "pending",   risk: "low",    window: "Sun 00:00–01:00", owner: "M. Patel" },
  { id: "CHG-043", title: "Emergency patch – CVE-2024-111",type: "emergency", status: "in-progress",risk:"high",  window: "ASAP",            owner: "S. Lee" },
  { id: "CHG-044", title: "Decommission legacy switch",     type: "standard", status: "scheduled", risk: "low",   window: "Next Wed 22:00",  owner: "A. Kim" },
  { id: "CHG-045", title: "BGP policy update – ISP-B",      type: "normal",   status: "approved",  risk: "high",  window: "Fri 01:00–02:00", owner: "J. Torres" },
];

const riskVariant   = { low: "success", medium: "warning", high: "danger" };
const statusVariant = { approved: "success", pending: "warning", "in-progress": "info", scheduled: "neutral" };
const typeVariant   = { standard: "neutral", normal: "info", emergency: "danger" };

const columns = [
  { key: "id",     label: "ID" },
  { key: "title",  label: "Title" },
  { key: "type",   label: "Type",   render: v => <StatusBadge label={v} variant={typeVariant[v]} /> },
  { key: "status", label: "Status", render: v => <StatusBadge label={v} variant={statusVariant[v]} dot /> },
  { key: "risk",   label: "Risk",   render: v => <StatusBadge label={v} variant={riskVariant[v]} /> },
  { key: "window", label: "Maintenance Window" },
  { key: "owner",  label: "Owner" },
];

export default function ChangeManagement() {
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Pending Approval" value="3" icon={Clock}         color="amber" />
        <Stat label="Approved"         value="2" icon={CheckCircle}   color="emerald" />
        <Stat label="Emergency"        value="1" icon={AlertTriangle} color="red" />
        <Stat label="This Week"        value="5" icon={GitBranch}     color="indigo" />
      </div>

      <Card>
        <CardHeader title="Change Requests" icon={GitBranch} />
        <CardBody>
          <DataTable columns={columns} data={changes} searchable searchKeys={["id", "title", "owner"]} />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Upcoming Maintenance Windows" icon={Clock} />
          <CardBody className="space-y-3">
            {changes.filter(c => c.status === "approved" || c.status === "scheduled").map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{c.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{c.window}</p>
                </div>
                <StatusBadge label={c.risk} variant={riskVariant[c.risk]} />
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Rollback Plans" icon={GitBranch} />
          <CardBody className="space-y-3">
            {["CHG-041","CHG-043","CHG-045"].map(id => (
              <div key={id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{id}</p>
                <p className="text-xs text-slate-500 mt-1">Rollback procedure documented. Estimated time: 15 min.</p>
                <button className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">View runbook →</button>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
