import { useState } from "react";
import { GitBranch, Search, Clock, ListChecks, History, Plus, Paperclip } from "lucide-react";
import StatusBadge from "../../../../components/ui/StatusBadge";
import { useToast } from "../../../../components/ui/Toast";
import { useApi, useMutation } from "../../../../hooks/useApi";
import { crm } from "../../../../services/api";
import { SolutionShell, Section, Loading, Pill, fmtDate } from "../../components/crm-ui";
import Attachments from "../../../../components/Attachments";

const PRIORITY_VARIANT = { high: "danger", medium: "warning", low: "neutral" };

export default function DealRoom() {
  const toast = useToast();
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("timeline");
  const [taskTitle, setTaskTitle] = useState("");
  const { data: deals, loading } = useApi(() => crm.deals.list(), [], { pollingInterval: 60000 });
  const { data: timeline } = useApi(() => (selected ? crm.deals.timeline(selected) : Promise.resolve(null)), [selected]);
  const { data: tasks, refetch: refetchTasks } = useApi(() => (selected ? crm.deals.tasks(selected) : Promise.resolve(null)), [selected]);
  const { data: audit } = useApi(() => (selected ? crm.deals.auditTrail(selected) : Promise.resolve(null)), [selected]);
  const { mutate: addTask, loading: adding } = useMutation((d) => crm.deals.createTask(selected, d), {
    onSuccess: () => { toast({ message: "Task added", type: "success" }); setTaskTitle(""); refetchTasks(); },
  });

  const all = deals ?? [];
  const deal = all.find((d) => d.id === selected);
  const TABS = [{ id: "timeline", label: "Timeline", icon: Clock }, { id: "tasks", label: "Tasks", icon: ListChecks }, { id: "files", label: "Files", icon: Paperclip }, { id: "audit", label: "Audit", icon: History }];

  return (
    <SolutionShell solutionId="opportunities" title="Deal Room" subtitle="Everything about a single deal: timeline, tasks, and audit trail">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Deals" icon={Search} className="lg:col-span-1" pad={false}>
          {loading && all.length === 0 ? <div className="p-4"><Loading rows={3} /></div> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[32rem] overflow-y-auto">
              {all.length === 0 ? <div className="py-10 text-center text-sm text-slate-400">No deals.</div> : all.map((d) => (
                <button key={d.id} onClick={() => setSelected(d.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${selected === d.id ? "bg-violet-50/50 dark:bg-violet-500/5" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{d.name}</span>
                    <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 shrink-0">{d.value}</span>
                  </div>
                  <div className="text-xs text-slate-400 truncate">{d.stage} · {d.account}</div>
                </button>
              ))}
            </div>
          )}
        </Section>

        <Section title={deal?.name ?? "Deal Detail"} subtitle={selected ? `${deal?.stage} · ${deal?.value} · ${deal?.probability}% probability` : "Select a deal to open the deal room"} icon={GitBranch} className="lg:col-span-2">
          {!selected ? (
            <div className="py-12 text-center text-sm text-slate-400">Choose a deal on the left.</div>
          ) : (
            <>
              <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 mb-4">
                {TABS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab === t.id ? "text-violet-600 dark:text-violet-400 border-current" : "text-slate-500 border-transparent hover:text-slate-700"}`}>
                      <Icon size={14} /> {t.label}
                    </button>
                  );
                })}
              </div>

              {tab === "files" && <Attachments entityType="deal" entityId={selected} />}

              {tab === "timeline" && (
                <div className="space-y-3">
                  {(timeline ?? []).map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="h-2 w-2 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <div><p className="text-slate-700 dark:text-slate-200">{t.description}</p><p className="text-[11px] text-slate-400">{fmtDate(t.timestamp)}</p></div>
                    </div>
                  ))}
                  {(!timeline || timeline.length === 0) && <div className="py-6 text-center text-sm text-slate-400">No timeline events.</div>}
                </div>
              )}

              {tab === "tasks" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Add a task…" className="flex-1 text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    <button onClick={() => taskTitle.trim() && addTask({ title: taskTitle })} disabled={adding || !taskTitle.trim()} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white transition"><Plus size={14} /> Add</button>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(tasks ?? []).map((t) => (
                      <div key={t.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm text-slate-800 dark:text-slate-200 truncate">{t.title}</div>
                          <div className="text-xs text-slate-400">{t.assignee ?? "Unassigned"}{t.dueDate && ` · due ${fmtDate(t.dueDate)}`}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {t.priority && <Pill color={t.priority === "high" ? "rose" : t.priority === "medium" ? "amber" : "slate"}>{t.priority}</Pill>}
                          <StatusBadge label={t.status} variant={t.status === "completed" ? "success" : "neutral"} />
                        </div>
                      </div>
                    ))}
                    {(!tasks || tasks.length === 0) && <div className="py-6 text-center text-sm text-slate-400">No tasks yet.</div>}
                  </div>
                </div>
              )}

              {tab === "audit" && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(audit ?? []).map((a) => (
                    <div key={a.id} className="py-2.5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm text-slate-800 dark:text-slate-200"><span className="font-medium capitalize">{a.action}</span> {a.resource && <span className="text-slate-400">· {a.resource}</span>}</div>
                        {a.detail && <div className="text-xs text-slate-400 truncate">{a.detail}</div>}
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0">{fmtDate(a.createdAt)}</span>
                    </div>
                  ))}
                  {(!audit || audit.length === 0) && <div className="py-6 text-center text-sm text-slate-400">No audit history.</div>}
                </div>
              )}
            </>
          )}
        </Section>
      </div>
    </SolutionShell>
  );
}
