/**
 * Data Cloud overview: what's actually in the customer data layer — CRM
 * contacts, consent, data streams and the event stream. Counted live; nothing
 * here is estimated. Identity resolution and predictive scores appear when
 * those phases have real data behind them.
 */
import { Database, Share2, Activity, MailCheck, PieChart } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, BarList, ErrorNote, fmtNum } from "../../components/mkt-ui";

export default function Overview() {
  const { data: d, loading, error } = useApi(() => marketing.streams.overview(), [], { pollingInterval: 60000 });

  const metrics = [
    { label: "CRM contacts", value: fmtNum(d?.profiles), icon: Database, color: "indigo" },
    { label: "With email consent", value: fmtNum(d?.consented), icon: MailCheck, color: "emerald" },
    { label: "Active data streams", value: d ? `${fmtNum(d.activeSources)}/${fmtNum(d.sources)}` : "—", icon: Share2, color: "sky" },
    { label: "Events, last 30 days", value: fmtNum(d?.events30), icon: Activity, color: "violet" },
  ];

  return (
    <SolutionShell solutionId="datacloud" title="Data Cloud Overview" subtitle="Your customer data: CRM contacts, consent, data streams and every recorded event">
      {error && <ErrorNote error={error} />}
      <MetricGrid items={metrics} cols={4} loading={loading && !d} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Section title="Events by type (30 days)" icon={Activity} className="lg:col-span-2">
          {loading && !d ? <Loading rows={4} /> : d?.eventsByType?.length
            ? <BarList items={d.eventsByType.map((e) => ({ label: e.type, value: e.count }))} color="indigo" format={fmtNum} />
            : <p className="py-6 text-center text-sm text-slate-400">No events yet. They arrive from email sends, signup forms and the events API.</p>}
        </Section>
        <Section title="At a glance" icon={PieChart}>
          {d && (
            <div className="space-y-2 text-sm">
              {[["Events recorded, all time", fmtNum(d.events)], ["Audiences", fmtNum(d.audiences)], ["Consent rate", d.profiles ? `${((d.consented / d.profiles) * 100).toFixed(1)}%` : "—"]].map(([l, v]) => (
                <div key={l} className="flex items-center justify-between border-b border-slate-50 py-1.5 last:border-0 dark:border-slate-800"><span className="text-slate-500">{l}</span><span className="font-medium text-slate-900 dark:text-white">{v}</span></div>
              ))}
              <p className="pt-2 text-[11px] text-slate-400">Identity resolution across sources and predictive scores aren't built yet, so they aren't shown.</p>
            </div>
          )}
        </Section>
      </div>
    </SolutionShell>
  );
}
