import { Layers, Sparkles, TrendingUp } from "lucide-react";
import { SolutionShell, MetricGrid, Section } from "../../components/mkt-ui";

// Recommendation recipes require a connected personalization engine — no
// fabricated recipes are shown. This becomes populated once recipes are created.
const RECIPES = [];

export default function Recipes() {
  const metrics = [
    { label: "Recipes", value: RECIPES.length, icon: Layers, color: "pink" },
    { label: "Active", value: 0, icon: Sparkles, color: "emerald" },
    { label: "Avg Lift", value: "—", icon: TrendingUp, color: "violet" },
    { label: "Surfaces", value: 0, icon: Sparkles, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="personalization" title="Recipes" subtitle="Recommendation strategies that power your personalized shelves">
      <MetricGrid items={metrics} cols={4} />
      <Section title="Recommendation Recipes" icon={Layers}>
        <div className="py-12 text-center">
          <Layers size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No recipes yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Connect a personalization engine to build recommendation recipes for your web and email surfaces.</p>
        </div>
      </Section>
    </SolutionShell>
  );
}
