import { useState } from "react";
import { Users, Plus, RefreshCw, AlertCircle, X, Shield, Trash2 } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { crm } from "../../services/api";

const ROLE_VARIANT = { admin: "danger", manager: "indigo", rep: "info", sdr: "neutral", "sales-engineer": "warning" };
const EMPTY_TEAM = { name: "", description: "", leadId: "" };

function NewTeamModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_TEAM);
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => crm.teams.create(d), {
    onSuccess: () => { toast({ message: "Team created", type: "success" }); onCreated(); onClose(); },
    onError: (e) => setErr(e?.message ?? "Failed"),
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">New Team</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); setErr(null); if (!form.name.trim()) { setErr("Team name required"); return; } mutate(form); }} className="px-6 py-5 space-y-4">
          {err && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Team Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. East Coast Enterprise" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea rows={2} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Team focus or territory…" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Team Lead ID</label>
            <input value={form.leadId} onChange={e => set("leadId", e.target.value)} placeholder="User ID of team lead" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white transition">{loading ? "Creating…" : "Create Team"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TeamManager() {
  const [showModal, setShowModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const { data: teams, loading, error, refetch } = useApi(() => crm.teams.list(), [], { pollingInterval: 120000 });
  const { data: reps, loading: repsLoading } = useApi(() => crm.reps.list({ limit: 200 }), [], { pollingInterval: 120000 });
  const allTeams = teams ?? [];
  const allReps = reps ?? [];
  const totalReps = allReps.length;
  const avgTeamSize = allTeams.length ? Math.round(totalReps / allTeams.length) : 0;

  return (
    <div className="space-y-6">
      {showModal && <NewTeamModal onClose={() => setShowModal(false)} onCreated={refetch} />}
      <PageHeader title="Team Manager" subtitle="Structure, configure, and manage your sales teams"
        actions={<button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 py-2 rounded-lg transition"><Plus size={15} /> New Team</button>}
      />
      {loading && allTeams.length === 0 ? (
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Total Teams" value={allTeams.length} icon={Shield} color="orange" />
          <Stat label="Total Reps" value={totalReps} icon={Users} color="sky" />
          <Stat label="Avg Team Size" value={avgTeamSize || "—"} icon={Users} color="emerald" />
        </div>
      )}
      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}

      <div className="flex gap-4 items-start">
        {/* Teams list */}
        <div className="w-72 shrink-0">
          <Card>
            <CardHeader title="Teams" icon={Shield} actions={<button onClick={refetch} className="text-slate-400 hover:text-orange-600 transition"><RefreshCw size={14} /></button>} />
            {loading && allTeams.length === 0 ? <div className="p-4"><SkeletonTable rows={5} /></div> : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {allTeams.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">No teams yet.</p> : allTeams.map((t, i) => (
                  <button key={t.id ?? i} onClick={() => setSelectedTeam(t)} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${selectedTeam?.id === t.id ? "bg-orange-50 dark:bg-orange-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}>
                    <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 font-bold text-sm shrink-0">{(t.name ?? "T")[0].toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{t.name}</div>
                      <div className="text-xs text-slate-400">{t.memberCount ?? t.members?.length ?? 0} members</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Team detail */}
        <div className="flex-1 min-w-0">
          {selectedTeam ? (
            <Card>
              <CardHeader title={selectedTeam.name} subtitle={selectedTeam.description ?? ""} icon={Shield} />
              <CardBody className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  {[["Lead", selectedTeam.lead ?? selectedTeam.leadName ?? "—"], ["Region", selectedTeam.region ?? "—"], ["Members", selectedTeam.memberCount ?? "—"]].map(([l, v]) => (
                    <div key={l} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
                      <div className="text-xs text-slate-500 mb-1">{l}</div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{v}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Team Members</h3>
                  {repsLoading ? <SkeletonTable rows={4} /> : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800">
                            {["Name", "Role", "Pipeline", "Attainment"].map(h => (
                              <th key={h} className="text-left pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider pr-4">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {(selectedTeam.members ?? allReps.filter(r => r.teamId === selectedTeam.id || r.team === selectedTeam.name)).slice(0, 10).map((m, i) => (
                            <tr key={m.id ?? i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                              <td className="py-3 pr-4">
                                <div className="flex items-center gap-2">
                                  <div className="h-7 w-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 font-semibold text-xs">{(m.name ?? "?")[0].toUpperCase()}</div>
                                  <span className="font-medium text-slate-900 dark:text-white">{m.name ?? m.rep}</span>
                                </div>
                              </td>
                              <td className="py-3 pr-4"><StatusBadge label={m.role ?? m.title ?? "rep"} variant={ROLE_VARIANT[m.role] ?? "neutral"} /></td>
                              <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{m.pipeline ?? "—"}</td>
                              <td className="py-3">
                                {m.attainment != null ? <span className={`text-xs font-bold ${m.attainment >= 100 ? "text-emerald-600" : "text-amber-600"}`}>{m.attainment}%</span> : "—"}
                              </td>
                            </tr>
                          ))}
                          {!(selectedTeam.members ?? []).length && allReps.filter(r => r.teamId === selectedTeam.id || r.team === selectedTeam.name).length === 0 && (
                            <tr><td colSpan={4} className="py-6 text-center text-sm text-slate-500">No members assigned.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <Shield size={36} className="text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-slate-500">Select a team to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
