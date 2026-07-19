import { useState } from "react";
import { LineChart, DollarSign, TrendingUp, Crosshair } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, BarList, Loading, fmtMoney, fmtNum } from "../../components/an-ui";

export default function Channels() {
  const [modelIdx, setModelIdx] = useState(0);
  const { data: channels, loading } = useApi(() => marketing.analytics.channelPerf(), [], { pollingInterval: 120000 });
  const { data: models } = useApi(() => marketing.attribution.models(), [], { pollingInterval: 120000 });
  const { data: ltvCac } = useApi(() => marketing.attribution.ltvCac(), [], { pollingInterval: 120000 });

  const all = channels ?? [];
  const ms = models ?? [];
  const lc = ltvCac ?? {};
  const model = ms[modelIdx];

  const totalRevenue = all.reduce((s, c) => s + (c.revenue ?? 0), 0);
  const totalSpend = all.reduce((s, c) => s + (c.spend ?? 0), 0);
  const best = [...all].sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0))[0];

  const metrics = [
    { label: "Channels", value: fmtNum(all.length), icon: LineChart, color: "violet" },
    { label: "Revenue", value: fmtMoney(totalRevenue), icon: DollarSign, color: "emerald" },
    { label: "Blended ROAS", value: totalSpend ? `${(totalRevenue / totalSpend).toFixed(1)}×` : "—", icon: TrendingUp, color: "amber" },
    { label: "Top Channel", value: best?.channel ?? "—", icon: Crosshair, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="marketing" title="Channel Analytics" subtitle="Performance and attribution across marketing channels">
      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Revenue by Channel" icon={DollarSign}>
          {loading && all.length === 0 ? <Loading rows={3} /> : <BarList items={all.map((c) => ({ label: c.channel, value: c.revenue }))} color="violet" format={fmtMoney} />}
        </Section>
        <Section title="ROAS by Channel" icon={TrendingUp}>
          {loading && all.length === 0 ? <Loading rows={3} /> : <BarList items={all.map((c) => ({ label: c.channel, value: c.roas }))} color="emerald" format={(v) => `${v}×`} />}
        </Section>
      </div>

      <Section title="Attribution Model" subtitle={model?.description} icon={Crosshair}
        actions={
          <div className="flex flex-wrap gap-1.5">
            {ms.map((m, i) => (
              <button key={m.name} onClick={() => setModelIdx(i)} className={`text-xs px-2.5 py-1 rounded-full border transition ${i === modelIdx ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-400"}`}>{m.name}</button>
            ))}
          </div>
        }>
        {!models ? <Loading rows={3} /> : model ? (
          <BarList items={Object.entries(model.channels).map(([label, value]) => ({ label, value }))} color="violet" format={(v) => `${v}%`} />
        ) : <div className="py-6 text-center text-sm text-slate-400">No model data.</div>}
        {lc.ltvCacRatio != null && (
          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
            {[["Avg LTV", fmtMoney(lc.ltv)], ["CAC", fmtMoney(lc.cac)], ["LTV : CAC", `${lc.ltvCacRatio}:1`]].map(([l, v]) => (
              <div key={l} className="text-center"><div className="text-lg font-bold text-slate-900 dark:text-white">{v}</div><div className="text-[11px] text-slate-500">{l}</div></div>
            ))}
          </div>
        )}
      </Section>
    </SolutionShell>
  );
}
