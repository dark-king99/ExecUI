import { ShoppingCart, DollarSign, Package, Receipt } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, BarList, Loading, fmtMoney, fmtNum } from "../../components/mkt-ui";

export default function Overview() {
  const { data: metricsData, loading } = useApi(() => marketing.commerce.metrics(), [], { pollingInterval: 120000 });
  const m = metricsData ?? {};
  const matrix = m.channelMatrix ?? [];

  const metrics = [
    { label: "Commerce Revenue", value: m.totalRevenueFmt ?? fmtMoney(m.totalRevenue), icon: DollarSign, color: "rose" },
    { label: "Total Orders", value: fmtNum(m.totalOrders ?? 0), icon: Package, color: "violet" },
    { label: "Avg Order Value", value: fmtMoney(m.avgOrderValue), icon: Receipt, color: "amber" },
    { label: "Channels", value: matrix.length, icon: ShoppingCart, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="commerce" title="Commerce Overview" subtitle="Connect marketing to revenue and channel performance">
      <MetricGrid items={metrics} cols={4} loading={loading && !metricsData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Revenue by Channel" icon={DollarSign}>
          {loading && !metricsData ? <Loading rows={3} /> : <BarList items={matrix.map((c) => ({ label: c.channel, value: c.revenue }))} color="rose" format={fmtMoney} />}
        </Section>
        <Section title="Orders by Channel" icon={Package}>
          {loading && !metricsData ? <Loading rows={3} /> : <BarList items={matrix.map((c) => ({ label: c.channel, value: c.orders }))} color="violet" format={fmtNum} />}
        </Section>
      </div>
    </SolutionShell>
  );
}
