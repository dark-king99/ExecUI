import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import DataTable from "../../components/ui/DataTable";
import { useToast } from "../../components/ui/Toast";
import { Users, Plus, Shield, AlertCircle, Loader2 } from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { account } from "../../services/api";

const ROLE_COLORS = {
  Admin: "danger", Sales: "indigo", Marketing: "success",
  Network: "sky", Viewer: "neutral",
};

const columns = [
  { key: "name", label: "Name", render: (v, row) => (
    <div>
      <p className="font-medium text-slate-900 dark:text-white">{v}</p>
      <p className="text-xs text-slate-400">{row.email}</p>
    </div>
  )},
  { key: "role",      label: "Role",       render: v => <StatusBadge label={v} variant={ROLE_COLORS[v] ?? "neutral"} /> },
  { key: "status",    label: "Status",     render: v => <StatusBadge label={v} variant={v === "active" ? "success" : "info"} dot /> },
  { key: "lastLogin", label: "Last Login" },
];

export default function TeamPermissions() {
  const toast = useToast();
  const [inviteEmail, setInviteEmail] = useState("");
  const [showInvite, setShowInvite] = useState(false);

  const { data: members, loading: membersLoading, error: membersError, refetch: refetchMembers } = useApi(
    () => account.team.list(), [], { pollingInterval: 60000 }
  );
  const { data: roles, loading: rolesLoading } = useApi(
    () => account.team.roles(), [], {}
  );

  const { mutate: inviteMember, loading: inviting } = useMutation(
    (data) => account.team.invite(data),
    {
      onSuccess: () => {
        toast({ message: "Invite sent successfully", type: "success" });
        setShowInvite(false);
        setInviteEmail("");
        refetchMembers();
      },
      onError: (err) => toast({ message: err?.message ?? "Failed to send invite", type: "error" }),
    }
  );

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    inviteMember({ email: inviteEmail.trim() });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Permissions"
        subtitle="Manage team members, roles and access levels"
        actions={
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            <Plus size={15} /> Invite Member
          </button>
        }
      />

      {showInvite && (
        <Card>
          <CardHeader title="Invite Team Member" icon={Users} />
          <CardBody className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
              <input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleInvite()}
                placeholder="colleague@company.com"
                type="email"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleInvite}
                disabled={inviting}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm px-4 py-2 rounded-lg transition"
              >
                {inviting && <Loader2 size={14} className="animate-spin" />}
                Send Invite
              </button>
              <button onClick={() => setShowInvite(false)} className="border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm px-4 py-2 rounded-lg hover:border-slate-400 transition">Cancel</button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Team Members" icon={Users} />
        <CardBody>
          {membersError && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mb-3">
              <AlertCircle size={15} /> {membersError}
            </div>
          )}

          {membersLoading && !members && (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700 rounded" />)}
            </div>
          )}

          {!membersLoading && !membersError && members?.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">No team members yet. Invite someone above.</p>
          )}

          {members?.length > 0 && (
            <DataTable columns={columns} data={members} searchable searchKeys={["name", "email", "role"]} />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Role Definitions" icon={Shield} />
        <CardBody>
          {rolesLoading && !roles && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 animate-pulse">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
            </div>
          )}

          {roles?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {roles.map(r => (
                <div key={r.role} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge label={r.role} variant={ROLE_COLORS[r.role] ?? "neutral"} />
                  </div>
                  <p className="text-xs text-slate-500">{r.desc ?? r.description}</p>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
