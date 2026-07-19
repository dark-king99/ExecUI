import { TrendingUp, Cpu, MemoryStick, AlertTriangle } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useApi } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, UtilBar, fmtNum } from "../../components/net-ui";

const STATUS_VARIANT = { up: "success", down: "danger", degraded: "warning", maintenance: "warning" };

export default function Capacity() {
  const { data: summary, loading } = useApi(() => network.capacity.summary(), [], { pollingInterval: 60000 });
  const { data: links } = useApi(() => network.capacity.links(), [], { pollingInterval: 60000 });

  const s = summary ?? {};
  const all = links ?? [];

  const metrics = [
    { label: "Avg CPU", value: s.avgCpu != null ? `${s.avgCpu}%` : "—", icon: Cpu, color: "emerald" },
    { label: "Avg Memory", value: s.avgMem != null ? `${s.avgMem}%` : "—", icon: MemoryStick, color: "sky" },
    { label: "Avg Bandwidth", value: s.avgBandwidthMbps != null ? `${s.avgBandwidthMbps} Mbps` : "—", icon: TrendingUp, color: "violet" },
    { label: "Critical / Warning", value: `${fmtNum(s.critical ?? 0)} / ${fmtNum(s.warning ?? 0)}`, icon: AlertTriangle, color: "red" },
  ];

  const maxBw = Math.max(...all.map((l) => l.bandwidth_mbps ?? 0), 1);

  return (
    <SolutionShell solutionId="performance" title="Capacity" subtitle="Headroom and utilization hotspots across the estate">
      <MetricGrid items={metrics} cols={4} loading={loading && !summary} />

      <Section title="Utilization Hotspots" subtitle="Highest-bandwidth devices and their headroom" icon={TrendingUp} pad={false}>
        {!links ? <Loading table /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Device", "CPU", "Memory", "Bandwidth", "Status"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {all.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-500">No capacity data.</td></tr>
                ) : all.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{l.hostname}</td>
                    <td className="px-5 py-3"><UtilBar value={l.cpu_util} /></td>
                    <td className="px-5 py-3"><UtilBar value={l.mem_util} /></td>
                    <td className="px-5 py-3 w-44">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max(3, ((l.bandwidth_mbps ?? 0) / maxBw) * 100)}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 w-16 text-right">{l.bandwidth_mbps ?? 0} Mbps</span>
                      </div>
                    </td>
                    <td className="px-5 py-3"><StatusBadge label={l.status} variant={STATUS_VARIANT[l.status] ?? "neutral"} dot /></td>
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
