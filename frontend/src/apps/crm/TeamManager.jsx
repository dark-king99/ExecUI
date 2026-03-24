import { AlertCircle, Loader2, Plus } from "lucide-react";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { crm } from "../../services/api";

export default function TeamManager({ role }) {
  const toast = useToast();
  const isAdmin = role === "enterprise_admin" || role === "system_admin";

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
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-slate-800 dark:text-white">Teams</h3>
        <p className="text-sm text-slate-500">Organize users into functional teams</p>
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
                <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Manage</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {isAdmin ? (
        <button
          onClick={() => createTeam()}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-60 transition"
        >
          {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Create New Team
        </button>
      ) : (
        <p className="text-xs text-slate-400">Team management is restricted to administrators.</p>
      )}
    </div>
  );
}
