import { Vote, ThumbsUp, CheckCircle2, Clock } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, Pill, fmtNum } from "../../components/crm-ui";

const STATUS_VARIANT = { approved: "success", under_review: "warning", rejected: "danger" };

export default function BoardVoting() {
  const toast = useToast();
  const { data: resolutions, loading, refetch } = useApi(() => crm.resolutions.list(), [], { pollingInterval: 120000 });
  const { mutate: vote } = useMutation((id) => crm.resolutions.vote(id, "up"), {
    onSuccess: () => { toast({ message: "Vote recorded", type: "success" }); refetch(); },
  });

  const all = resolutions ?? [];
  const metrics = [
    { label: "Resolutions", value: fmtNum(all.length), icon: Vote, color: "orange" },
    { label: "Approved", value: fmtNum(all.filter((r) => r.status === "approved").length), icon: CheckCircle2, color: "emerald" },
    { label: "Under Review", value: fmtNum(all.filter((r) => r.status === "under_review").length), icon: Clock, color: "amber" },
    { label: "Total Votes", value: fmtNum(all.reduce((s, r) => s + (r.votes ?? 0), 0)), icon: ThumbsUp, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="partners" title="Board Voting" subtitle="Govern shared policies with partner board resolutions">
      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      {loading && all.length === 0 ? <Loading rows={4} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {all.map((r) => (
            <div key={r.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{r.title}</h3>
                <StatusBadge label={(r.status ?? "").replace("_", " ")} variant={STATUS_VARIANT[r.status] ?? "neutral"} />
              </div>
              <Pill color="orange">{r.category}</Pill>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300"><ThumbsUp size={14} className="text-slate-400" /> {fmtNum(r.votes)} votes</div>
                <button onClick={() => vote(r.id)} className="text-xs flex items-center gap-1 px-3 py-1.5 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg transition"><ThumbsUp size={12} /> Vote</button>
              </div>
            </div>
          ))}
          {all.length === 0 && <div className="col-span-full py-10 text-center text-sm text-slate-400">No resolutions.</div>}
        </div>
      )}
    </SolutionShell>
  );
}
