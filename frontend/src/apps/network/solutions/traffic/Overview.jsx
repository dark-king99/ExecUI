import { Activity, ArrowDownToLine, ArrowUpFromLine, Gauge, Network } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, BarList, Loading } from "../../components/net-ui";

const KPI_ICON = [Gauge, ArrowDownToLine, ArrowUpFromLine, Network];
const KPI_COLOR = ["violet", "sky", "amber", "emerald"];

export default function Overview() {
  const { data: overview, loading } = useApi(() => network.traffic.overview(), [], { pollingInterval: 30000 });
  const { data: talkers } = useApi(() => network.traffic.topTalkers(), [], { pollingInterval: 60000 });

  const o = overview ?? {};
  const kpis = (o.kpis ?? []).map((k, i) => ({ label: k.label, value: k.value, icon: KPI_ICON[i] ?? Activity, color: KPI_COLOR[i] ?? "violet" }));
  const top = (talkers ?? []).slice(0, 6);

  const split = [
    { label: "Inbound", value: o.inboundMbps ?? 0 },
    { label: "Outbound", value: o.outboundMbps ?? 0 },
  ];

  return (
    <SolutionShell solutionId="traffic" title="Traffic Overview" subtitle="Live bandwidth and throughput across the network">
      <MetricGrid items={kpis.length ? kpis : [{ label: "Throughput", value: "—", icon: Gauge, color: "violet" }]} cols={4} loading={loading && !overview} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Bandwidth Direction" subtitle="Inbound vs outbound" icon={Activity}>
          {loading && !overview ? <Loading rows={2} /> : (
            <>
              <BarList items={split} color="violet" format={(v) => `${v} Mbps`} />
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[["Inbound", o.bandwidth?.inbound], ["Outbound", o.bandwidth?.outbound], ["Internal", o.bandwidth?.internal]].map(([l, v]) => (
                  <div key={l} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{v ?? "—"}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{l}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Section>

        <Section title="Top Talkers" subtitle="Highest-bandwidth hosts" icon={Network}>
          {!talkers ? <Loading rows={3} /> : (
            <BarList items={top.map((t) => ({ label: t.hostname ?? t.name, value: t.percent, sub: t.traffic }))} color="violet" format={(v) => `${v}%`} />
          )}
        </Section>
      </div>
    </SolutionShell>
  );
}
