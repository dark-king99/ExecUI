import { useState } from "react";
import PageHeader from "../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import DataTable from "../../../components/ui/DataTable";
import { AlertTriangle, Clock, Users, Activity, Plus, CheckCircle } from "lucide-react";

const incidents = [
  { id: "INC-001", title: "Core switch unreachable – DC-West", severity: "critical", status: "open",    owner: "J. Torres",   sla: "02:14 left",  blast: "3 sites" },
  { id: "INC-002", title: "BGP session flapping – ISP-A",     severity: "high",     status: "in-progress","owner": "M. Patel",  sla: "05:40 left",  blast: "1 site" },
  { id: "INC-003", title: "Packet loss >5% – Edge-12",        severity: "medium",   status: "in-progress","owner": "S. Lee",    sla: "11:00 left",  blast: "2 links" },
  { id: "INC-004", title: "NTP sync failure – Server cluster", severity: "low",     status: "open",    owner: "A. Kim",      sla: "23:00 left",  blast: "1 cluster" },
  { id: "INC-005", title: "Firewall policy violation – FW-03", severity: "medium",  status: "resolved",owner: "J. Torres",   sla: "—",           blast: "0" },
];

const severityVariant = { critical: "danger", high: "warning", medium: "info", low: "neutral" };
const statusVariant   = { open: "danger", "in-progress": "warning", resolved: "success" };

const timeline = [
  { time: "14:03", actor: "System",   text: "Alert fired: Core switch unreachable" },
  { time: "14:05", actor: "J. Torres",text: "Acknowledged incident INC-001" },
  { time: "14:08", actor: "J. Torres",text: "Escalated to Network Engineering" },
  { time: "14:12", actor: "M. Patel", text: "Initiated runbook: Switch failover step 1/5" },
  { time: "14:20", actor: "M. Patel", text: "Failover complete — monitoring recovery" },
];

export default function IncidentCenter() {
  const [selected, setSelected] = useState("INC-001");
  const open   = incidents.filter(i => i.status !== "resolved").length;
  const critical = incidents.filter(i => i.severity === "critical").length;

  const columns = [
    { key: "id",       label: "ID",       sortable: false },
    { key: "title",    label: "Title",    sortable: false },
    { key: "severity", label: "Severity", render: v => <StatusBadge label={v} variant={severityVariant[v]} dot /> },
    { key: "status",   label: "Status",   render: v => <StatusBadge label={v} variant={statusVariant[v]} dot /> },
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Open Incidents"   value={open}    icon={AlertTriangle} color="red" />
        <Stat label="Critical"         value={critical} icon={Activity}     color="red" />
        <Stat label="In Progress"      value="2"        icon={Clock}        color="amber" />
        <Stat label="Resolved Today"   value="8"        icon={CheckCircle}  color="emerald" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Card>
            <CardHeader title="Active Incidents" icon={AlertTriangle} />
            <CardBody>
              <DataTable
                columns={columns}
                data={incidents}
                searchable
                searchKeys={["id", "title", "owner"]}
              />
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="Incident Timeline" subtitle={selected} icon={Clock} />
          <CardBody className="space-y-4">
            {timeline.map((e, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  {i < timeline.length - 1 && <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />}
                </div>
                <div className="pb-3">
                  <span className="text-xs text-slate-400">{e.time}</span>
                  <p className="text-sm text-slate-900 dark:text-white font-medium">{e.actor}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{e.text}</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
