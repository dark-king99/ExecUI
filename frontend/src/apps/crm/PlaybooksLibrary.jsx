import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { BookOpen, Play, Plus, Zap, AlertCircle, Loader2 } from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { crm } from "../../services/api";

const TYPE_VARIANT   = { Onboarding: "indigo", Retention: "warning", Expansion: "success", "Re-engage": "info" };
const STATUS_VARIANT = { active: "success", draft: "neutral" };

export default function PlaybooksLibrary() {
  const toast = useToast();
  const [filter, setFilter] = useState("all");

  const { data: playbooks, loading, error, refetch } = useApi(
    () => crm.playbooks.list(), [], { pollingInterval: 120000 }
  );

  const { mutate: runPlaybook, loading: running } = useMutation(
    (id) => crm.playbooks.run(id),
    {
      onSuccess: () => { toast({ message: "Playbook started successfully", type: "success" }); refetch(); },
      onError: (err) => toast({ message: err?.message ?? "Failed to run playbook", type: "error" }),
    }
  );

  const allPlaybooks = playbooks ?? [];
  const types = ["all", ...new Set(allPlaybooks.map(p => p.type).filter(Boolean))];
  const filtered = filter === "all" ? allPlaybooks : allPlaybooks.filter(p => p.type === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Playbooks Library"
        subtitle="Reusable sales and service playbooks with automation triggers"
        actions={
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition">
            <Plus size={15} /> New Playbook
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {types.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === t
                ? "bg-indigo-600 text-white"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400"
            }`}
          >
            {t === "all" ? "All" : t}
          </button>
        ))}
      </div>

      {loading && allPlaybooks.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-36 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
        </div>
      )}

      {!loading && !error && allPlaybooks.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">No playbooks found. Create your first playbook above.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(pb => (
          <Card key={pb.id ?? pb.name}>
            <CardBody>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                    <BookOpen size={16} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{pb.name}</p>
                    <StatusBadge label={pb.type} variant={TYPE_VARIANT[pb.type] ?? "neutral"} />
                  </div>
                </div>
                <StatusBadge label={pb.status} variant={STATUS_VARIANT[pb.status] ?? "neutral"} dot />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-3">
                <div className="flex items-center gap-1">
                  <Zap size={12} className="text-amber-500" />
                  {pb.trigger ?? "Manual"}
                </div>
                <div>{pb.steps} steps{pb.uses != null ? ` · Used ${pb.uses}×` : ""}</div>
              </div>

              <div className="flex gap-2 mt-3">
                <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 hover:border-indigo-400 transition">
                  <BookOpen size={13} /> View
                </button>
                <button
                  onClick={() => runPlaybook(pb.id)}
                  disabled={running}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs hover:bg-indigo-700 disabled:opacity-60 transition"
                >
                  {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Run
                </button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
