/**
 * Roles & permissions — what an admin grants, to whom.
 *
 * Admin-only twice over: the page's route redirects anyone else, and every
 * endpoint behind this panel answers 403 to a non-admin. The panel also checks,
 * so it renders nothing if it is ever mounted somewhere an employee can reach.
 *
 * Permissions attach to roles, not people, so the panel is organized by role:
 * who is in it, and what it may do. The list of grantable permissions comes
 * from the server, along with what each one actually unlocks.
 */
import { useMemo, useState } from "react";
import { Shield, Plus, Loader2, UserPlus, Lock, ChevronDown, ChevronRight, Info } from "lucide-react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { useApi } from "../../hooks/useApi";
import { useUser } from "../../context/UserContext";
import { account } from "../../services/api";

const titleCase = (name = "") => name.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
const GROUP_ORDER = ["CRM", "Marketing", "Network"];

function Toggle({ checked, disabled, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 ${
        checked ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"
      }`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

function PermissionRow({ entry, checked, busy, onToggle }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{entry.label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{entry.description}</p>
        {entry.unlocks?.length > 0 && (
          <button type="button" onClick={() => setOpen((o) => !o)}
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />} What this unlocks
          </button>
        )}
        {open && (
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-slate-500 dark:text-slate-400">
            {entry.unlocks.map((u) => <li key={u}>{u}</li>)}
          </ul>
        )}
      </div>
      <Toggle checked={checked} disabled={busy} onChange={onToggle} label={`${entry.label}`} />
    </div>
  );
}

function RoleCard({ role, catalog, members, currentUserId, busyKey, onToggle, onAssign }) {
  const [adding, setAdding] = useState("");
  const groups = useMemo(() => GROUP_ORDER
    .map((g) => [g, catalog.filter((p) => p.group === g)])
    .filter(([, list]) => list.length), [catalog]);

  // Anyone not already here, not an admin, and not you can be moved in.
  const candidates = members.filter((m) => m.roleId !== role.id && !m.admin && m.id !== currentUserId);

  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-slate-900 dark:text-white">{titleCase(role.name)}</h4>
          {role.admin
            ? <StatusBadge label="All permissions" variant="danger" />
            : <span className="text-xs text-slate-500">{role.granted.length} of {catalog.length} granted</span>}
        </div>
        <span className="text-xs text-slate-500">{role.members.length} member{role.members.length === 1 ? "" : "s"}</span>
      </div>

      {role.members.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {role.members.map((m) => (
            <span key={m.id} title={m.email}
              className={`rounded-full px-2 py-0.5 text-[11px] ${m.active ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" : "bg-slate-50 text-slate-400 line-through dark:bg-slate-800/50"}`}>
              {m.name}
            </span>
          ))}
        </div>
      )}

      {role.admin ? (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
          <Lock size={12} className="mt-0.5 shrink-0" />
          Admins pass every permission check, so there is nothing to grant here. Promote or demote admins from the Members page.
        </p>
      ) : (
        <>
          {candidates.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <select value={adding} onChange={(e) => setAdding(e.target.value)} aria-label={`Add a member to ${titleCase(role.name)}`}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <option value="">Move a member into this role…</option>
                {candidates.map((m) => <option key={m.id} value={m.id}>{m.name} ({titleCase(m.roleName)})</option>)}
              </select>
              <button type="button" disabled={!adding || busyKey === `assign:${role.id}`}
                onClick={() => { onAssign(adding, role.id); setAdding(""); }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-400 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300">
                <UserPlus size={12} /> Move
              </button>
            </div>
          )}
          <div className="mt-3 space-y-3">
            {groups.map(([group, list]) => (
              <div key={group}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group}</p>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {list.map((entry) => (
                    <PermissionRow key={entry.key} entry={entry}
                      checked={role.granted.includes(entry.key)}
                      busy={busyKey === `${role.id}:${entry.key}`}
                      onToggle={() => onToggle(role, entry, !role.granted.includes(entry.key))} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function RolePermissionsPanel() {
  const { user, isAdmin } = useUser();
  const toast = useToast();
  const { data, loading, error, setData } = useApi(() => account.team.access.get(), [], {});
  const [busyKey, setBusyKey] = useState(null);
  const [newRole, setNewRole] = useState("");

  // Every mutation returns the fresh overview, so the panel never shows a state
  // the server didn't confirm.
  const run = async (key, fn, success) => {
    setBusyKey(key);
    try {
      setData(await fn());
      if (success) toast({ message: success, type: "success" });
      return true;
    } catch (e) {
      toast({ message: e?.message ?? "That change wasn't saved", type: "error" });
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  const members = useMemo(() => (data?.roles ?? []).flatMap((r) =>
    r.members.map((m) => ({ ...m, roleId: r.id, roleName: r.name, admin: r.admin }))), [data]);

  if (!isAdmin) return null;

  const onToggle = (role, entry, grant) => run(
    `${role.id}:${entry.key}`,
    () => (grant ? account.team.access.grant(role.id, entry.key) : account.team.access.revoke(role.id, entry.key)),
    `${grant ? "Granted" : "Revoked"} “${entry.label}” ${grant ? "to" : "from"} ${titleCase(role.name)}`,
  );
  const onAssign = (userId, roleId) => run(`assign:${roleId}`, () => account.team.access.assign(userId, roleId), "Member moved");
  const onCreate = () => {
    if (!newRole.trim()) return;
    // Keep what was typed if it was refused (a reserved or duplicate name).
    run("create", () => account.team.access.createRole(newRole.trim()), "Role created").then((ok) => ok && setNewRole(""));
  };

  return (
    <Card>
      <CardHeader title="Roles & Permissions" subtitle="Only admins can see or change this" icon={Shield} />
      <CardBody className="space-y-4">
        <p className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          <Info size={14} className="mt-0.5 shrink-0 text-indigo-500" />
          <span>
            Permissions belong to a role, and everyone in the role gets them. To give one person more access, create a role
            for it and move them in. Everyone can already manage their own CRM tasks and meetings; a member only ever sees
            modules their department and your plan allow, whatever is granted here.
          </span>
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <input value={newRole} onChange={(e) => setNewRole(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onCreate()}
            placeholder="New role, e.g. Network operator" maxLength={40} aria-label="New role name"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
          <button type="button" onClick={onCreate} disabled={!newRole.trim() || busyKey === "create"}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white transition hover:bg-indigo-700 disabled:opacity-50">
            {busyKey === "create" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create role
          </button>
        </div>

        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{String(error)}</p>}
        {loading && !data && (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 animate-pulse">
            {[1, 2].map((i) => <div key={i} className="h-40 rounded-xl bg-slate-100 dark:bg-slate-700" />)}
          </div>
        )}
        {data && (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {data.roles.map((role) => (
              <RoleCard key={role.id} role={role} catalog={data.catalog} members={members}
                currentUserId={user?.id} busyKey={busyKey} onToggle={onToggle} onAssign={onAssign} />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
