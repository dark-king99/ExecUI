import { Rocket, Users, Zap, Radio } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { marketing } from "../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, Pill, fmtNum } from "../../components/mkt-ui";

const DESTINATIONS = ["Google Ads", "LinkedIn Ads", "Meta", "Mailchimp", "The Trade Desk"];

export default function Activation() {
  const toast = useToast();
  const { data: audiences, loading, refetch } = useApi(() => marketing.audiences.list(), [], { pollingInterval: 60000 });
  const { mutate: activate } = useMutation((id) => marketing.audiences.activate(id), { onSuccess: () => { toast({ message: "Activated to destinations", type: "success" }); refetch(); } });

  const all = audiences ?? [];
  const active = all.filter((a) => a.status === "active");
  const metrics = [
    { label: "Activatable Segments", value: all.length, icon: Rocket, color: "indigo" },
    { label: "Live Activations", value: active.length, icon: Zap, color: "emerald" },
    { label: "Activated Reach", value: fmtNum(active.reduce((s, a) => s + (a.size ?? 0), 0)), icon: Users, color: "violet" },
    { label: "Destinations", value: DESTINATIONS.length, icon: Radio, color: "sky" },
  ];

  return (
    <SolutionShell solutionId="datacloud" title="Activation" subtitle="Push unified segments to advertising and engagement destinations">
      <MetricGrid items={metrics} cols={4} loading={loading && all.length === 0} />

      <Section title="Segment Activation" subtitle="Activate a segment to sync it across all connected destinations" icon={Rocket} pad={false}>
        {loading && all.length === 0 ? <Loading table /> : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {all.length === 0 ? <div className="py-10 text-center text-sm text-slate-400">No segments to activate.</div> : all.map((a) => {
              const live = a.status === "active";
              return (
                <div key={a.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{a.name}</span>
                      <StatusBadge label={live ? "live" : "idle"} variant={live ? "success" : "neutral"} dot />
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{fmtNum(a.size)} profiles · {a.type}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {DESTINATIONS.map((d) => (
                      <span key={d} className={`text-[11px] px-2 py-0.5 rounded-md ${live ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}>{d}</span>
                    ))}
                  </div>
                  <button onClick={() => activate(a.id)} disabled={live}
                    className={`text-xs px-3 py-1.5 rounded-lg transition shrink-0 ${live ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
                    {live ? "Activated" : "Activate"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </SolutionShell>
  );
}
