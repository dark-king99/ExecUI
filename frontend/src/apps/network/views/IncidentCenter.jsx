import { useState } from "react";
import PageHeader from "../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import DataTable from "../../../components/ui/DataTable";
import { AlertTriangle, Clock, Users, Activity, Plus, CheckCircle, AlertCircle, Loader2, X } from "lucide-react";
import { useApi, useMutation } from "../../../hooks/useApi";
import { useToast } from "../../../components/ui/Toast";
import { network } from "../../../services/api";

const EMPTY_INC = { title: "", severity: "medium", owner: "", blast: "" };

function NewIncidentModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_INC);
  const [formError, setFormError] = useState(null);
  const { mutate, loading } = useMutation((data) => network.incidents.create(data));

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    try {
      await mutate({ ...form, status: "open" });
      toast({ message: "Incident created.", type: "success" });
      onCreated();
      onClose();
    } catch (err) {
      setFormError(err?.message ?? "Failed to create incident.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">New Incident</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {formError && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{formError}</div>}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Title <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Incident title"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Severity</label>
              <select value={form.severity} onChange={e => set("severity", e.target.value)}
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {["critical","high","medium","low"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Owner</label>
              <input type="text" value={form.owner} onChange={e => set("owner", e.target.value)} placeholder="Assigned to"
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Blast Radius</label>
            <input type="text" value={form.blast} onChange={e => set("blast", e.target.value)} placeholder="Affected systems / users"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="text-sm px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white transition">
              {loading ? "Creating…" : "Create Incident"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const severityVariant = { critical: "danger", high: "warning", medium: "info", low: "neutral" };
const statusVariant   = { open: "danger", "in-progress": "warning", resolved: "success" };

export default function IncidentCenter() {
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const { data: incidents, loading, error, refetch } = useApi(
    () => network.incidents.list(), [], { pollingInterval: 15000 }
  );
  const { data: timeline, loading: tlLoading } = useApi(
    () => selected ? network.incidents.timeline(selected) : Promise.resolve([]),
    [selected]
  );

  const allIncidents = incidents ?? [];
  const allTimeline  = timeline ?? [];

  const open     = allIncidents.filter(i => i.status !== "resolved").length;
  const critical = allIncidents.filter(i => i.severity === "critical").length;
  const inProg   = allIncidents.filter(i => i.status === "in-progress").length;
  const resolved = allIncidents.filter(i => i.status === "resolved").length;

  const columns = [
    { key: "id",       label: "ID",       sortable: false },
    { key: "title",    label: "Title",    sortable: false },
    { key: "severity", label: "Severity", render: v => <StatusBadge label={v} variant={severityVariant[v] ?? "neutral"} dot /> },
    { key: "status",   label: "Status",   render: v => <StatusBadge label={v} variant={statusVariant[v] ?? "neutral"} dot /> },
    { key: "owner",    label: "Owner" },
    { key: "sla",      label: "SLA Clock" },
    { key: "blast",    label: "Blast Radius" },
  ];

  return (
    <div className="space-y-6">
      {showModal && <NewIncidentModal onClose={() => setShowModal(false)} onCreated={refetch} />}

      <PageHeader
        title="Incident Center"
        subtitle="Live incident tracking, blast radius, ownership and SLA management"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            <Plus size={15} /> New Incident
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Open Incidents"  value={loading ? "…" : open}     icon={AlertTriangle} color="red" />
        <Stat label="Critical"        value={loading ? "…" : critical}  icon={Activity}      color="red" />
        <Stat label="In Progress"     value={loading ? "…" : inProg}    icon={Clock}         color="amber" />
        <Stat label="Resolved Today"  value={loading ? "…" : resolved}  icon={CheckCircle}   color="emerald" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Card>
            <CardHeader title="Active Incidents" icon={AlertTriangle} />
            <CardBody>
              {loading && allIncidents.length === 0 && (
                <div className="space-y-2 animate-pulse">
                  {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded" />)}
                </div>
              )}
              {!loading && allIncidents.length === 0 && !error && (
                <p className="text-sm text-slate-500 text-center py-4">No incidents found.</p>
              )}
              {allIncidents.length > 0 && (
                <DataTable
                  columns={columns}
                  data={allIncidents}
                  searchable
                  searchKeys={["id", "title", "owner"]}
                  onRowClick={(row) => setSelected(row.id)}
                />
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="Incident Timeline" subtitle={selected ?? "Select an incident"} icon={Clock} />
          <CardBody className="space-y-4">
            {!selected && (
              <p className="text-sm text-slate-500">Click an incident to view its timeline.</p>
            )}
            {tlLoading && selected && (
              <div className="flex justify-center py-4">
                <Loader2 size={18} className="animate-spin text-slate-400" />
              </div>
            )}
            {!tlLoading && allTimeline.length === 0 && selected && (
              <p className="text-sm text-slate-500">No timeline events.</p>
            )}
            {allTimeline.map((e, i) => (
              <div key={e.id ?? i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  {i < allTimeline.length - 1 && <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />}
                </div>
                <div className="pb-3">
                  <span className="text-xs text-slate-400">{e.time ?? e.ts}</span>
                  <p className="text-sm text-slate-900 dark:text-white font-medium">{e.actor}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{e.text ?? e.message}</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
