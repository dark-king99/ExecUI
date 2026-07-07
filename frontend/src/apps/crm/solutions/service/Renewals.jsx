import { RefreshCw, DollarSign, AlertTriangle, CalendarClock } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useApi } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, fmtNum } from "../../components/crm-ui";

const HEALTH_VARIANT = { green: "success", yellow: "warning", red: "danger" };
const HEALTH_LABEL = { green: "Healthy", yellow: "Watch", red: "At Risk" };

export default function Renewals() {
  const { data: renewals, loading } = useApi(() => crm.renewals.list(), [], { pollingInterval: 60000 });
  const { data: summary } = useApi(() => crm.renewals.summary(), [], { pollingInterval: 60000 });

  const all = renewals ?? [];
  const s = summary ?? {};

  const metrics = [
    { label: "Renewals", value: fmtNum(s.total ?? all.length), icon: RefreshCw, color: "rose" },
    { label: "Total ARR", value: s.totalArrFmt ?? "—", icon: DollarSign, color: "emerald" },
    { label: "At Risk (<30d)", value: fmtNum(s.atRisk ?? 0), icon: AlertTriangle, color: "amber" },
    { label: "Avg Days Left", value: all.length ? `${Math.round(all.reduce((a, r) => a + (r.daysLeft ?? 0), 0) / all.length)}d` : "—", icon: CalendarClock, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="service" title="Renewals" subtitle="Stay ahead of every upcoming contract renewal">
      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <Section title="Upcoming Renewals" icon={RefreshCw} pad={false}>
        {loading && all.length === 0 ? <Loading table /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Account", "Owner", "ARR", "Renewal Date", "Days Left", "Health"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {all.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-500">No renewals.</td></tr>
                ) : all.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{r.account}</div>
                      <div className="text-xs text-slate-400">{r.name}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{r.owner ?? "—"}</td>
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{r.arrFmt}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{r.renewalDate}</td>
                    <td className="px-5 py-3">
                      <span className={`text-sm font-semibold ${r.daysLeft < 30 ? "text-rose-600" : r.daysLeft < 60 ? "text-amber-600" : "text-slate-700 dark:text-slate-300"}`}>{r.daysLeft}d</span>
                    </td>
                    <td className="px-5 py-3"><StatusBadge label={HEALTH_LABEL[r.health] ?? r.health} variant={HEALTH_VARIANT[r.health] ?? "neutral"} dot /></td>
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
