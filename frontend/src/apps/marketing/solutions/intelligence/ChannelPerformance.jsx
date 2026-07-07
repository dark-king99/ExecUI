import { LineChart, DollarSign, TrendingUp, Target } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, BarList, Loading, fmtMoney, fmtNum } from "../../components/mkt-ui";

export default function ChannelPerformance() {
  const { data: channels, loading } = useApi(() => marketing.analytics.channelPerf(), [], { pollingInterval: 120000 });
  const all = channels ?? [];

  const totalRevenue = all.reduce((s, c) => s + (c.revenue ?? 0), 0);
  const totalSpend = all.reduce((s, c) => s + (c.spend ?? 0), 0);
  const best = [...all].sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0))[0];

  const metrics = [
    { label: "Channels", value: all.length, icon: LineChart, color: "amber" },
    { label: "Revenue", value: fmtMoney(totalRevenue), icon: DollarSign, color: "emerald" },
    { label: "Blended ROAS", value: totalSpend ? `${(totalRevenue / totalSpend).toFixed(1)}×` : "—", icon: TrendingUp, color: "violet" },
    { label: "Top Channel", value: best?.channel ?? "—", icon: Target, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="intelligence" title="Channel Analytics" subtitle="Compare performance and efficiency across every channel">
      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Revenue by Channel" icon={DollarSign}>
          {loading && all.length === 0 ? <Loading rows={3} /> : <BarList items={all.map((c) => ({ label: c.channel, value: c.revenue }))} color="amber" format={fmtMoney} />}
        </Section>
        <Section title="Return on Ad Spend" subtitle="ROAS by channel" icon={TrendingUp}>
          {loading && all.length === 0 ? <Loading rows={3} /> : <BarList items={all.map((c) => ({ label: c.channel, value: c.roas }))} color="emerald" format={(v) => `${v}×`} />}
        </Section>
      </div>

      <Section title="Channel Detail" icon={LineChart} pad={false}>
        {loading && all.length === 0 ? <Loading table /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Channel", "Revenue", "Spend", "ROAS", "Conversions", "CTR"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {all.map((c) => (
                  <tr key={c.channel} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{c.channel}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{fmtMoney(c.revenue)}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{fmtMoney(c.spend)}</td>
                    <td className="px-5 py-3"><span className={`font-semibold ${c.roas >= 5 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}>{c.roas}×</span></td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{fmtNum(c.conversions)}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{c.ctr}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </SolutionShell>
  );
}
