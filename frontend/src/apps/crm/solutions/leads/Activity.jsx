import { Activity as ActivityIcon, Clock, ArrowRightLeft } from "lucide-react";
import { useApi } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, Section, Loading, fmtDate } from "../../components/crm-ui";

const timeAgo = (d) => {
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function Activity() {
  const { data: activity, loading } = useApi(() => crm.leads.activity(), [], { pollingInterval: 30000 });
  const all = activity ?? [];

  return (
    <SolutionShell solutionId="leads" title="Lead Activity" subtitle="A live feed of every stage change and touch across your leads">
      <Section title="Activity Feed" subtitle={`${all.length} recent events`} icon={ActivityIcon}>
        {loading && all.length === 0 ? <Loading rows={3} /> : all.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">No recent activity.</div>
        ) : (
          <div className="relative pl-6">
            <div className="absolute left-2 top-1 bottom-1 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-5">
              {all.map((a) => (
                <div key={a.id} className="relative">
                  <span className="absolute -left-[18px] top-0.5 h-3.5 w-3.5 rounded-full bg-amber-500 ring-4 ring-amber-100 dark:ring-amber-900/30" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <ArrowRightLeft size={14} className="text-slate-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-slate-700 dark:text-slate-200">{a.description}</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-slate-400 shrink-0"><Clock size={11} /> {timeAgo(a.timestamp)}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 ml-6 mt-0.5">{fmtDate(a.timestamp)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>
    </SolutionShell>
  );
}
