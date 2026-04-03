import { useState } from "react";
import { CheckCircle2, XCircle, FileText, Users, Gavel, AlertCircle, Loader2 } from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { crm } from "../../services/api";

export default function BoardVoting() {
  const [selected, setSelected] = useState(null);

  const { data: resolutions, loading, error, refetch } = useApi(
    () => crm.resolutions.list(), [], { pollingInterval: 30000 }
  );

  const { mutate: castVote, loading: voting } = useMutation(
    ({ id, type }) => crm.resolutions.vote(id, type),
    {
      onSuccess: () => { refetch(); setSelected(null); },
    }
  );

  const allResolutions = resolutions ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Gavel className="h-6 w-6" />
          Board Voting & Resolutions
        </h1>
        <p className="text-slate-500">Executive governance, voting, and formal resolutions</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="border-b p-3 text-slate-900 dark:text-white font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" /> Resolutions
          </div>

          {loading && allResolutions.length === 0 && (
            <div className="p-4 space-y-3 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded" />)}
            </div>
          )}

          {!loading && allResolutions.length === 0 && !error && (
            <p className="p-6 text-sm text-slate-400 text-center">No resolutions found.</p>
          )}

          <div className="divide-y">
            {allResolutions.map(r => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{r.title}</div>
                    <div className="text-xs text-slate-500">{r.description}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    r.status === "Passed"   ? "bg-emerald-100 text-emerald-700" :
                    r.status === "Open"     ? "bg-amber-100 text-amber-700"    :
                                              "bg-slate-200 text-slate-700"
                  }`}>{r.status}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-4">
          {!selected ? (
            <div className="text-sm text-slate-500">Select a resolution to view details.</div>
          ) : (
            <>
              <div>
                <h3 className="font-semibold text-lg">{selected.title}</h3>
                <p className="text-sm text-slate-500">{selected.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded border flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Approve: {selected.votes?.approve ?? 0}
                </div>
                <div className="p-3 rounded border flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  Reject: {selected.votes?.reject ?? 0}
                </div>
              </div>

              {selected.status === "Open" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => castVote({ id: selected.id, type: "approve" })}
                    disabled={voting}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-600 text-white text-sm disabled:opacity-60"
                  >
                    {voting && <Loader2 size={13} className="animate-spin" />} Approve
                  </button>
                  <button
                    onClick={() => castVote({ id: selected.id, type: "reject" })}
                    disabled={voting}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-red-600 text-white text-sm disabled:opacity-60"
                  >
                    {voting && <Loader2 size={13} className="animate-spin" />} Reject
                  </button>
                </div>
              )}

              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-sm">
                <div className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" /> Governance
                </div>
                <p className="text-slate-600 dark:text-slate-300 mt-1">
                  Votes are recorded for audit and compliance. Passed resolutions become binding executive directives.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
