import { Brain, Zap, AlertTriangle, ArrowUpRight, Target } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useApi } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading } from "../../components/mkt-ui";

// Decisioning strategies require a connected decision engine — none fabricated.
const STRATEGIES = [];

export default function Decisions() {
  const { data: cdp, loading } = useApi(() => marketing.cdp.metrics(), [], { pollingInterval: 120000 });
  const p = cdp?.predictiveLayer ?? {};

  const metrics = [
    { label: "Decision Strategies", value: STRATEGIES.length, icon: Brain, color: "pink" },
    { label: "Churn Risk", value: p.churnRisk != null ? `${p.churnRisk}%` : "—", icon: AlertTriangle, color: "amber" },
    { label: "Upsell Probability", value: p.upsellProbability != null ? `${p.upsellProbability}%` : "—", icon: ArrowUpRight, color: "emerald" },
    { label: "Decision Latency", value: cdp?.latency != null ? `${cdp.latency}ms` : "—", icon: Zap, color: "violet" },
  ];

  return (
    <SolutionShell solutionId="personalization" title="Einstein Decisions" subtitle="Interaction-time decisioning powered by predictive models">
      <MetricGrid items={metrics} cols={4} loading={loading && !cdp} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Recommended Next Best Action" icon={Target} className="lg:col-span-1">
          {loading && !cdp ? <Loading rows={2} /> : (
            <div className="rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 p-5 text-white">
              <div className="text-xs uppercase tracking-wide opacity-80">Einstein recommends</div>
              <div className="text-lg font-bold mt-1">{p.nextBestAction ?? "—"}</div>
              <div className="text-xs opacity-80 mt-2">{cdp?.confidence != null ? `Confidence ${cdp.confidence}%` : "Connect a model to generate recommendations"}</div>
            </div>
          )}
        </Section>

        <Section title="Decision Strategies" subtitle="Live decisioning rules" icon={Brain} className="lg:col-span-2" pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Strategy", "Trigger", "Action", "Served", "Status"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {STRATEGIES.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-400">No decision strategies configured.</td></tr>
                ) : STRATEGIES.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{s.name}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{s.trigger}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300 text-xs">{s.action}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{s.served}</td>
                    <td className="px-5 py-3"><StatusBadge label={s.status} variant={s.status === "active" ? "success" : "warning"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </SolutionShell>
  );
}
