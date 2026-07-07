import { Gauge, Cpu, HeartPulse, AlertTriangle } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, BarList, Loading, fmtNum } from "../../components/an-ui";

export default function Performance() {
  const { data: capacity, loading } = useApi(() => network.capacity.summary(), [], { pollingInterval: 60000 });
  const { data: links } = useApi(() => network.capacity.links(), [], { pollingInterval: 60000 });
  const { data: services } = useApi(() => network.serviceHealth.list(), [], { pollingInterval: 60000 });

  const c = capacity ?? {};
  const ls = links ?? [];
  const svc = services ?? [];

  const healthy = svc.filter((s) => s.status === "healthy").length;
  const avgAvail = svc.length ? (svc.reduce((s, x) => s + (x.current ?? x.availability ?? 0), 0) / svc.length).toFixed(2) : "—";

  const metrics = [
    { label: "Avg CPU", value: c.avgCpu != null ? `${c.avgCpu}%` : "—", icon: Cpu, color: "emerald" },
    { label: "Avg Bandwidth", value: c.avgBandwidthMbps != null ? `${c.avgBandwidthMbps} Mbps` : "—", icon: Gauge, color: "sky" },
    { label: "Avg Availability", value: avgAvail === "—" ? "—" : `${avgAvail}%`, icon: HeartPulse, color: "amber" },
    { label: "Critical / Warning", value: `${fmtNum(c.critical ?? 0)} / ${fmtNum(c.warning ?? 0)}`, icon: AlertTriangle, color: "red" },
  ];

  return (
    <SolutionShell solutionId="network" title="Performance" subtitle="Capacity headroom and service-level health">
      <MetricGrid items={metrics} cols={4} loading={loading && !capacity} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Bandwidth Hotspots" subtitle="Highest-bandwidth devices" icon={Gauge}>
          {!links ? <Loading rows={3} /> : <BarList items={ls.slice(0, 8).map((l) => ({ label: l.hostname, value: l.bandwidth_mbps ?? 0 }))} color="emerald" format={(v) => `${v} Mbps`} />}
        </Section>

        <Section title="Service Health" subtitle={`${healthy} of ${svc.length} healthy`} icon={HeartPulse} pad={false}>
          {!services ? <div className="p-5"><Loading rows={3} /></div> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
              {svc.map((s) => (
                <div key={s.id} className="px-5 py-2.5 flex items-center gap-3">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${s.status === "healthy" ? "bg-emerald-500" : s.status === "breached" ? "bg-red-500" : "bg-amber-500"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{s.name}</div>
                    <div className="text-xs text-slate-400">{s.team}</div>
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{s.current ?? s.availability}%</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </SolutionShell>
  );
}
