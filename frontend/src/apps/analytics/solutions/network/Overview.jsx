import { useMemo } from "react";
import { Wifi, Server, Bell, AlertTriangle, Activity } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, BarList, Loading, fmtNum } from "../../components/an-ui";

export default function Overview() {
  const { data: monitor, loading } = useApi(() => network.monitor.overview(), [], { pollingInterval: 60000 });
  const { data: servers } = useApi(() => network.servers.metrics(), [], { pollingInterval: 60000 });
  const { data: alerts } = useApi(() => network.alerts.list({ take: 200 }), [], { pollingInterval: 60000 });

  const sum = monitor?.summary ?? {};
  const sv = servers ?? {};
  const al = alerts ?? [];

  const uptime = sum.total ? Math.round((sum.online / sum.total) * 100) : 0;
  const sev = useMemo(() => {
    const open = al.filter((a) => a.status !== "resolved");
    return [
      { label: "Critical", value: open.filter((a) => a.severity === "critical").length },
      { label: "Warning", value: open.filter((a) => a.severity === "warning").length },
      { label: "Info", value: open.filter((a) => a.severity === "info").length },
    ];
  }, [al]);

  const metrics = [
    { label: "Uptime", value: `${uptime}%`, icon: Wifi, color: "emerald" },
    { label: "Online Nodes", value: `${fmtNum(sum.online ?? 0)} / ${fmtNum(sum.total ?? 0)}`, icon: Server, color: "sky" },
    { label: "Open Alerts", value: fmtNum(al.filter((a) => a.status !== "resolved").length), icon: Bell, color: "amber" },
    { label: "Open Incidents", value: fmtNum(sum.openIncidents ?? 0), icon: AlertTriangle, color: "red" },
  ];

  return (
    <SolutionShell solutionId="network" title="Network Overview" subtitle="Estate health and active issues at a glance">
      <MetricGrid items={metrics} cols={4} loading={loading && !monitor} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Node Status" icon={Server}>
          <div className="grid grid-cols-2 gap-3">
            {[["Online", sum.online, "emerald"], ["Warning", sum.warning, "amber"], ["Offline", sum.offline, "red"], ["Total", sum.total, "sky"]].map(([l, v]) => (
              <div key={l} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{fmtNum(v ?? 0)}</div>
                <div className="text-xs text-slate-500 mt-1">{l}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            {[["Avg CPU", sv.avgCpu], ["Avg Mem", sv.avgMem], ["Avg Disk", sv.avgDisk]].map(([l, v]) => (
              <div key={l} className="text-center"><div className="text-lg font-bold text-slate-900 dark:text-white">{v != null ? `${v}%` : "—"}</div><div className="text-[11px] text-slate-500">{l}</div></div>
            ))}
          </div>
        </Section>

        <Section title="Open Alerts by Severity" icon={Activity}>
          {!alerts ? <Loading rows={3} /> : <BarList items={sev} color="emerald" format={fmtNum} />}
        </Section>
      </div>
    </SolutionShell>
  );
}
