import { useState } from "react";
import { FlaskConical, Plus, Play, Pause, TrendingUp, Trophy } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, Modal, Field, TextInput, SelectInput, PrimaryBtn, GhostBtn, fmtNum } from "../../components/mkt-ui";

const STATUS_VARIANT = { running: "success", completed: "info", paused: "warning", draft: "neutral" };

function VariantBar({ variant, best }) {
  const isWinner = best && variant.name === best.name;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">{variant.name}{isWinner && <Trophy size={12} className="text-amber-500" />}</span>
        <span className="text-slate-500">{variant.rate}% · {fmtNum(variant.conversions)}/{fmtNum(variant.visitors)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full ${isWinner ? "bg-emerald-500" : "bg-violet-400"}`} style={{ width: `${Math.min(100, (variant.rate ?? 0) * 8)}%` }} />
      </div>
    </div>
  );
}

export default function Experiments() {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", type: "a/b", metric: "conversion_rate", hypothesis: "" });
  const { data: experiments, loading, refetch } = useApi(() => marketing.experiments.list(), [], { pollingInterval: 60000 });
  const { mutate: create, loading: creating } = useMutation((d) => marketing.experiments.create(d), {
    onSuccess: () => { toast({ message: "Experiment created", type: "success" }); setShowModal(false); setForm({ name: "", type: "a/b", metric: "conversion_rate", hypothesis: "" }); refetch(); },
  });
  const { mutate: start } = useMutation((id) => marketing.experiments.start(id), { onSuccess: () => { toast({ message: "Experiment started", type: "success" }); refetch(); } });
  const { mutate: pause } = useMutation((id) => marketing.experiments.pause(id), { onSuccess: () => { toast({ message: "Experiment paused", type: "success" }); refetch(); } });

  const all = experiments ?? [];
  const metrics = [
    { label: "Experiments", value: all.length, icon: FlaskConical, color: "emerald" },
    { label: "Running", value: all.filter((e) => e.status === "running").length, icon: Play, color: "violet" },
    { label: "Completed", value: all.filter((e) => e.status === "completed").length, icon: Trophy, color: "amber" },
    { label: "Avg Lift", value: all.filter((e) => e.lift).length ? `+${(all.reduce((s, e) => s + (e.lift ?? 0), 0) / all.filter((e) => e.lift).length).toFixed(1)}%` : "—", icon: TrendingUp, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="einstein" title="Experiments" subtitle="A/B and multivariate tests with statistical significance"
      actions={<PrimaryBtn color="emerald" onClick={() => setShowModal(true)}><Plus size={15} /> New Experiment</PrimaryBtn>}>
      {showModal && (
        <Modal title="New Experiment" onClose={() => setShowModal(false)}
          footer={<><GhostBtn onClick={() => setShowModal(false)}>Cancel</GhostBtn><PrimaryBtn color="emerald" disabled={creating || !form.name.trim()} onClick={() => create(form)}>{creating ? "Creating…" : "Create"}</PrimaryBtn></>}>
          <Field label="Experiment Name *"><TextInput value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Homepage CTA Color" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><SelectInput value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>{["a/b", "multivariate", "split"].map((t) => <option key={t}>{t}</option>)}</SelectInput></Field>
            <Field label="Metric"><SelectInput value={form.metric} onChange={(e) => setForm((p) => ({ ...p, metric: e.target.value }))}>{["conversion_rate", "click_rate", "engagement"].map((t) => <option key={t}>{t}</option>)}</SelectInput></Field>
          </div>
          <Field label="Hypothesis"><TextInput value={form.hypothesis} onChange={(e) => setForm((p) => ({ ...p, hypothesis: e.target.value }))} placeholder="A green CTA will outperform blue by 10%" /></Field>
        </Modal>
      )}

      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      {loading && all.length === 0 ? <Loading rows={4} /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {all.map((e) => {
            const best = (e.variants ?? []).reduce((a, b) => ((b.rate ?? 0) > (a?.rate ?? -1) ? b : a), null);
            return (
              <div key={e.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{e.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 capitalize">{e.type} · {e.metric?.replace("_", " ")}</p>
                  </div>
                  <StatusBadge label={e.status} variant={STATUS_VARIANT[e.status] ?? "neutral"} />
                </div>
                {e.hypothesis && <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-3">“{e.hypothesis}”</p>}
                <div className="space-y-2.5">
                  {(e.variants ?? []).map((v) => <VariantBar key={v.name} variant={v} best={e.status !== "draft" ? best : null} />)}
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-400">{e.confidence != null ? `Confidence ${e.confidence}%` : "Not started"}{e.lift != null && e.lift > 0 && <span className="text-emerald-600 dark:text-emerald-400 font-medium ml-2">+{e.lift}% lift</span>}</div>
                  {e.status === "running" ? (
                    <button onClick={() => pause(e.id)} className="text-xs flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg transition"><Pause size={12} /> Pause</button>
                  ) : e.status !== "completed" ? (
                    <button onClick={() => start(e.id)} className="text-xs flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition"><Play size={12} /> Start</button>
                  ) : null}
                </div>
              </div>
            );
          })}
          {all.length === 0 && <div className="col-span-full py-10 text-center text-sm text-slate-400">No experiments yet.</div>}
        </div>
      )}
    </SolutionShell>
  );
}
