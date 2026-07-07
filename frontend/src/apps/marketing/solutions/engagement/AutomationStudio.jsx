import { CalendarClock, Zap, Activity, TrendingUp, Repeat } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useApi } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, BarList, Loading, fmtNum } from "../../components/mkt-ui";

const STATUS_VARIANT = { active: "success", paused: "warning", draft: "neutral" };
const TRIGGER_LABEL = {
  signup: "On signup", trial_start: "On trial start", risk_score: "When risk score high",
  purchase: "After purchase", inactivity_30d: "After 30d inactive",
};

export default function AutomationStudio() {
  const { data: flows, loading } = useApi(() => marketing.flows.list(), [], { pollingInterval: 60000 });
  const all = flows ?? [];

  const totalEnrolled = all.reduce((s, f) => s + (f.enrolled ?? 0), 0);
  const totalConverted = all.reduce((s, f) => s + (f.converted ?? 0), 0);
  const convRate = totalEnrolled ? ((totalConverted / totalEnrolled) * 100).toFixed(1) : "—";

  const metrics = [
    { label: "Automations", value: fmtNum(all.length), icon: CalendarClock, color: "violet" },
    { label: "Running", value: fmtNum(all.filter((f) => f.status === "active").length), icon: Zap, color: "emerald" },
    { label: "Contacts in Flight", value: fmtNum(totalEnrolled), icon: Activity, color: "sky" },
    { label: "Conversion Rate", value: convRate === "—" ? "—" : `${convRate}%`, icon: TrendingUp, color: "amber" },
  ];

  return (
    <SolutionShell solutionId="engagement" title="Automation Studio" subtitle="Schedule and orchestrate always-on automations">
      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Conversions by Automation" icon={TrendingUp} className="lg:col-span-1">
          {loading && all.length === 0 ? <Loading rows={3} /> : (
            <BarList items={all.map((f) => ({ label: f.name, value: f.converted ?? 0, sub: `/${fmtNum(f.enrolled)}` }))} color="violet" format={fmtNum} />
          )}
        </Section>

        <Section title="Scheduled Automations" subtitle="Trigger cadence and live throughput" icon={Repeat} className="lg:col-span-2" pad={false}>
          {loading && all.length === 0 ? <Loading table /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    {["Automation", "Trigger", "Steps", "Enrolled", "Converted", "Status"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {all.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{f.name}</td>
                      <td className="px-5 py-3 text-slate-500">{TRIGGER_LABEL[f.trigger] ?? f.trigger}</td>
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{f.step_count}</td>
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{fmtNum(f.enrolled)}</td>
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{fmtNum(f.converted)}</td>
                      <td className="px-5 py-3"><StatusBadge label={f.status} variant={STATUS_VARIANT[f.status] ?? "neutral"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </SolutionShell>
  );
}
