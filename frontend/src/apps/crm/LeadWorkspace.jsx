import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import DataTable from "../../components/ui/DataTable";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useApi, useMutation } from "../../hooks/useApi";
import { useToast } from "../../components/ui/Toast";
import { crm } from "../../services/api";
import { UserPlus, Mail, Phone, Calendar, Star, Plus, RefreshCw, X } from "lucide-react";

const STAGE_VARIANT = {
  "New": "neutral", "Contacted": "info", "Qualified": "success", "Demo Booked": "indigo",
};

const STAGES = ["New", "Contacted", "Qualified", "Demo Booked"];

function ScoreBadge({ score }) {
  const color = score >= 80
    ? "text-emerald-600 dark:text-emerald-400"
    : score >= 60
    ? "text-amber-600 dark:text-amber-400"
    : "text-slate-500";
  return <span className={`font-bold text-sm ${color}`}>{score}</span>;
}

const COLUMNS = [
  {
    key: "name",
    label: "Name",
    render: (v, row) => (
      <div>
        <p className="font-medium text-slate-900 dark:text-white text-sm">{v}</p>
        <p className="text-xs text-slate-400">{row.company}</p>
      </div>
    ),
  },
  { key: "score",       label: "Score",        render: (v) => <ScoreBadge score={v ?? 0} /> },
  { key: "stage",       label: "Stage",        render: (v) => <StatusBadge label={v} variant={STAGE_VARIANT[v] ?? "neutral"} dot /> },
  { key: "source",      label: "Source" },
  { key: "lastContact", label: "Last Contact", render: (v) => v ?? "—" },
  { key: "owner",       label: "Owner" },
];

const EMPTY_FORM = { name: "", email: "", company: "", stage: "New" };

function AddLeadModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);

  const { mutate, loading } = useMutation((data) => crm.leads.create(data));

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }

    try {
      await mutate(form);
      toast({ message: "Lead added successfully.", type: "success" });
      onCreated();
      onClose();
    } catch (err) {
      setFormError(err?.message ?? "Failed to create lead. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Add Lead</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {formError && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Full name"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="email@company.com"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Company
            </label>
            <input
              type="text"
              value={form.company}
              onChange={(e) => set("company", e.target.value)}
              placeholder="Company name"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Stage
            </label>
            <select
              value={form.stage}
              onChange={(e) => set("stage", e.target.value)}
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white transition"
            >
              {loading ? "Saving…" : "Add Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LeadWorkspace() {
  const [showAddModal, setShowAddModal] = useState(false);

  const {
    data: leadsData,
    loading: leadsLoading,
    error: leadsError,
    refetch: refetchLeads,
  } = useApi(() => crm.leads.list({ limit: 100 }), [], { pollingInterval: 60000 });

  const {
    data: activityData,
    loading: actLoading,
    error: actError,
    refetch: refetchAct,
  } = useApi(() => crm.leads.activity({ limit: 20 }), [], { pollingInterval: 30000 });

  // Derived stats from live data
  const totalLeads  = leadsData?.length ?? 0;
  const qualified   = leadsData?.filter((l) => l.stage === "Qualified").length ?? 0;
  const demoBooked  = leadsData?.filter((l) => l.stage === "Demo Booked").length ?? 0;
  const avgScore    = leadsData?.length
    ? Math.round(leadsData.reduce((s, l) => s + (l.score ?? 0), 0) / leadsData.length)
    : 0;

  return (
    <div className="space-y-6">
      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onCreated={refetchLeads}
        />
      )}

      <PageHeader
        title="Leads & Contacts"
        subtitle="Unified profiles, activity feed and communication history"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => { refetchLeads(); refetchAct(); }}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition"
            >
              <RefreshCw size={13} /> Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition"
            >
              <Plus size={15} /> Add Lead
            </button>
          </div>
        }
      />

      {/* Stats */}
      {leadsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total Leads"    value={totalLeads} icon={UserPlus} color="indigo" />
          <Stat label="Qualified"      value={qualified}  icon={Star}     color="emerald" />
          <Stat label="Demo Booked"    value={demoBooked} icon={Calendar} color="sky" />
          <Stat label="Avg Lead Score" value={avgScore}   icon={Star}     color="amber" />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Lead table */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader title="Lead List" icon={UserPlus} />
            <CardBody>
              {leadsError && (
                <div className="text-sm text-red-600 dark:text-red-400 mb-3">{leadsError}</div>
              )}
              {leadsLoading ? (
                <SkeletonTable rows={6} />
              ) : leadsData?.length > 0 ? (
                <DataTable
                  columns={COLUMNS}
                  data={leadsData}
                  searchable
                  searchKeys={["name", "company", "owner"]}
                />
              ) : (
                <p className="text-sm text-slate-500 text-center py-6">No leads found.</p>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Recent activity */}
        <Card>
          <CardHeader title="Recent Activity" icon={Mail} />
          <CardBody className="space-y-4">
            {actError && <p className="text-sm text-red-600 dark:text-red-400">{actError}</p>}
            {actLoading ? (
              <SkeletonTable rows={4} />
            ) : activityData?.length > 0 ? (
              activityData.map((a, i) => (
                <div key={i} className="flex gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                    a.type === "email" ? "bg-indigo-100 dark:bg-indigo-900/30" :
                    a.type === "call"  ? "bg-emerald-100 dark:bg-emerald-900/30" :
                    "bg-slate-100 dark:bg-slate-800"
                  }`}>
                    {a.type === "email" ? <Mail size={14} className="text-indigo-600 dark:text-indigo-400" /> :
                     a.type === "call"  ? <Phone size={14} className="text-emerald-600 dark:text-emerald-400" /> :
                     <Star size={14} className="text-slate-400" />}
                  </div>
                  <div>
                    <p className="text-sm text-slate-900 dark:text-white">{a.text ?? a.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{a.time ?? a.timestamp}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No recent activity.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
