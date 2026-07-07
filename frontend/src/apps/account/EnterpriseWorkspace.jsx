import { useState } from "react";
import { useApi, useMutation } from "../../hooks/useApi";
import { useToast } from "../../components/ui/Toast";
import { enterprise } from "../../services/api";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import { SkeletonTable } from "../../components/ui/Skeleton";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  Building2, Users, Plus, Trash2, UserX, UserCheck,
  Search, X, Shield, Activity, Clock, Monitor, Pencil
} from "lucide-react";

const TABS = ["users", "sessions", "audit"];

const inputCls  = "w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500";
const selectCls = "w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500";

const EMPTY_INVITE = { firstName: "", lastName: "", email: "", password: "", department: "", jobTitle: "", phone: "", roleId: "" };

function RelativeTime({ date }) {
  if (!date) return <span className="text-slate-400">—</span>;
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d) / 1000);
  let label;
  if (diff < 60) label = "just now";
  else if (diff < 3600) label = `${Math.floor(diff / 60)}m ago`;
  else if (diff < 86400) label = `${Math.floor(diff / 3600)}h ago`;
  else label = d.toLocaleDateString();
  return <span className="text-slate-500 dark:text-slate-400 text-xs" title={d.toLocaleString()}>{label}</span>;
}

function Field({ label, children, span }) {
  return (
    <div className={span ? `col-span-${span}` : ""}>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function EnterpriseWorkspace() {
  const toast = useToast();
  const [tab, setTab] = useState("users");
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(EMPTY_INVITE);
  const [editForm, setEditForm] = useState({});
  const F = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const EF = (k) => (e) => setEditForm((f) => ({ ...f, [k]: e.target.value }));

  const { data: statsData } = useApi(() => enterprise.workspace.stats(), [], { pollingInterval: 30000 });
  const stats = statsData ?? null;

  const { data: usersData, loading: loadU, refetch: refetchUsers } = useApi(() => enterprise.users.list(), [], { pollingInterval: 30000 });
  const users = usersData ?? [];

  const { data: sessionsData, loading: loadS } = useApi(() => enterprise.workspace.sessions(), [], { pollingInterval: 15000 });
  const sessions = sessionsData ?? [];

  const { data: auditLogsData, loading: loadA } = useApi(() => enterprise.workspace.audit({ limit: 100 }), [], { pollingInterval: 30000 });
  const auditLogs = auditLogsData ?? [];

  const { data: rolesData } = useApi(() => enterprise.roles.list(), []);
  const roles = rolesData ?? [];

  const inviteMut = useMutation((d) => enterprise.users.invite(d), {
    onSuccess: () => { toast({ message: "User invited successfully", type: "success" }); setShowInvite(false); setForm(EMPTY_INVITE); refetchUsers(); },
    onError: (e) => toast({ message: e.message, type: "error" }),
  });

  const updateMut = useMutation(({ id, data }) => enterprise.users.update(id, data), {
    onSuccess: () => { toast({ message: "User updated", type: "success" }); setEditUser(null); refetchUsers(); },
    onError: (e) => toast({ message: e.message, type: "error" }),
  });

  const toggleMut = useMutation((id) => enterprise.users.toggleStatus(id), {
    onSuccess: () => { toast({ message: "User status updated", type: "success" }); refetchUsers(); },
    onError: (e) => toast({ message: e.message, type: "error" }),
  });

  const deleteMut = useMutation((id) => enterprise.users.delete(id), {
    onSuccess: () => { toast({ message: "User removed", type: "success" }); refetchUsers(); },
    onError: (e) => toast({ message: e.message, type: "error" }),
  });

  const openEdit = (user) => {
    setEditUser(user);
    setEditForm({ firstName: user.firstName, lastName: user.lastName, department: user.department ?? "", jobTitle: user.jobTitle ?? "", phone: user.phone ?? "", roleId: user.role?.id ?? "" });
  };

  const filteredUsers = users.filter((u) =>
    !search ||
    u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.department?.toLowerCase().includes(search.toLowerCase())
  );

  const tabIcon = { users: Users, sessions: Monitor, audit: Activity };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enterprise Workspace"
        subtitle="Manage company users, track sessions, and review all workspace activity"
        icon={Building2}
        iconColor="indigo"
        actions={
          tab === "users" && (
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition"
            >
              <Plus size={15} /> Invite User
            </button>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Stat label="Total Users"   value={stats?.totalUsers    ?? users.length}                         color="indigo" />
        <Stat label="Active"        value={stats?.activeUsers   ?? users.filter((u) => u.isActive).length}  color="emerald" />
        <Stat label="Suspended"     value={stats?.suspendedUsers ?? users.filter((u) => !u.isActive).length} color="red" />
        <Stat label="Live Sessions" value={stats?.activeSessions ?? sessions.filter((s) => s.isActive).length} color="sky" />
        <Stat label="Logins Today"  value={stats?.todayLogins   ?? 0}                                    color="amber" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {TABS.map((t) => {
          const Icon = tabIcon[t];
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium capitalize border-b-2 transition -mb-px ${
                tab === t ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Icon size={14} />{t}
            </button>
          );
        })}
      </div>

      {/* Users tab */}
      {tab === "users" && (
        <>
          <Card>
            <CardBody>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, or department..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={`Users (${filteredUsers.length})`} />
            <CardBody className="p-0">
              {loadU ? (
                <div className="p-5"><SkeletonTable rows={5} /></div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-sm">
                  No users found. Invite your team members to get started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        {["User", "Role", "Department", "Last Login", "Status", ""].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                                  {user.firstName?.[0]}{user.lastName?.[0]}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-slate-800 dark:text-slate-100">{user.fullName}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                              {user.role?.name ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                            {user.department ?? "—"}
                            {user.jobTitle && <div className="text-slate-400">{user.jobTitle}</div>}
                          </td>
                          <td className="px-4 py-3"><RelativeTime date={user.lastLoginAt} /></td>
                          <td className="px-4 py-3">
                            <StatusBadge variant={user.isActive ? "success" : "danger"} label={user.isActive ? "Active" : "Suspended"} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEdit(user)}
                                title="Edit user"
                                className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => toggleMut.mutate(user.id)}
                                title={user.isActive ? "Suspend" : "Activate"}
                                className={`p-1.5 rounded-md transition ${user.isActive ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"}`}
                              >
                                {user.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                              </button>
                              <button
                                onClick={() => deleteMut.mutate(user.id)}
                                title="Remove user"
                                className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}

      {/* Sessions tab */}
      {tab === "sessions" && (
        <Card>
          <CardHeader title="Active & Recent Sessions" />
          <CardBody className="p-0">
            {loadS ? (
              <div className="p-5"><SkeletonTable rows={8} /></div>
            ) : sessions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">No sessions recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      {["User", "IP Address", "Browser / Agent", "Started", "Ended", "Status"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {sessions.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800 dark:text-slate-100">{s.userName}</p>
                          <p className="text-xs text-slate-400">{s.userEmail}</p>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-600 dark:text-slate-400">{s.ipAddress ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {s.userAgent ? s.userAgent.slice(0, 60) + (s.userAgent.length > 60 ? "…" : "") : "—"}
                        </td>
                        <td className="px-4 py-3"><RelativeTime date={s.startedAt} /></td>
                        <td className="px-4 py-3"><RelativeTime date={s.endedAt} /></td>
                        <td className="px-4 py-3">
                          <StatusBadge variant={s.isActive ? "success" : "neutral"} label={s.isActive ? "Active" : "Ended"} dot={s.isActive} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Audit tab */}
      {tab === "audit" && (
        <Card>
          <CardHeader title="Workspace Audit Log" />
          <CardBody className="p-0">
            {loadA ? (
              <div className="p-5"><SkeletonTable rows={10} /></div>
            ) : auditLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">No audit events recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      {["When", "User", "Action", "Resource", "Detail", "IP"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {auditLogs.map((log) => {
                      const actionVariant = {
                        login: "success", logout: "neutral",
                        create_user: "info", update_user: "warning",
                        delete_user: "danger", suspend_user: "danger", activate_user: "success",
                      };
                      return (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-slate-800 dark:text-slate-100">{log.userName}</p>
                            <p className="text-xs text-slate-400">{log.userEmail}</p>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge variant={actionVariant[log.action] ?? "neutral"} label={log.action.replace(/_/g, " ")} />
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{log.resource ?? "—"}</td>
                          <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">{log.detail ?? "—"}</td>
                          <td className="px-4 py-3 text-xs font-mono text-slate-500">{log.ipAddress ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* ── Invite modal ──────────────────────────────────────────────────────── */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-indigo-500" />
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Invite Team Member</h2>
              </div>
              <button onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name"><input value={form.firstName} onChange={F("firstName")} className={inputCls} /></Field>
                <Field label="Last Name"><input value={form.lastName} onChange={F("lastName")} className={inputCls} /></Field>
                <Field label="Email Address" span={2}>
                  <input type="email" value={form.email} onChange={F("email")} className={inputCls} />
                </Field>
                <Field label="Temporary Password" span={2}>
                  <input type="password" value={form.password} onChange={F("password")} placeholder="Leave blank to auto-generate" className={inputCls} />
                </Field>
                <Field label="Role" span={2}>
                  <select value={form.roleId} onChange={F("roleId")} className={selectCls}>
                    <option value="">— Select a role —</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Department"><input value={form.department} onChange={F("department")} className={inputCls} /></Field>
                <Field label="Job Title"><input value={form.jobTitle} onChange={F("jobTitle")} className={inputCls} /></Field>
                <Field label="Phone (optional)" span={2}>
                  <input value={form.phone} onChange={F("phone")} className={inputCls} />
                </Field>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                The user will receive access immediately. Share their temporary password securely.
              </p>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setShowInvite(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition">Cancel</button>
              <button
                onClick={() => inviteMut.mutate(form)}
                disabled={inviteMut.loading || !form.email || !form.firstName || !form.lastName}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
              >
                {inviteMut.loading ? "Inviting..." : "Send Invite"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit user modal ───────────────────────────────────────────────────── */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Edit User</h2>
              <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name"><input value={editForm.firstName} onChange={EF("firstName")} className={inputCls} /></Field>
                <Field label="Last Name"><input value={editForm.lastName} onChange={EF("lastName")} className={inputCls} /></Field>
                <Field label="Role" span={2}>
                  <select value={editForm.roleId} onChange={EF("roleId")} className={selectCls}>
                    <option value="">— Select a role —</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Department"><input value={editForm.department} onChange={EF("department")} className={inputCls} /></Field>
                <Field label="Job Title"><input value={editForm.jobTitle} onChange={EF("jobTitle")} className={inputCls} /></Field>
                <Field label="Phone" span={2}>
                  <input value={editForm.phone} onChange={EF("phone")} className={inputCls} />
                </Field>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setEditUser(null)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition">Cancel</button>
              <button
                onClick={() => updateMut.mutate({ id: editUser.id, data: editForm })}
                disabled={updateMut.loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
              >
                {updateMut.loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
