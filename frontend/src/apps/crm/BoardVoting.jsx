import { useState } from "react";
import { Vote, ThumbsUp, ThumbsDown, Minus, RefreshCw, AlertCircle, CheckCircle, Clock } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useApi, useMutation } from "../../hooks/useApi";
import { crm } from "../../services/api";

const STATUS_VARIANT = { open: "info", passed: "success", rejected: "danger", pending: "warning", closed: "neutral" };

export default function BoardVoting() {
  const toast = useToast();
  const [votingId, setVotingId] = useState(null);
  const { data: resolutions, loading, error, refetch } = useApi(() => crm.resolutions.list(), [], { pollingInterval: 30000 });
  const { mutate: castVote, loading: voting } = useMutation(({ id, type }) => crm.resolutions.vote(id, type), {
    onSuccess: () => { toast({ message: "Vote cast", type: "success" }); refetch(); setVotingId(null); },
    onError: (e) => toast({ message: e?.message ?? "Failed to vote", type: "error" }),
  });
  const all = resolutions ?? [];
  const open = all.filter(r => r.status === "open" || r.status === "pending");
  const closed = all.filter(r => r.status === "passed" || r.status === "rejected" || r.status === "closed");
  const stats = { total: all.length, open: open.length, passed: all.filter(r => r.status === "passed").length, participation: all.length ? Math.round(all.reduce((s, r) => s + (r.participationRate ?? 0), 0) / all.length) : 0 };
  return (
    <div className="space-y-6">
      <PageHeader title="Board Voting" subtitle="Participate in governance decisions and track resolution outcomes"
        actions={<button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh</button>}
      />
      {loading && all.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total Resolutions" value={stats.total} icon={Vote} color="orange" />
          <Stat label="Open for Vote" value={stats.open} icon={Clock} color="sky" />
          <Stat label="Passed" value={stats.passed} icon={CheckCircle} color="emerald" />
          <Stat label="Avg Participation" value={stats.participation ? `${stats.participation}%` : "—"} icon={Vote} color="amber" />
        </div>
      )}
      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}

      {open.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Open Resolutions</h2>
          {open.map((r, i) => {
            const totalVotes = (r.forVotes ?? 0) + (r.againstVotes ?? 0) + (r.abstainVotes ?? 0);
            const forPct = totalVotes ? Math.round(((r.forVotes ?? 0) / totalVotes) * 100) : 0;
            const againstPct = totalVotes ? Math.round(((r.againstVotes ?? 0) / totalVotes) * 100) : 0;
            return (
              <Card key={r.id ?? i}>
                <CardBody>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{r.title ?? r.name}</h3>
                        <StatusBadge label={r.status ?? "open"} variant={STATUS_VARIANT[r.status] ?? "info"} />
                      </div>
                      {r.description && <p className="text-sm text-slate-600 dark:text-slate-400">{r.description}</p>}
                      {r.deadline && <p className="text-xs text-slate-400 mt-1">Deadline: {r.deadline}</p>}
                    </div>
                    {!r.voted && (
                      <div className="flex gap-2 shrink-0">
                        {[["for", ThumbsUp, "bg-emerald-500 hover:bg-emerald-600"], ["against", ThumbsDown, "bg-red-500 hover:bg-red-600"], ["abstain", Minus, "bg-slate-400 hover:bg-slate-500"]].map(([type, Icon, cls]) => (
                          <button key={type} disabled={voting && votingId === r.id} onClick={() => { setVotingId(r.id); castVote({ id: r.id, type }); }} className={`flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded-lg transition ${cls} disabled:opacity-60 capitalize`}>
                            <Icon size={13} /> {type}
                          </button>
                        ))}
                      </div>
                    )}
                    {r.voted && <StatusBadge label={`Voted: ${r.myVote ?? "yes"}`} variant="success" />}
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${forPct}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-emerald-600 w-10 text-right shrink-0">{forPct}% ✓</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${againstPct}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-red-600 w-10 text-right shrink-0">{againstPct}% ✗</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <span>{totalVotes} votes cast</span>
                      {r.participationRate != null && <span>{r.participationRate}% participation</span>}
                      {r.quorum != null && <span>Quorum: {r.quorum}%</span>}
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {closed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Closed Resolutions</h2>
          <Card>
            {loading && all.length === 0 ? <div className="p-4"><SkeletonTable rows={5} /></div> : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {closed.map((r, i) => (
                  <div key={r.id ?? i} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-900 dark:text-white">{r.title ?? r.name}</div>
                      {r.closedAt && <div className="text-xs text-slate-400 mt-0.5">Closed {r.closedAt}</div>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge label={r.status} variant={STATUS_VARIANT[r.status] ?? "neutral"} />
                      {r.forVotes != null && <span className="text-xs text-slate-500">{r.forVotes} for / {r.againstVotes ?? 0} against</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {!loading && all.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Vote size={40} className="text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm">No resolutions found.</p>
        </div>
      )}
    </div>
  );
}
