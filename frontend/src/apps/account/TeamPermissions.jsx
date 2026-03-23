import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import DataTable from "../../components/ui/DataTable";
import { useToast } from "../../components/ui/Toast";
import { Users, Plus, Shield } from "lucide-react";

const members = [
  { name: "J. Torres",  email: "j.torres@artemishaven.io",  role: "Admin",   status: "active",  lastLogin: "2h ago" },
  { name: "M. Patel",   email: "m.patel@artemishaven.io",   role: "Sales",   status: "active",  lastLogin: "1d ago" },
  { name: "S. Lee",     email: "s.lee@artemishaven.io",     role: "Sales",   status: "active",  lastLogin: "3h ago" },
  { name: "A. Kim",     email: "a.kim@artemishaven.io",     role: "Marketing",status: "active", lastLogin: "4h ago" },
  { name: "T. Garcia",  email: "t.garcia@artemishaven.io",  role: "Network", status: "active",  lastLogin: "1h ago" },
  { name: "L. Osei",    email: "l.osei@artemishaven.io",    role: "Viewer",  status: "invited", lastLogin: "—" },
];

const roleColors = { Admin: "danger", Sales: "indigo", Marketing: "success", Network: "sky", Viewer: "neutral" };

const columns = [
  { key: "name",      label: "Name",      render: (v, row) => (
    <div>
      <p className="font-medium text-slate-900 dark:text-white">{v}</p>
      <p className="text-xs text-slate-400">{row.email}</p>
    </div>
  )},
  { key: "role",      label: "Role",       render: v => <StatusBadge label={v} variant={roleColors[v]} /> },
  { key: "status",    label: "Status",     render: v => <StatusBadge label={v} variant={v === "active" ? "success" : "info"} dot /> },
  { key: "lastLogin", label: "Last Login" },
];

const roles = [
  { role: "Admin",     desc: "Full platform access, manage billing and team" },
  { role: "Sales",     desc: "CRM, pipeline, deals and reports" },
  { role: "Marketing", desc: "Campaigns, audiences, analytics" },
  { role: "Network",   desc: "Network ops, incidents, inventory" },
  { role: "Viewer",    desc: "Read-only access across all modules" },
];

export default function TeamPermissions() {
  const toast = useToast();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Permissions"
        subtitle="Manage team members, roles and access levels"
        actions={
          <button
            onClick={() => toast({ message: "Invite sent successfully", type: "success" })}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            <Plus size={15} /> Invite Member
          </button>
        }
      />

      <Card>
        <CardHeader title="Team Members" icon={Users} />
        <CardBody>
          <DataTable columns={columns} data={members} searchable searchKeys={["name", "email", "role"]} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Role Definitions" icon={Shield} />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {roles.map(r => (
              <div key={r.role} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge label={r.role} variant={roleColors[r.role]} />
                </div>
                <p className="text-xs text-slate-500">{r.desc}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
