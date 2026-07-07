import { DollarSign, TrendingUp, Users, Target, Megaphone } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, ColumnChart, BarList, Loading, fmtMoney, fmtNum } from "../../components/an-ui";

export default function Overview() {
  const { data: summary, loading } = useApi(() => marketing.analytics.summary(), [], { pollingInterval: 120000 });
  const { data: campaigns } = useApi(() => marketing.campaigns.summary(), [], { pollingInterval: 120000 });
  const { data: trend } = useApi(() => marketing.analytics.trend(), [], { pollingInterval: 120000 });

  const s = summary ?? {};
  const c = campaigns ?? {};
  const t = trend ?? [];

  const metrics = [
    { label: "Revenue Attributed", value: s.totalRevenueFmt ?? fmtMoney(s.totalRevenue), icon: DollarSign, color: "violet" },
    { label: "Blended ROAS", value: s.roas != null ? `${s.roas}×` : "—", icon: TrendingUp, color: "emerald" },
    { label: "Conversions", value: fmtNum(s.totalConversions ?? 0), icon: Target, color: "amber" },
    { label: "Live Contacts", value: fmtNum(c.liveContacts ?? s.liveContacts ?? 0), icon: Users, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="marketing" title="Marketing Overview" subtitle="Revenue and engagement across all campaigns">
      <MetricGrid items={metrics} cols={4} loading={loading && !summary} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Revenue Trend" subtitle="Last 6 months" icon={TrendingUp}>
          {!trend ? <Loading rows={3} /> : <ColumnChart items={t.map((x) => ({ label: x.month, value: x.revenue }))} color="violet" format={fmtMoney} />}
        </Section>
        <Section title="Spend vs Leads" subtitle="Monthly" icon={Megaphone}>
          {!trend ? <Loading rows={3} /> : (
            <BarList items={t.map((x) => ({ label: x.month, value: x.leads, sub: fmtMoney(x.spend) }))} color="violet" format={fmtNum} />
          )}
        </Section>
      </div>

      <Section title="Campaign Status" icon={Megaphone}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[["Active", c.active, "emerald"], ["Paused", c.paused, "amber"], ["Completed", c.completed, "sky"], ["Total", c.total, "violet"]].map(([label, val]) => (
            <div key={label} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{fmtNum(val ?? 0)}</div>
              <div className="text-xs text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </Section>
    </SolutionShell>
  );
}
