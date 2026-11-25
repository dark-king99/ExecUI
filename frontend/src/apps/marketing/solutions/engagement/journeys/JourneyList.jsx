/**
 * The list + editor shell for Journey Tab (kind "journey") and Automation
 * Studio (kind "automation"). Both use the same engine and records; numbers
 * are counted from enrollment rows.
 */
import { useState } from "react";
import { Plus, Users, Zap, Target, Activity } from "lucide-react";
import StatusBadge from "../../../../../components/ui/StatusBadge";
import { useToast } from "../../../../../components/ui/Toast";
import { useApi } from "../../../../../hooks/useApi";
import { marketing } from "../../../../../services/api";
import { SolutionShell, MetricGrid, Section, Loading, ErrorNote, PrimaryBtn, fmtNum } from "../../../components/mkt-ui";
import JourneyEditor, { JOURNEY_STATUS } from "./JourneyEditor";

const TRIGGER = { manual: "Added by hand", contact_created: "New CRM contact", event: "Contact activity", audience: "Scheduled audience" };

export default function JourneyList({ kind, title, subtitle, icon: Icon, empty }) {
  const toast = useToast();
  const [open, setOpen] = useState(null);
  const { data, loading, error, refetch } = useApi(() => marketing.journeys.list(kind), [kind], { pollingInterval: 30000 });
  const all = data ?? [];
  const create = async () => {
    try {
      const j = await marketing.journeys.create({ name: `${kind === "automation" ? "Automation" : "Journey"} ${new Date().toLocaleDateString()}`, kind });
      refetch();
      setOpen(j.id);
    } catch (e) { toast({ message: e.message, type: "error" }); }
  };
  const metrics = [
    { label: kind === "automation" ? "Automations" : "Journeys", value: fmtNum(all.length), icon: Icon, color: "violet" },
    { label: "Live", value: fmtNum(all.filter((j) => j.status === "active").length), icon: Zap, color: "emerald" },
    { label: "Inside now", value: fmtNum(all.reduce((s, j) => s + (j.inside ?? 0), 0)), icon: Activity, color: "sky" },
    { label: "Converted (goal met)", value: fmtNum(all.reduce((s, j) => s + (j.converted ?? 0), 0)), icon: Target, color: "amber" },
  ];

  return (
    <SolutionShell solutionId="engagement" title={title} subtitle={subtitle}
      actions={!open && <PrimaryBtn onClick={create}><Plus size={15} /> New {kind === "automation" ? "automation" : "journey"}</PrimaryBtn>}>
      {open ? (
        <Section title={kind === "automation" ? "Automation" : "Journey"} icon={Icon}>
          <JourneyEditor id={open} kind={kind} onClose={() => { setOpen(null); refetch(); }} onChanged={refetch} />
        </Section>
      ) : (
        <>
          <MetricGrid items={metrics} cols={4} loading={loading && !data} />
          <Section title={title} subtitle="Click one to build, test, publish or watch it" icon={Users} pad={false}>
            {error && <ErrorNote error={error} />}
            {loading && !data ? <Loading table /> : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {all.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-400">{empty}</p>}
                {all.map((j) => (
                  <button key={j.id} type="button" onClick={() => setOpen(j.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{j.name}{j.version ? <span className="ml-2 text-[11px] font-normal text-slate-400">v{j.version}</span> : null}</p>
                      <p className="truncate text-xs text-slate-500">
                        {TRIGGER[j.triggerType] ?? "Not published"} · {j.steps} step{j.steps === 1 ? "" : "s"} · {fmtNum(j.entered)} entered · {fmtNum(j.inside)} inside · {fmtNum(j.converted)} converted
                        {j.nextRunAt && j.status === "active" ? ` · next run ${new Date(j.nextRunAt).toLocaleString()}` : ""}
                      </p>
                      {j.lastError && <p className="truncate text-xs text-rose-600">{j.lastError}</p>}
                    </div>
                    <StatusBadge label={j.status} variant={JOURNEY_STATUS[j.status] ?? "neutral"} dot />
                  </button>
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </SolutionShell>
  );
}
