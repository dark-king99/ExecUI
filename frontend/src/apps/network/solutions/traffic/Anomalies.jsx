import { Radar, AlertOctagon, AlertTriangle } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { network } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, Pill, fmtNum } from "../../components/net-ui";

export default function Anomalies() {
  const { data: anomalies, loading } = useApi(() => network.traffic.anomalies(), [], { pollingInterval: 30000 });
  const all = anomalies ?? [];

  const metrics = [
    { label: "Anomalies (24h)", value: fmtNum(all.length), icon: Radar, color: "violet" },
    { label: "Critical", value: fmtNum(all.filter((a) => a.severity === "Critical").length), icon: AlertOctagon, color: "red" },
    { label: "Alerts", value: fmtNum(all.filter((a) => a.severity !== "Critical").length), icon: AlertTriangle, color: "amber" },
  ];

  return (
    <SolutionShell solutionId="traffic" title="Anomalies" subtitle="Unusual traffic patterns detected by behavioral analysis">
      <MetricGrid items={metrics} cols={3} loading={loading && all.length === 0} />

      <Section title="Detected Anomalies" icon={Radar} pad={false}>
        {loading && all.length === 0 ? <Loading table /> : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {all.length === 0 ? <div className="py-10 text-center text-sm text-slate-400">No anomalies detected.</div> : all.map((a, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${a.severity === "Critical" ? "bg-red-50 dark:bg-red-500/10" : "bg-amber-50 dark:bg-amber-500/10"}`}>
                  {a.severity === "Critical" ? <AlertOctagon size={16} className="text-red-600 dark:text-red-400" /> : <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">{a.description}</div>
                  <div className="text-xs text-slate-400">{a.device} · {a.time}</div>
                </div>
                <Pill color={a.severity === "Critical" ? "red" : "amber"}>{a.severity}</Pill>
              </div>
            ))}
          </div>
        )}
      </Section>
    </SolutionShell>
  );
}
