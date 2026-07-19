import { Lightbulb, AlertTriangle, ArrowUpRight, Activity, Gauge } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, Pill } from "../../components/mkt-ui";

// Model catalog (the predictions themselves come from the CDP predictive layer).
const MODELS = [
  { name: "Churn Propensity", target: "Likelihood to cancel in 30d", accuracy: null, key: "churnRisk", suffix: "%", tone: "amber" },
  { name: "Upsell Likelihood", target: "Likelihood to upgrade plan", accuracy: null, key: "upsellProbability", suffix: "%", tone: "emerald" },
  { name: "Engagement Score", target: "Predicted 30d engagement", accuracy: null, key: null, suffix: "", tone: "violet" },
];

// Per-segment predictions require a trained model — none fabricated.
const SEGMENT_PREDICTIONS = [];

const RISK_VARIANT = { Low: "success", Medium: "warning", High: "danger" };

export default function Predictive() {
  const { data: cdp, loading } = useApi(() => marketing.cdp.metrics(), [], { pollingInterval: 120000 });
  const p = cdp?.predictiveLayer ?? {};

  const metrics = [
    { label: "Active Models", value: cdp?.activeModels ?? MODELS.length, icon: Lightbulb, color: "emerald" },
    { label: "Churn Risk", value: p.churnRisk != null ? `${p.churnRisk}%` : "—", icon: AlertTriangle, color: "amber" },
    { label: "Upsell Probability", value: p.upsellProbability != null ? `${p.upsellProbability}%` : "—", icon: ArrowUpRight, color: "violet" },
    { label: "Match Confidence", value: cdp?.confidence != null ? `${cdp.confidence}%` : "—", icon: Gauge, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="einstein" title="Predictive Insights" subtitle="AI models scoring every customer for churn, upsell, and engagement">
      <MetricGrid items={metrics} cols={4} loading={loading && !cdp} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {MODELS.map((m) => (
          <Section key={m.name} title={m.name} icon={Activity}>
            <div className="text-xs text-slate-500 mb-3">{m.target}</div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{m.key && p[m.key] != null ? `${p[m.key]}${m.suffix}` : "—"}</div>
                <div className="text-[11px] text-slate-400 mt-1">current population avg</div>
              </div>
              <Pill color={m.tone === "amber" ? "amber" : m.tone === "emerald" ? "emerald" : "violet"}>{m.accuracy != null ? `${m.accuracy}% acc.` : "untrained"}</Pill>
            </div>
          </Section>
        ))}
      </div>

      <Section title="Predictions by Segment" subtitle="Recommended action per audience" icon={Lightbulb} pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                {["Segment", "Churn Risk", "Upsell Potential", "Next Best Action"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {SEGMENT_PREDICTIONS.length === 0 && (
                <tr><td colSpan={4} className="py-10 text-center text-sm text-slate-400">No segment predictions yet — train a model to generate them.</td></tr>
              )}
              {SEGMENT_PREDICTIONS.map((s) => (
                <tr key={s.segment} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{s.segment}</td>
                  <td className="px-5 py-3"><Pill color={s.churn === "High" ? "amber" : s.churn === "Low" ? "emerald" : "slate"}>{s.churn}</Pill></td>
                  <td className="px-5 py-3"><Pill color={s.upsell === "High" ? "emerald" : s.upsell === "Low" ? "slate" : "violet"}>{s.upsell}</Pill></td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{s.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </SolutionShell>
  );
}
