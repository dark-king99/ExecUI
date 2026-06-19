import { useNavigate } from "react-router-dom";
import { Bot, FlaskConical, Sparkles, Lightbulb, ArrowRight, TrendingUp } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, fmtNum } from "../../components/mkt-ui";

const CAPABILITIES = [
  { id: "content", label: "Content Generation", desc: "Generate on-brand copy for email, social, and ads.", icon: Sparkles, path: "/marketing/einstein/content" },
  { id: "experiments", label: "Experiments", desc: "Run A/B and multivariate tests with significance tracking.", icon: FlaskConical, path: "/marketing/einstein/experiments" },
  { id: "predictive", label: "Predictive Insights", desc: "Surface churn, upsell, and engagement predictions.", icon: Lightbulb, path: "/marketing/einstein/predictive" },
];

export default function Overview() {
  const navigate = useNavigate();
  const { data: experiments, loading } = useApi(() => marketing.experiments.list(), [], { pollingInterval: 120000 });
  const { data: cdp } = useApi(() => marketing.cdp.metrics(), [], { pollingInterval: 120000 });

  const exp = experiments ?? [];
  const running = exp.filter((e) => e.status === "running");
  const p = cdp?.predictiveLayer ?? {};

  const metrics = [
    { label: "Active Experiments", value: fmtNum(running.length), icon: FlaskConical, color: "emerald" },
    { label: "Avg Confidence", value: running.length ? `${Math.round(running.reduce((s, e) => s + (e.confidence ?? 0), 0) / running.length)}%` : "—", icon: TrendingUp, color: "violet" },
    { label: "Predicted Churn", value: p.churnRisk != null ? `${p.churnRisk}%` : "—", icon: Lightbulb, color: "amber" },
    { label: "Upsell Probability", value: p.upsellProbability != null ? `${p.upsellProbability}%` : "—", icon: Bot, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="einstein" title="Einstein AI" subtitle="Generative and predictive intelligence for every campaign">
      <MetricGrid items={metrics} cols={4} loading={loading && exp.length === 0} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {CAPABILITIES.map((c) => {
          const Icon = c.icon;
          return (
            <button key={c.id} onClick={() => navigate(c.path)} className="group text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center"><Icon size={18} className="text-emerald-600 dark:text-emerald-400" /></div>
                <ArrowRight size={15} className="text-slate-300 group-hover:translate-x-0.5 transition" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{c.label}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{c.desc}</p>
            </button>
          );
        })}
      </div>

      <Section title="Recommended Next Best Action" icon={Bot}>
        {!cdp ? <Loading rows={1} /> : (
          <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide opacity-80">Einstein recommends</div>
              <div className="text-lg font-bold mt-1">{p.nextBestAction ?? "Email re-engagement"}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">+{cdp?.projectedLift ?? 18}%</div>
              <div className="text-xs opacity-80">projected lift</div>
            </div>
          </div>
        )}
      </Section>
    </SolutionShell>
  );
}
