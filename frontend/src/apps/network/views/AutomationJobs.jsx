import { useState } from "react";
import { Bot, Plus, RefreshCw, AlertCircle, X, Play, CheckCircle, XCircle, Clock, ChevronRight } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../../components/ui/Skeleton";
import { useToast } from "../../../components/ui/Toast";
import { useApi, useMutation } from "../../../hooks/useApi";
import { network } from "../../../services/api";

const STATUS_VARIANT = { success: "success", completed: "success", running: "info", pending: "warning", failed: "danger", error: "danger", queued: "neutral" };
const TRIGGER_VARIANT = { manual: "neutral", schedule: "info", event: "warning", webhook: "sky" };
const EMPTY_JOB = { name: "", trigger: "manual", targets: "", description: "" };

function NewJobModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_JOB);
  const [err, setErr] = useState(null);
  const { mutate, loading } = useMutation((d) => network.automation.create(d), {
    onSuccess: () => { toast({ message: "Automation job created", type: "success" }); onCreated(); onClose(); },
    onError: (e) => setErr(e?.message ?? "Failed to create job"),
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">New Automation Job</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); setErr(null); if (!form.name.trim()) { setErr("Job name required"); return; } mutate(form); }} className="px-6 py-5 space-y-4">
          {err && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Job Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Nightly Config Backup" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Trigger</label>
              <select value={form.trigger} onChange={e => set("trigger", e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {["manual", "schedule", "event", "webhook"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Target Devices</label>
              <input value={form.targets} onChange={e => set("targets", e.target.value)} placeholder="all, router-*, 192.168.1.0/24" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea rows={2} value={form.description} onChange={e => set("description", e.target.value)} placeholder="What does this job do?" className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white transition">{loading ? "Creating…" : "Create Job"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AutomationJobs() {
  const toast = useToast();
  const [tab, setTab] = useState("jobs");
  const [showNew, setShowNew] = useState(false);

  const { data: jobs, loading: jobsLoading, error, refetch } = useApi(() => network.automation.jobs({ limit: 100 }), [], { pollingInterval: 30000 });
  const { data: templates, loading: tplLoading } = useApi(() => network.automation.templates(), [], { pollingInterval: 120000 });

  const { mutate: runJob } = useMutation((id) => network.automation.run(id), {
    onSuccess: () => { refetch(); toast({ message: "Job triggered successfully", type: "success" }); },
    onError: (e) => toast({ message: e?.message ?? "Failed to run job", type: "error" }),
  });

  const allJobs = jobs ?? [];
  const allTemplates = templates ?? [];
  const running = allJobs.filter(j => j.status === "running").length;
  const succeeded = allJobs.filter(j => j.status === "success" || j.status === "completed").length;
  const failed = allJobs.filter(j => j.status === "failed" || j.status === "error").length;

  return (
    <div className="space-y-6">
      {showNew && <NewJobModal onClose={() => setShowNew(false)} onCreated={refetch} />}
      <PageHeader title="Automation Jobs" subtitle="Schedule, monitor, and manage network automation tasks"
        actions={
          <div className="flex gap-2">
            <button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /></button>
            <button onClick={() => setShowNew(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg transition"><Plus size={14} /> New Job</button>
          </div>
        }
      />

      {jobsLoading && allJobs.length === 0 ? (
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Running" value={running} icon={Play} color="sky" />
          <Stat label="Succeeded" value={succeeded} icon={CheckCircle} color="emerald" />
          <Stat label="Failed" value={failed} icon={XCircle} color="red" />
        </div>
      )}

      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}

      <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden w-fit">
        {["jobs", "templates"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm font-medium capitalize transition ${tab === t ? "bg-emerald-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{t}</button>
        ))}
      </div>

      {tab === "jobs" && (
        <Card>
          {jobsLoading && allJobs.length === 0 ? <div className="p-5"><SkeletonTable rows={8} /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    {["Job Name", "Trigger", "Targets", "Status", "Last Run", "Duration", "Actions"].map(h => (
                      <th key={h} className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {allJobs.length === 0 ? (
                    <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-500">No automation jobs configured.</td></tr>
                  ) : allJobs.map((j, i) => (
                    <tr key={j.id ?? i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-4">
                        <div className="font-medium text-slate-900 dark:text-white">{j.name}</div>
                        {j.description && <div className="text-xs text-slate-400 truncate max-w-48">{j.description}</div>}
                      </td>
                      <td className="p-4"><StatusBadge label={j.trigger ?? "manual"} variant={TRIGGER_VARIANT[j.trigger] ?? "neutral"} /></td>
                      <td className="p-4 text-slate-500 text-xs">{j.targets ?? "—"}</td>
                      <td className="p-4"><StatusBadge label={j.status ?? "pending"} variant={STATUS_VARIANT[j.status] ?? "neutral"} dot /></td>
                      <td className="p-4 text-slate-400 text-xs"><div className="flex items-center gap-1"><Clock size={11} />{j.lastRun ?? j.last_run ?? "Never"}</div></td>
                      <td className="p-4 text-slate-400 text-xs">{j.duration ?? "—"}</td>
                      <td className="p-4">
                        <button onClick={() => runJob(j.id)} disabled={j.status === "running"} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 disabled:opacity-50 transition">
                          <Play size={11} />Run
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tplLoading ? [...Array(6)].map((_, i) => <SkeletonCard key={i} />) : allTemplates.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-slate-500 text-sm">No templates available.</div>
          ) : allTemplates.map((tpl, i) => (
            <div key={tpl.id ?? i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-emerald-300 dark:hover:border-emerald-700 transition">
              <div className="flex items-start justify-between mb-2">
                <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center"><Bot size={18} className="text-emerald-600" /></div>
                <StatusBadge label={tpl.category ?? "automation"} variant="neutral" />
              </div>
              <div className="font-medium text-slate-900 dark:text-white mb-1">{tpl.name}</div>
              <p className="text-xs text-slate-500 line-clamp-2">{tpl.description ?? ""}</p>
              {tpl.steps?.length > 0 && <div className="mt-2 text-xs text-slate-400">{tpl.steps.length} steps</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
