import { useState } from "react";
import { Crosshair, DollarSign, TrendingUp, Wallet, Repeat } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, BarList, Loading, fmtMoney } from "../../components/mkt-ui";

export default function Attribution() {
  const [modelIdx, setModelIdx] = useState(0);
  const { data: summary, loading } = useApi(() => marketing.attribution.summary(), [], { pollingInterval: 120000 });
  const { data: models } = useApi(() => marketing.attribution.models(), [], { pollingInterval: 120000 });
  const { data: ltvCac } = useApi(() => marketing.attribution.ltvCac(), [], { pollingInterval: 120000 });

  const s = summary ?? {};
  const ms = models ?? [];
  const lc = ltvCac ?? {};
  const model = ms[modelIdx];

  const metrics = [
    { label: "Attributed Revenue", value: s.totalRevenueFmt ?? fmtMoney(s.totalRevenue), icon: DollarSign, color: "amber" },
    { label: "Total Spend", value: s.totalSpendFmt ?? fmtMoney(s.totalSpend), icon: Wallet, color: "violet" },
    { label: "Avg LTV", value: fmtMoney(s.avgLtv ?? lc.ltv), icon: TrendingUp, color: "emerald" },
    { label: "LTV : CAC", value: lc.ltvCacRatio != null ? `${lc.ltvCacRatio}:1` : "—", icon: Repeat, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="intelligence" title="Attribution" subtitle="Multi-touch attribution models and unit economics">
      <MetricGrid items={metrics} cols={4} loading={loading && !summary} />

      <Section title="Attribution Model" subtitle={model?.description} icon={Crosshair}
        actions={
          <div className="flex flex-wrap gap-1.5">
            {ms.map((m, i) => (
              <button key={m.name} onClick={() => setModelIdx(i)} className={`text-xs px-2.5 py-1 rounded-full border transition ${i === modelIdx ? "bg-amber-500 text-white border-amber-500" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-400"}`}>{m.name}</button>
            ))}
          </div>
        }>
        {!models ? <Loading rows={3} /> : model ? (
          <BarList items={Object.entries(model.channels).map(([label, value]) => ({ label, value }))} color="amber" format={(v) => `${v}%`} />
        ) : <div className="py-6 text-center text-sm text-slate-400">No model data.</div>}
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="LTV by Segment" icon={TrendingUp}>
          {!ltvCac ? <Loading rows={3} /> : <BarList items={Object.entries(lc.bySegment ?? {}).map(([label, value]) => ({ label, value }))} color="emerald" format={fmtMoney} />}
        </Section>
        <Section title="CAC by Channel" icon={Wallet}>
          {!ltvCac ? <Loading rows={3} /> : <BarList items={Object.entries(lc.cacByChannel ?? {}).map(([label, value]) => ({ label, value }))} color="violet" format={fmtMoney} />}
        </Section>
      </div>
    </SolutionShell>
  );
}
