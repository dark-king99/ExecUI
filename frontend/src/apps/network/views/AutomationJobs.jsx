import { useState } from "react";
import { useApi, useMutation } from "../../../hooks/useApi";
import { useToast } from "../../../components/ui/Toast";
import { network } from "../../../services/api";
import PageHeader from "../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import DataTable from "../../../components/ui/DataTable";
import { Bot, Play, CheckCircle, XCircle, Clock, Plus, AlertCircle, X } from "lucide-react";

const EMPTY_JOB = { name: "", trigger: "manual", targets: "" };

function NewJobModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_JOB);
  const [formError, setFormError] = useState(null);
  const { mutate, loading } = useMutation((data) => network.automation.create(data));

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) { setFormError("Job name is required."); return; }
    try {
      await mutate(form);
      toast({ message: "Automation job created.", type: "success" });
      onCreated();
      onClose();
    } catch (err) {
      setFormError(err?.message ?? "Failed to create job.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">New Automation Job</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {formError && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{formError}</div>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Job Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Job name"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Trigger</label>
            <select value={form.trigger} onChange={e => set("trigger", e.target.value)}
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {["manual","scheduled","event-driven","threshold"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Target Devices</label>
            <input type="text" value={form.targets} onChange={e => set("targets", e.target.value)} placeholder="e.g. all, core-switches, 10.0.0.0/8"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white transition">
              {loading ? "Creating…" : "Create Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const statusVariant = { success: "success", running: "info", failed: "danger" };

export default function AutomationJobs() {
  const [showModal, setShowModal] = useState(false);
  const { data: jobs, loading: jobsLoading, error: jobsError, refetch: refetchJobs } = useApi(
    () => network.automation.jobs(), [], { pollingInterval: 15000 }
  );
  const { data: templates, loading: tmplLoading } = useApi(
    () => network.automation.templates(), [], { pollingInterval: 120000 }
  );

  const allJobs = jobs ?? [];
  const allTemplates = templates ?? [];

  const success = allJobs.filter(j => j.status === "success").length;
  const failed  = allJobs.filter(j => j.status === "failed").length;
  const running = allJobs.filter(j => j.status === "running").length;

  const columns = [
    { key: "id",       label: "Job ID" },
    { key: "name",     label: "Name" },
    { key: "trigger",  label: "Trigger" },
    { key: "status",   label: "Status",   render: v => <StatusBadge label={v} variant={statusVariant[v] ?? "neutral"} dot /> },
    { key: "lastRun",  label: "Last Run" },
    { key: "duration", label: "Duration" },
    { key: "targets",  label: "Targets" },
  ];

  return (
    <div className="space-y-6">
      {showModal && <NewJobModal onClose={() => setShowModal(false)} onCreated={refetchJobs} />}

      <PageHeader
        title="Automation Jobs"
        subtitle="Run history, templates, dry-run / apply and job status"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            <Plus size={15} /> New Job
          </button>
        }
      />

      {jobsError && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {jobsError}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Succeeded Today" value={jobsLoading ? "…" : success} icon={CheckCircle} color="emerald" />
        <Stat label="Running"         value={jobsLoading ? "…" : running} icon={Clock}       color="sky" />
        <Stat label="Failed"          value={jobsLoading ? "…" : failed}  icon={XCircle}     color="red" />
      </div>

      <Card>
        <CardHeader title="Job Run History" icon={Bot} />
        <CardBody>
          {jobsLoading && allJobs.length === 0 && (
            <div className="space-y-2 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded" />)}
            </div>
          )}
          {!jobsLoading && allJobs.length === 0 && !jobsError && (
            <p className="text-sm text-slate-500 text-center py-4">No jobs found.</p>
          )}
          {allJobs.length > 0 && (
            <DataTable columns={columns} data={allJobs} searchable searchKeys={["name", "trigger"]} />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Available Templates" icon={Play} />
        <CardBody>
          {tmplLoading && allTemplates.length === 0 && (
            <div className="grid grid-cols-3 gap-3 animate-pulse">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded-lg" />)}
            </div>
          )}
          {!tmplLoading && allTemplates.length === 0 && (
            <p className="text-sm text-slate-500">No templates available.</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {allTemplates.map(t => (
              <button
                key={t.id ?? t.name ?? t}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-left hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition group"
              >
                <Bot size={16} className="text-indigo-500 mb-2" />
                <p className="text-sm font-medium text-slate-900 dark:text-white">{t.name ?? t}</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 opacity-0 group-hover:opacity-100 transition">
                  Click to configure →
                </p>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
