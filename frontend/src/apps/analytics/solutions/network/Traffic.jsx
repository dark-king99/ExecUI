import { Activity, Network, Users, Gauge } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, BarList, Loading } from "../../components/an-ui";

const KPI_ICON = [Gauge, Activity, Activity, Network];
const KPI_COLOR = ["emerald", "sky", "amber", "violet"];

export default function Traffic() {
  const { data: overview, loading } = useApi(() => network.traffic.overview(), [], { pollingInterval: 30000 });
  const { data: protocols } = useApi(() => network.traffic.protocols(), [], { pollingInterval: 60000 });
  const { data: talkers } = useApi(() => network.traffic.topTalkers(), [], { pollingInterval: 60000 });

  const o = overview ?? {};
  const kpis = (o.kpis ?? []).map((k, i) => ({ label: k.label, value: k.value, icon: KPI_ICON[i] ?? Activity, color: KPI_COLOR[i] ?? "emerald" }));
  const proto = protocols ?? [];
  const top = (talkers ?? []).slice(0, 8);

  return (
    <SolutionShell solutionId="network" title="Traffic Analytics" subtitle="Throughput, protocol mix, and top bandwidth consumers">
      <MetricGrid items={kpis.length ? kpis : [{ label: "Throughput", value: "—", icon: Gauge, color: "emerald" }]} cols={4} loading={loading && !overview} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Protocol Mix" icon={Network}>
          {!protocols ? <Loading rows={3} /> : <BarList items={proto.map((p) => ({ label: p.name, value: p.percent, sub: p.bytes }))} color="emerald" format={(v) => `${v}%`} />}
        </Section>
        <Section title="Top Talkers" subtitle="Highest-bandwidth hosts" icon={Users}>
          {!talkers ? <Loading rows={3} /> : <BarList items={top.map((t) => ({ label: t.hostname ?? t.name, value: t.percent, sub: t.traffic }))} color="emerald" format={(v) => `${v}%`} />}
        </Section>
      </div>
    </SolutionShell>
  );
}
