import { Bot, Play, Zap, CheckCircle2, Layers } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, Pill, fmtNum } from "../../components/net-ui";

const STATUS_VARIANT = { success: "success", running: "info", pending: "warning", failed: "danger", queued: "neutral" };
const TRIGGER_COLOR = { schedule: "sky", event: "violet", manual: "slate", webhook: "amber" };

export default function Automation() {
  const toast = useToast();
  const { data: jobs, loading, refetch } = useApi(() => network.automation.jobs(), [], { pollingInterval: 60000 });
  const { data: templates } = useApi(() => network.automation.templates(), [], { pollingInterval: 300000 });
  const { mutate: run } = useMutation((id) => network.automation.run(id), { onSuccess: () => { toast({ message: "Job started", type: "success" }); refetch(); } });

  const all = jobs ?? [];
  const tpls = templates ?? [];
  const metrics = [
    { label: "Jobs", value: fmtNum(all.length), icon: Bot, color: "amber" },
    { label: "Running", value: fmtNum(all.filter((j) => j.status === "running").length), icon: Zap, color: "sky" },
    { label: "Succeeded", value: fmtNum(all.filter((j) => j.status === "success").length), icon: CheckCircle2, color: "emerald" },
    { label: "Templates", value: fmtNum(tpls.length), icon: Layers, color: "violet" },
  ];

  return (
    <SolutionShell solutionId="config" title="Automation" subtitle="Schedule and run routine network operations">
      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <Section title="Automation Jobs" icon={Bot} pad={false}>
        {loading && all.length === 0 ? <Loading table /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Job", "Trigger", "Targets", "Last Run", "Status", ""].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {all.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{j.name}</div>
                      <div className="text-xs text-slate-400">{j.description}</div>
                    </td>
                    <td className="px-5 py-3"><Pill color={TRIGGER_COLOR[j.trigger] ?? "slate"}>{j.trigger}</Pill></td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{j.targets}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{j.lastRun}{j.duration && j.duration !== "—" ? ` · ${j.duration}` : ""}</td>
                    <td className="px-5 py-3"><StatusBadge label={j.status} variant={STATUS_VARIANT[j.status] ?? "neutral"} dot /></td>
                    <td className="px-5 py-3">
                      <button onClick={() => run(j.id)} className="text-xs flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg transition"><Play size={12} /> Run</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Templates" subtitle="Pre-built automation recipes" icon={Layers}>
        {!templates ? <Loading rows={3} /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tpls.map((t) => (
              <div key={t.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t.name}</h3>
                  <Pill color="violet">{t.category}</Pill>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t.description}</p>
                <div className="text-[11px] text-slate-400 mt-2">{t.steps?.length ?? 0} steps</div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </SolutionShell>
  );
}
