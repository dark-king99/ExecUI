import { useState } from "react";
import { Workflow, Plus, Zap, Mail, Clock, GitBranch, Users, Target, ChevronRight } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, Modal, Field, TextInput, PrimaryBtn, GhostBtn, fmtNum } from "../../components/mkt-ui";

const STATUS_VARIANT = { active: "success", paused: "warning", draft: "neutral" };
const STEP_ICON = { trigger: Zap, email: Mail, wait: Clock, condition: GitBranch };

function StepNode({ step }) {
  const Icon = STEP_ICON[step.type] ?? Mail;
  return (
    <div className="flex flex-col items-center gap-1.5 w-28 shrink-0">
      <div className="h-10 w-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
        <Icon size={17} className="text-violet-600 dark:text-violet-400" />
      </div>
      <div className="text-center">
        <div className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-tight">{step.label}</div>
        <div className="text-[10px] text-slate-400 mt-0.5">{step.config}</div>
      </div>
    </div>
  );
}

export default function JourneyBuilder() {
  const toast = useToast();
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const { data: flows, loading, refetch } = useApi(() => marketing.flows.list(), [], { pollingInterval: 60000 });
  const { data: detail, loading: detailLoading } = useApi(() => (selected ? marketing.flows.get(selected) : Promise.resolve(null)), [selected]);
  const { mutate: createFlow, loading: creating } = useMutation((d) => marketing.flows.create(d), {
    onSuccess: () => { toast({ message: "Journey created", type: "success" }); setShowModal(false); setName(""); refetch(); },
  });

  const all = flows ?? [];
  const metrics = [
    { label: "Journeys", value: fmtNum(all.length), icon: Workflow, color: "violet" },
    { label: "Active", value: fmtNum(all.filter((f) => f.status === "active").length), icon: Zap, color: "emerald" },
    { label: "Enrolled", value: fmtNum(all.reduce((s, f) => s + (f.enrolled ?? 0), 0)), icon: Users, color: "sky" },
    { label: "Converted", value: fmtNum(all.reduce((s, f) => s + (f.converted ?? 0), 0)), icon: Target, color: "amber" },
  ];

  return (
    <SolutionShell solutionId="engagement" title="Journey Builder" subtitle="Visual multi-step automated customer journeys"
      actions={<PrimaryBtn onClick={() => setShowModal(true)}><Plus size={15} /> New Journey</PrimaryBtn>}>
      {showModal && (
        <Modal title="New Journey" onClose={() => setShowModal(false)}
          footer={<><GhostBtn onClick={() => setShowModal(false)}>Cancel</GhostBtn><PrimaryBtn disabled={creating || !name.trim()} onClick={() => createFlow({ name, trigger: "signup" })}>{creating ? "Creating…" : "Create"}</PrimaryBtn></>}>
          <Field label="Journey Name *"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Onboarding Welcome Series" /></Field>
        </Modal>
      )}

      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Journeys" className="lg:col-span-1" pad={false}>
          {loading && all.length === 0 ? <Loading rows={3} /> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {all.map((f) => (
                <button key={f.id} onClick={() => setSelected(f.id)}
                  className={`w-full text-left px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${selected === f.id ? "bg-violet-50/50 dark:bg-violet-500/5" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-slate-900 dark:text-white truncate">{f.name}</span>
                    <StatusBadge label={f.status} variant={STATUS_VARIANT[f.status] ?? "neutral"} />
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{f.step_count} steps · {fmtNum(f.enrolled)} enrolled</div>
                </button>
              ))}
            </div>
          )}
        </Section>

        <Section title={detail?.name ?? "Journey Canvas"} subtitle={selected ? "Step-by-step flow" : "Select a journey to inspect its steps"} icon={Workflow} className="lg:col-span-2">
          {!selected ? (
            <div className="py-12 text-center text-sm text-slate-400">Pick a journey on the left to view its automation steps.</div>
          ) : detailLoading ? <Loading rows={2} /> : (
            <div className="overflow-x-auto pb-2">
              <div className="flex items-center gap-2 min-w-max py-2">
                {(detail?.steps ?? []).map((step, i, arr) => (
                  <div key={step.id} className="flex items-center gap-2">
                    <StepNode step={step} />
                    {i < arr.length - 1 && <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      </div>
    </SolutionShell>
  );
}
