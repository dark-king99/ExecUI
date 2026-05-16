import { useState } from "react";
import { AlertCircle, Loader2, Plus, X, Users } from "lucide-react";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { crm } from "../../services/api";
import PageHeader from "../../components/ui/PageHeader";
import { Stat } from "../../components/ui/Card";

function ManageTeamModal({ team, onClose }) {
  const toast = useToast();
  const [name, setName] = useState(team.name ?? "");
  const { mutate: save, loading } = useMutation(
    (data) => crm.teams.update ? crm.teams.update(team.id, data) : Promise.resolve({}),
    {
      onSuccess: () => toast({ message: "Team updated.", type: "success" }),
      onError: (err) => toast({ message: err?.message ?? "Failed to update team.", type: "error" }),
    }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Manage Team</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Team Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          {Array.isArray(team.members) && team.members.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Members</p>
              <div className="flex flex-wrap gap-2">
                {team.members.map((m, i) => (
                  <span key={i} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-full">{m}</span>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              Cancel
            </button>
            <button
              onClick={() => save({ name })}
              disabled={loading}
              className="text-sm px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white transition"
            >
              {loading ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeamManager({ role }) {
  const toast = useToast();
  const isAdmin = role === "enterprise_admin" || role === "system_admin";
  const [managing, setManaging] = useState(null);

  const { data: teams, loading, error, refetch } = useApi(
    () => crm.teams.list(), [], { pollingInterval: 120000 }
  );

  const { mutate: createTeam, loading: creating } = useMutation(
    () => crm.teams.create({ name: "New Team" }),
    {
      onSuccess: () => { toast({ message: "Team created", type: "success" }); refetch(); },
      onError: (err) => toast({ message: err?.message ?? "Failed to create team", type: "error" }),
    }
  );

  const allTeams = teams ?? [];

  return (
    <div className="space-y-6">
      {managing && <ManageTeamModal team={managing} onClose={() => setManaging(null)} />}
      <PageHeader
        title="Team Manager"
        subtitle="Organize users into functional teams and manage access."
        actions={
          isAdmin && (
            <button
              onClick={() => createTeam()}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm hover:bg-orange-700 disabled:opacity-60 transition"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create Team
            </button>
          )
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat label="Total Teams" value={loading ? "…" : allTeams.length} icon={Users} color="orange" />
        <Stat label="Total Members" value={loading ? "…" : allTeams.reduce((s, t) => s + (Array.isArray(t.members) ? t.members.length : (t.memberCount ?? 0)), 0)} icon={Users} color="sky" />
        <Stat label="Admin Access" value={isAdmin ? "Enabled" : "Restricted"} icon={Users} color={isAdmin ? "emerald" : "amber"} />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {loading && allTeams.length === 0 && (
        <div className="space-y-3 animate-pulse">
          {[1,2].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
        </div>
      )}

      {!loading && !error && allTeams.length === 0 && (
        <p className="text-sm text-slate-500">No teams found. Create your first team below.</p>
      )}

      <div className="space-y-3">
        {allTeams.map(team => (
          <div
            key={team.id}
            className="rounded-xl border bg-white dark:bg-slate-900 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-slate-800 dark:text-white">{team.name}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Members: {Array.isArray(team.members) ? team.members.join(", ") : (team.memberCount ?? "—")}
                </p>
              </div>
              {isAdmin && (
                <button onClick={() => setManaging(team)} className="text-sm text-orange-600 dark:text-orange-400 hover:underline">Manage</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {!isAdmin && (
        <p className="text-xs text-slate-400">Team management is restricted to administrators.</p>
      )}
    </div>
  );
}
