import { Megaphone, Users, DollarSign, TrendingUp, Workflow, Mail } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useApi } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, BarList, Loading, ErrorNote, fmtMoney, fmtNum } from "../../components/mkt-ui";

const STATUS_VARIANT = { active: "success", paused: "warning", draft: "neutral", completed: "info", scheduled: "indigo" };

export default function Overview() {
  const { data: summary, loading: l1 } = useApi(() => marketing.campaigns.summary(), [], { pollingInterval: 120000 });
  const { data: analytics } = useApi(() => marketing.analytics.summary(), [], { pollingInterval: 120000 });
  const { data: trend } = useApi(() => marketing.analytics.trend(), [], { pollingInterval: 120000 });
  const { data: campaigns, loading: l2, error } = useApi(() => marketing.campaigns.list({ limit: 6 }), [], { pollingInterval: 60000 });

  const s = summary ?? {};
  const a = analytics ?? {};
  const recent = (campaigns ?? []).slice(0, 6);

  const metrics = [
    { label: "Active Journeys", value: fmtNum(s.activeJourneys ?? s.active ?? 0), icon: Workflow, color: "violet" },
    { label: "Live Contacts", value: fmtNum(s.liveContacts ?? 0), icon: Users, color: "sky" },
    { label: "Revenue", value: a.totalRevenueFmt ?? fmtMoney(a.totalRevenue), icon: DollarSign, color: "emerald" },
    { label: "ROAS", value: (a.roas ?? s.roas) != null ? `${a.roas ?? s.roas}×` : "—", icon: TrendingUp, color: "amber" },
  ];

  return (
    <SolutionShell solutionId="engagement" title="Engagement Overview" subtitle="Cross-channel performance for your active customer journeys">
      <ErrorNote error={error} />
      <MetricGrid items={metrics} cols={4} loading={l1 && !summary} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Revenue Trend" subtitle="Last 6 months" icon={TrendingUp}>
          {trend ? (
            <BarList items={trend.map((t) => ({ label: t.month, value: t.revenue }))} color="violet" format={fmtMoney} />
          ) : <Loading rows={3} />}
        </Section>

        <Section title="Channel Mix" subtitle="Active campaigns by status" icon={Megaphone}>
          <div className="grid grid-cols-2 gap-3">
            {[["Active", s.active, "emerald"], ["Paused", s.paused, "amber"], ["Completed", s.completed, "sky"], ["Total", s.total, "violet"]].map(([label, val]) => (
              <div key={label} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{fmtNum(val ?? 0)}</div>
                <div className="text-xs text-slate-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section title="Recent Campaigns" subtitle="Most recently created" icon={Mail} pad={false}>
        {l2 && recent.length === 0 ? <Loading table /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Campaign", "Channel", "Leads", "Revenue", "Status"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recent.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-500">No campaigns yet.</td></tr>
                ) : recent.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{c.name}</td>
                    <td className="px-5 py-3 text-slate-500 capitalize">{c.channel ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{fmtNum(c.leads)}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{c.revenueFmt ?? fmtMoney(c.revenue)}</td>
                    <td className="px-5 py-3"><StatusBadge label={c.status ?? "draft"} variant={STATUS_VARIANT[c.status] ?? "neutral"} /></td>
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
