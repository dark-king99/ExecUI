import { Layers, Sparkles, TrendingUp, Repeat, Star, Eye } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { SolutionShell, MetricGrid, Section } from "../../components/mkt-ui";

const RECIPES = [
  { id: "r1", name: "Collaborative Filtering", icon: Repeat, type: "Recommendation", status: "active", lift: 18.4, desc: "Recommends items based on what similar visitors engaged with.", surface: "Product pages" },
  { id: "r2", name: "Trending Now", icon: TrendingUp, type: "Recommendation", status: "active", lift: 11.2, desc: "Surfaces the most-viewed content over a rolling 24-hour window.", surface: "Homepage" },
  { id: "r3", name: "Recently Viewed", icon: Eye, type: "Recovery", status: "active", lift: 9.7, desc: "Re-surfaces items a visitor browsed in their previous session.", surface: "Cart / nav" },
  { id: "r4", name: "Top Rated For You", icon: Star, type: "Personalized", status: "paused", lift: 14.1, desc: "Blends affinity scores with star ratings for a tailored shelf.", surface: "Category pages" },
  { id: "r5", name: "Complete the Set", icon: Layers, type: "Cross-sell", status: "active", lift: 22.6, desc: "Bundles complementary items based on co-purchase patterns.", surface: "Checkout" },
  { id: "r6", name: "New & Noteworthy", icon: Sparkles, type: "Discovery", status: "draft", lift: 0, desc: "Introduces newly added catalog items to engaged visitors.", surface: "Email blocks" },
];

export default function Recipes() {
  const active = RECIPES.filter((r) => r.status === "active");
  const avgLift = active.length ? (active.reduce((s, r) => s + r.lift, 0) / active.length).toFixed(1) : "—";
  const metrics = [
    { label: "Recipes", value: RECIPES.length, icon: Layers, color: "pink" },
    { label: "Active", value: active.length, icon: Sparkles, color: "emerald" },
    { label: "Avg Lift", value: avgLift === "—" ? "—" : `+${avgLift}%`, icon: TrendingUp, color: "violet" },
    { label: "Surfaces", value: new Set(RECIPES.map((r) => r.surface)).size, icon: Eye, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="personalization" title="Recipes" subtitle="Recommendation strategies that power your personalized shelves">
      <MetricGrid items={metrics} cols={4} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {RECIPES.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center"><Icon size={18} className="text-pink-600 dark:text-pink-400" /></div>
                <StatusBadge label={r.status} variant={r.status === "active" ? "success" : r.status === "paused" ? "warning" : "neutral"} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{r.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{r.desc}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-400">{r.surface}</span>
                {r.lift > 0 && <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{r.lift}% lift</span>}
              </div>
            </div>
          );
        })}
      </div>
    </SolutionShell>
  );
}
