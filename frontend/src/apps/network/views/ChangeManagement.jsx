import { useState, useMemo } from "react";
import PageHeader from "../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import DataTable from "../../../components/ui/DataTable";
import { GitBranch, Clock, CheckCircle, AlertTriangle, Plus, AlertCircle, X } from "lucide-react";
import { useApi, useMutation } from "../../../hooks/useApi";
import { useToast } from "../../../components/ui/Toast";
import { network } from "../../../services/api";

const riskVariant   = { low: "success", medium: "warning", high: "danger" };
const statusVariant = { approved: "success", pending: "warning", "in-progress": "info", scheduled: "neutral" };
const typeVariant   = { standard: "neutral", normal: "info", emergency: "danger" };

const columns = [
  { key: "id",     label: "ID" },
  { key: "title",  label: "Title" },
  { key: "type",   label: "Type",   render: v => <StatusBadge label={v} variant={typeVariant[v] ?? "neutral"} /> },
  { key: "status", label: "Status", render: v => <StatusBadge label={v} variant={statusVariant[v] ?? "neutral"} dot /> },
  { key: "risk",   label: "Risk",   render: v => <StatusBadge label={v} variant={riskVariant[v] ?? "neutral"} /> },
  { key: "window", label: "Maintenance Window" },
  { key: "owner",  label: "Owner" },
];

const EMPTY = { title: "", type: "standard", risk: "low", owner: "", window: "", description: "" };

function SubmitChangeModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState(null);

  const { mutate, loading } = useMutation((data) => network.changes.create(data));

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    try {
      await mutate(form);
      toast({ message: "Change request submitted.", type: "success" });
      onCreated();
      onClose();
    } catch (err) {
      setFormError(err?.message ?? "Failed to submit change request.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Submit Change Request</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {formError && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{formError}</div>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Title <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Change title"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
              <select value={form.type} onChange={e => set("type", e.target.value)}
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {["standard", "normal", "emergency"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Risk</label>
              <select value={form.risk} onChange={e => set("risk", e.target.value)}
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {["low", "medium", "high"].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Owner</label>
              <input type="text" value={form.owner} onChange={e => set("owner", e.target.value)} placeholder="Owner name"
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Maintenance Window</label>
              <input type="text" value={form.window} onChange={e => set("window", e.target.value)} placeholder="e.g. Sat 02:00–04:00"
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} placeholder="What is changing and why?"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white transition">
              {loading ? "Submitting…" : "Submit Change"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ChangeManagement() {
  const [showModal, setShowModal] = useState(false);
  const { data: changes, loading, error, refetch } = useApi(
    () => network.changes.list(), [], { pollingInterval: 30000 }
  );

  const allChanges = changes ?? [];

  const { pending, approved, emergency, thisWeek } = useMemo(() => ({
    pending:   allChanges.filter(c => c.status === "pending").length,
    approved:  allChanges.filter(c => c.status === "approved").length,
    emergency: allChanges.filter(c => c.type === "emergency").length,
    thisWeek:  allChanges.length,
  }), [allChanges]);

  const maintenanceWindows = useMemo(() =>
    allChanges.filter(c => c.status === "approved" || c.status === "scheduled"),
    [allChanges]
  );

  const rollbackItems = useMemo(() =>
    allChanges.filter(c => c.hasRollback || c.rollback),
    [allChanges]
  );

  return (
    <div className="space-y-6">
      {showModal && <SubmitChangeModal onClose={() => setShowModal(false)} onCreated={refetch} />}

      <PageHeader
        title="Change Management"
        subtitle="Planned changes, approvals, rollback plans and maintenance windows"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            <Plus size={15} /> Submit Change
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Pending Approval" value={loading ? "…" : pending}   icon={Clock}         color="amber" />
        <Stat label="Approved"         value={loading ? "…" : approved}  icon={CheckCircle}   color="emerald" />
        <Stat label="Emergency"        value={loading ? "…" : emergency} icon={AlertTriangle} color="red" />
        <Stat label="This Week"        value={loading ? "…" : thisWeek}  icon={GitBranch}     color="indigo" />
      </div>

      <Card>
        <CardHeader title="Change Requests" icon={GitBranch} />
        <CardBody>
          {loading && allChanges.length === 0 && (
            <div className="space-y-2 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded" />)}
            </div>
          )}
          {!loading && !error && allChanges.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">No change requests found.</p>
          )}
          {allChanges.length > 0 && (
            <DataTable columns={columns} data={allChanges} searchable searchKeys={["id", "title", "owner"]} />
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Upcoming Maintenance Windows" icon={Clock} />
          <CardBody className="space-y-3">
            {maintenanceWindows.length === 0 && !loading && (
              <p className="text-sm text-slate-500">No upcoming maintenance windows.</p>
            )}
            {maintenanceWindows.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{c.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{c.window}</p>
                </div>
                <StatusBadge label={c.risk} variant={riskVariant[c.risk] ?? "neutral"} />
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Rollback Plans" icon={GitBranch} />
          <CardBody className="space-y-3">
            {rollbackItems.length === 0 && !loading && (
              <p className="text-sm text-slate-500">No rollback plans found.</p>
            )}
            {rollbackItems.map(c => (
              <div key={c.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{c.id}</p>
                <p className="text-xs text-slate-500 mt-1">{c.rollbackNote ?? "Rollback procedure documented. Estimated time: 15 min."}</p>
                <button className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">View runbook →</button>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
