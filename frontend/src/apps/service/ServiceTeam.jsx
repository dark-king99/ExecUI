import { useState, useEffect, useCallback } from "react";
import { Users, RefreshCw, AlertTriangle, Loader2, Mail, Phone } from "lucide-react";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

function apiFetch(path, opts = {}) {
  const token = localStorage.getItem("auth_token");
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `HTTP ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
  });
}

export default function ServiceTeam() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/service/team").catch(() => []);
      setMembers(Array.isArray(data) ? data : data?.data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  if (error && members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-10 w-10 text-rose-500" />
        <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
        <button onClick={fetchTeam} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Team</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Service team members and contact information.
          </p>
        </div>
        <button onClick={fetchTeam} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400 dark:text-slate-500">
          <Users className="h-8 w-8" />
          <p className="text-sm">No team members found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <div key={member.id} className="rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                  {(member.firstName?.[0] ?? "?")}{(member.lastName?.[0] ?? "")}
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{member.department ?? "—"}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <a href={`mailto:${member.email}`} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                  <Mail className="h-3.5 w-3.5" /> {member.email}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
