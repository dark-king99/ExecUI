import { useMemo } from "react";
import { FileBarChart, DollarSign, Megaphone, TrendingUp } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, BarList, Loading, fmtMoney, fmtNum } from "../../components/mkt-ui";

const groupSum = (rows, key, field) => {
  const map = {};
  rows.forEach((r) => { const k = r[key] ?? "Other"; map[k] = (map[k] ?? 0) + (r[field] ?? 0); });
  return Object.entries(map).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
};

export default function Reports() {
  const { data: campaigns, loading } = useApi(() => marketing.campaigns.list({ limit: 200 }), [], { pollingInterval: 120000 });
  const all = campaigns ?? [];

  const byChannel = useMemo(() => groupSum(all, "channel", "revenue"), [all]);
  const byObjective = useMemo(() => groupSum(all, "objective", "revenue"), [all]);
  const topRoi = useMemo(() => [...all].filter((c) => c.roi != null).sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0)).slice(0, 8), [all]);

  const totalRevenue = all.reduce((s, c) => s + (c.revenue ?? 0), 0);
  const totalSpend = all.reduce((s, c) => s + (c.spent ?? 0), 0);
  const avgRoi = all.filter((c) => c.roi != null).length ? Math.round(all.reduce((s, c) => s + (c.roi ?? 0), 0) / all.filter((c) => c.roi != null).length) : 0;

  const metrics = [
    { label: "Campaigns Reported", value: fmtNum(all.length), icon: Megaphone, color: "amber" },
    { label: "Total Revenue", value: fmtMoney(totalRevenue), icon: DollarSign, color: "emerald" },
    { label: "Total Spend", value: fmtMoney(totalSpend), icon: DollarSign, color: "violet" },
    { label: "Avg ROI", value: avgRoi ? `${avgRoi}%` : "—", icon: TrendingUp, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="intelligence" title="Reports" subtitle="Cross-campaign performance reports and leaderboards">
      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Revenue by Channel" icon={FileBarChart}>
          {loading && all.length === 0 ? <Loading rows={3} /> : <BarList items={byChannel} color="amber" format={fmtMoney} />}
        </Section>
        <Section title="Revenue by Objective" icon={FileBarChart}>
          {loading && all.length === 0 ? <Loading rows={3} /> : <BarList items={byObjective} color="violet" format={fmtMoney} />}
        </Section>
      </div>

      <Section title="Top Campaigns by ROI" icon={TrendingUp} pad={false}>
        {loading && all.length === 0 ? <Loading table /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Campaign", "Channel", "Revenue", "Spend", "Conversions", "ROI"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {topRoi.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-500">No reportable campaigns.</td></tr>
                ) : topRoi.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{c.name}</td>
                    <td className="px-5 py-3 text-slate-500 capitalize">{c.channel}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{fmtMoney(c.revenue)}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{fmtMoney(c.spent)}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{fmtNum(c.conversions)}</td>
                    <td className="px-5 py-3"><span className="font-semibold text-emerald-600 dark:text-emerald-400">{c.roi}%</span></td>
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
