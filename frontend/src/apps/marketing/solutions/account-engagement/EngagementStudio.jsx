import { useState } from "react";
import { GitBranch, Plus, Users, Target, Layers } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, Modal, Field, TextInput, PrimaryBtn, GhostBtn, fmtNum } from "../../components/mkt-ui";

const STATUS_VARIANT = { active: "success", paused: "warning", draft: "neutral", completed: "info" };

export default function EngagementStudio() {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const { data: journeys, loading, refetch } = useApi(() => marketing.b2b.journeys.list(), [], { pollingInterval: 60000 });
  const { mutate: create, loading: creating } = useMutation((d) => marketing.b2b.journeys.create(d), {
    onSuccess: () => { toast({ message: "Program created", type: "success" }); setShowModal(false); setName(""); refetch(); },
    onError: (e) => toast({ message: e?.message ?? "Failed", type: "error" }),
  });

  const all = journeys ?? [];
  const metrics = [
    { label: "Programs", value: fmtNum(all.length), icon: GitBranch, color: "sky" },
    { label: "Active", value: fmtNum(all.filter((j) => j.status === "active").length), icon: Layers, color: "violet" },
    { label: "Enrolled", value: fmtNum(all.reduce((s, j) => s + (j.enrolled ?? 0), 0)), icon: Users, color: "emerald" },
    { label: "Converted", value: fmtNum(all.reduce((s, j) => s + (j.converted ?? 0), 0)), icon: Target, color: "amber" },
  ];

  return (
    <SolutionShell solutionId="account-engagement" title="Engagement Studio" subtitle="Build multi-touch nurture programs for B2B prospects"
      actions={<PrimaryBtn color="sky" onClick={() => setShowModal(true)}><Plus size={15} /> New Program</PrimaryBtn>}>
      {showModal && (
        <Modal title="New Engagement Program" onClose={() => setShowModal(false)}
          footer={<><GhostBtn onClick={() => setShowModal(false)}>Cancel</GhostBtn><PrimaryBtn color="sky" disabled={creating || !name.trim()} onClick={() => create({ name })}>{creating ? "Creating…" : "Create"}</PrimaryBtn></>}>
          <Field label="Program Name *"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Enterprise Demo Nurture" /></Field>
        </Modal>
      )}

      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      {loading && all.length === 0 ? <Loading rows={6} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {all.map((j) => {
            const rate = j.enrolled ? Math.round((j.converted / j.enrolled) * 100) : 0;
            return (
              <div key={j.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center"><GitBranch size={18} className="text-sky-600 dark:text-sky-400" /></div>
                  <StatusBadge label={j.status} variant={STATUS_VARIANT[j.status] ?? "neutral"} />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{j.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{j.steps} steps</p>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 text-center">
                    <div className="text-base font-bold text-slate-900 dark:text-white">{fmtNum(j.enrolled)}</div>
                    <div className="text-[10px] text-slate-500">Enrolled</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 text-center">
                    <div className="text-base font-bold text-sky-600 dark:text-sky-400">{rate}%</div>
                    <div className="text-[10px] text-slate-500">Conversion</div>
                  </div>
                </div>
              </div>
            );
          })}
          {all.length === 0 && <div className="col-span-full py-10 text-center text-sm text-slate-400">No engagement programs yet.</div>}
        </div>
      )}
    </SolutionShell>
  );
}
