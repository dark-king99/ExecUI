import { BarChart3, DollarSign, TrendingUp, Target, Wallet } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, BarList, Loading, fmtMoney, fmtNum } from "../../components/mkt-ui";

export default function Overview() {
  const { data: summary, loading } = useApi(() => marketing.analytics.summary(), [], { pollingInterval: 120000 });
  const { data: trend } = useApi(() => marketing.analytics.trend(), [], { pollingInterval: 120000 });

  const s = summary ?? {};
  const t = trend ?? [];

  const metrics = [
    { label: "Total Revenue", value: s.totalRevenueFmt ?? fmtMoney(s.totalRevenue), icon: DollarSign, color: "amber" },
    { label: "Total Spend", value: s.totalSpendFmt ?? fmtMoney(s.totalSpend), icon: Wallet, color: "violet" },
    { label: "Blended ROAS", value: s.roas != null ? `${s.roas}×` : "—", icon: TrendingUp, color: "emerald" },
    { label: "Conversions", value: fmtNum(s.totalConversions ?? 0), icon: Target, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="intelligence" title="Intelligence Overview" subtitle="Unified marketing performance across every channel">
      <MetricGrid items={metrics} cols={4} loading={loading && !summary} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Revenue Trend" subtitle="Last 6 months" icon={TrendingUp}>
          {!trend ? <Loading rows={3} /> : <BarList items={t.map((x) => ({ label: x.month, value: x.revenue }))} color="amber" format={fmtMoney} />}
        </Section>
        <Section title="Spend Trend" subtitle="Last 6 months" icon={BarChart3}>
          {!trend ? <Loading rows={3} /> : <BarList items={t.map((x) => ({ label: x.month, value: x.spend }))} color="violet" format={fmtMoney} />}
        </Section>
      </div>

      <Section title="Lead & Conversion Flow" subtitle="Monthly leads vs conversions" icon={Target} pad={false}>
        {!trend ? <Loading table /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Month", "Leads", "Conversions", "Conv. Rate", "Revenue"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {t.map((x) => (
                  <tr key={x.month} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{x.month}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{fmtNum(x.leads)}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{fmtNum(x.conversions)}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{x.leads ? `${((x.conversions / x.leads) * 100).toFixed(1)}%` : "—"}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{fmtMoney(x.revenue)}</td>
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
