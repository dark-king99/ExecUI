import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  FileText,
  Users,
  Gavel,
} from "lucide-react";

// ---- MOCK RESOLUTIONS ----
const INITIAL_RESOLUTIONS = [
  {
    id: "R-001",
    title: "Approve FY2026 Budget",
    description: "Approve company-wide budget allocation for FY2026.",
    status: "Open",
    votes: {
      approve: 2,
      reject: 0,
    },
    voters: [],
  },
  {
    id: "R-002",
    title: "Authorize Series B Fundraising",
    description: "Approve management to proceed with Series B round.",
    status: "Passed",
    votes: {
      approve: 4,
      reject: 1,
    },
    voters: ["Acme Capital", "Nova Ventures"],
  },
];

export default function BoardVoting() {
  const [resolutions, setResolutions] = useState(INITIAL_RESOLUTIONS);
  const [selected, setSelected] = useState(null);

  const castVote = (id, type) => {
    setResolutions((prev) =>
      prev.map((r) => {
        if (r.id !== id || r.status !== "Open") return r;

        const updated = {
          ...r,
          votes: {
            ...r.votes,
            [type]: r.votes[type] + 1,
          },
        };

        // Simple rule: pass if approve >= 3
        if (updated.votes.approve >= 3) {
          updated.status = "Passed";
        }

        return updated;
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Gavel className="h-6 w-6" />
          Board Voting & Resolutions
        </h1>
        <p className="text-slate-500">
          Executive governance, voting, and formal resolutions
        </p>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resolutions List */}
        <div className="lg:col-span-2 rounded-xl border bg-white dark:bg-slate-900">
          <div className="border-b p-3 font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Resolutions
          </div>

          <div className="divide-y">
            {resolutions.map((r) => (
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
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      r.status === "Passed"
                        ? "bg-emerald-100 text-emerald-700"
                        : r.status === "Open"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 space-y-4">
          {!selected ? (
            <div className="text-sm text-slate-500">
              Select a resolution to view details.
            </div>
          ) : (
            <>
              <div>
                <h3 className="font-semibold text-lg">{selected.title}</h3>
                <p className="text-sm text-slate-500">{selected.description}</p>
              </div>

              {/* Vote Stats */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded border flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Approve: {selected.votes.approve}
                </div>
                <div className="p-3 rounded border flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  Reject: {selected.votes.reject}
                </div>
              </div>

              {/* Actions */}
              {selected.status === "Open" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => castVote(selected.id, "approve")}
                    className="px-3 py-1 rounded bg-emerald-600 text-white text-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => castVote(selected.id, "reject")}
                    className="px-3 py-1 rounded bg-red-600 text-white text-sm"
                  >
                    Reject
                  </button>
                </div>
              )}

              {/* Governance Info */}
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-sm">
                <div className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Governance
                </div>
                <p className="text-slate-600 dark:text-slate-300 mt-1">
                  Votes are recorded for audit and compliance. Passed resolutions
                  become binding executive directives.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}