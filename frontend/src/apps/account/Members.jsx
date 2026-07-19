import { useState, useMemo } from "react";
import { Users, Plus, Search, IdCard, Ban, CheckCircle2, Trash2, Mail, Copy, Check } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { enterprise } from "../../services/api";

function AddMemberModal({ roles, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", employeeId: "", role: "employee" });
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(null);
  const [copied, setCopied] = useState(false);
  const { mutate, loading } = useMutation((d) => enterprise.users.invite(d), {
    onSuccess: (u) => { setDone(u); onCreated(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">{done ? "Employee provisioned" : "Add employee"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl leading-none">×</button>
        </div>

        {done ? (
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm"><CheckCircle2 size={16} /> {done.fullName} can now complete signup.</div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex items-center justify-between px-4 py-2.5">
                <div><div className="text-[11px] uppercase tracking-wide text-slate-400">Employee ID</div><div className="font-mono font-semibold text-slate-900 dark:text-white">{done.employeeId}</div></div>
                <button onClick={() => { navigator.clipboard?.writeText(done.employeeId); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "Copied" : "Copy"}</button>
              </div>
              <div className="px-4 py-2.5"><div className="text-[11px] uppercase tracking-wide text-slate-400">Email</div><div className="text-slate-700 dark:text-slate-200">{done.email}</div></div>
            </div>
            <p className="text-xs text-slate-500">Share the Employee ID + your enterprise code with them. They'll set their own password at sign-up.</p>
            <div className="flex justify-end"><button onClick={onClose} className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition">Done</button></div>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            {err && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">First name *</label><input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Last name *</label><input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
            </div>
            <div><label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Work email *</label><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="name@company.com" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Employee ID</label><input value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)} placeholder="Auto-generated" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                <select value={form.role} onChange={(e) => set("role", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {(roles ?? [{ name: "employee" }]).map((r) => <option key={r.id ?? r.name} value={r.name}>{r.name.replace("_", " ")}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
              <button onClick={() => { if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) return setErr("Name and email are required"); mutate(form); }} disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white transition">{loading ? "Adding…" : "Add employee"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Members() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const { data: members, loading, refetch } = useApi(() => enterprise.users.list(), [], { pollingInterval: 60000 });
  const { data: roles } = useApi(() => enterprise.roles.list(), []);
  const { mutate: toggle } = useMutation((id) => enterprise.users.toggleStatus(id), { onSuccess: () => { toast({ message: "Member updated", type: "success" }); refetch(); }, onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }) });
  const { mutate: remove } = useMutation((id) => enterprise.users.delete(id), { onSuccess: () => { toast({ message: "Member removed", type: "success" }); refetch(); }, onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }) });

  const all = members ?? [];
  const filtered = useMemo(() => all.filter((u) => !search || u.fullName?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())), [all, search]);

  const memberStatus = (u) => {
    if (u.status === "invited") return { label: "Invited", variant: "warning" };
    if (!u.isActive) return { label: "Suspended", variant: "danger" };
    return { label: "Active", variant: "success" };
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Members" subtitle="Provision employees and issue Employee IDs for your enterprise."
        actions={<button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition"><Plus size={15} /> Add employee</button>}
      />
      {showModal && <AddMemberModal roles={roles} onClose={() => setShowModal(false)} onCreated={refetch} />}

      {loading && all.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Members" value={all.length} icon={Users} color="indigo" />
          <Stat label="Active" value={all.filter((u) => u.status === "active" && u.isActive).length} icon={CheckCircle2} color="emerald" />
          <Stat label="Invited" value={all.filter((u) => u.status === "invited").length} icon={Mail} color="amber" />
          <Stat label="Suspended" value={all.filter((u) => !u.isActive).length} icon={Ban} color="red" />
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{filtered.length} member{filtered.length !== 1 ? "s" : ""}</h3>
          <div className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 bg-white dark:bg-slate-900">
            <Search size={13} className="text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="text-sm bg-transparent outline-none text-slate-900 dark:text-white w-36" />
          </div>
        </div>
        {loading && all.length === 0 ? <div className="p-5"><SkeletonTable rows={6} /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Employee", "Role", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} className="py-10 text-center text-sm text-slate-500">No members found.</td></tr>
                ) : filtered.map((u) => {
                  const st = memberStatus(u);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-900 dark:text-white">{u.fullName}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </td>
                      <td className="px-5 py-3 capitalize text-slate-600 dark:text-slate-300">{u.role?.name?.replace("_", " ") ?? "—"}</td>
                      <td className="px-5 py-3"><StatusBadge label={st.label} variant={st.variant} dot /></td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => toggle(u.id)} title={u.isActive ? "Suspend" : "Activate"} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition">{u.isActive ? <Ban size={14} /> : <CheckCircle2 size={14} />}</button>
                          <button onClick={() => remove(u.id)} title="Remove" className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
