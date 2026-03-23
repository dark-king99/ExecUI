export default function TeamManager({ role }) {
  const safeRole = role ?? "employee";
  const isAdmin =
    safeRole === "enterprise_admin" || safeRole === "system_admin";

  // ---- STATIC SAFE DATA ----
  const teams = [
    {
      id: 1,
      name: "Customer Support",
      members: ["Alice", "Bob"],
    },
    {
      id: 2,
      name: "Sales",
      members: ["Charlie"],
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-slate-800">
          Teams
        </h3>
        <p className="text-sm text-slate-500">
          Organize users into functional teams
        </p>
      </div>

      {/* TEAM LIST */}
      <div className="space-y-3">
        {teams.map((team) => (
          <div
            key={team.id}
            className="
              rounded-xl border bg-white p-4
              transition-all duration-200
              hover:-translate-y-0.5 hover:shadow-md
            "
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-slate-800">
                  {team.name}
                </p>
                <p className="text-sm text-slate-600">
                  Members: {team.members.join(", ")}
                </p>
              </div>

              {isAdmin && (
                <button className="text-sm text-indigo-600 hover:underline">
                  Manage
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ADMIN ACTIONS */}
      {isAdmin ? (
        <button
          className="
            px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm
            hover:bg-indigo-700 transition
          "
        >
          Create New Team
        </button>
      ) : (
        <p className="text-xs text-slate-400">
          Team management is restricted to administrators.
        </p>
      )}
    </div>
  );
}
