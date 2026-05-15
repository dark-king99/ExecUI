import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { BookOpen, Play, Plus, Zap, AlertCircle, Loader2, X } from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { crm } from "../../services/api";

const TYPE_VARIANT   = { Onboarding: "indigo", Retention: "warning", Expansion: "success", "Re-engage": "info" };
const STATUS_VARIANT = { active: "success", draft: "neutral" };
const PLAYBOOK_TYPES = ["Onboarding", "Retention", "Expansion", "Re-engage"];
const TRIGGERS       = ["Manual", "Deal Stage Change", "New Contact", "Contract Renewal", "Inactivity"];

const EMPTY_PB = { name: "", type: "Onboarding", trigger: "Manual", status: "draft" };

function NewPlaybookModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_PB);
  const [formError, setFormError] = useState(null);

  const { mutate, loading } = useMutation((data) => crm.playbooks.create(data));

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError("Playbook name is required.");
      return;
    }
    try {
      await mutate(form);
      toast({ message: "Playbook created.", type: "success" });
      onCreated();
      onClose();
    } catch (err) {
      setFormError(err?.message ?? "Failed to create playbook.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">New Playbook</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
            <X size={18} />
          </button>
        </div>
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
              placeholder="Playbook name"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {PLAYBOOK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Trigger</label>
              <select
                value={form.trigger}
                onChange={(e) => set("trigger", e.target.value)}
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {TRIGGERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </select>
          </div>
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
              className="text-sm px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white transition"
            >
              {loading ? "Saving…" : "Create Playbook"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ViewPlaybookModal({ playbook, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{playbook.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Type</p>
              <StatusBadge label={playbook.type} variant={TYPE_VARIANT[playbook.type] ?? "neutral"} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Status</p>
              <StatusBadge label={playbook.status} variant={STATUS_VARIANT[playbook.status] ?? "neutral"} dot />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Trigger</p>
              <p className="text-sm text-slate-900 dark:text-white">{playbook.trigger ?? "Manual"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Steps</p>
              <p className="text-sm text-slate-900 dark:text-white">{playbook.steps ?? 0}</p>
            </div>
            {playbook.uses != null && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Times Used</p>
                <p className="text-sm text-slate-900 dark:text-white">{playbook.uses}</p>
              </div>
            )}
          </div>
          {playbook.description && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Description</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{playbook.description}</p>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlaybooksLibrary() {
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [viewing, setViewing] = useState(null);

  const { data: playbooks, loading, error, refetch } = useApi(
    () => crm.playbooks.list(), [], { pollingInterval: 120000 }
  );

  const { mutate: runPlaybook, loading: running } = useMutation(
    (id) => crm.playbooks.run(id),
    {
      onSuccess: () => { toast({ message: "Playbook started successfully", type: "success" }); refetch(); },
      onError: (err) => toast({ message: err?.message ?? "Failed to run playbook", type: "error" }),
    }
  );

  const allPlaybooks = playbooks ?? [];
  const types = ["all", ...new Set(allPlaybooks.map(p => p.type).filter(Boolean))];
  const filtered = filter === "all" ? allPlaybooks : allPlaybooks.filter(p => p.type === filter);

  return (
    <div className="space-y-6">
      {showNew && (
        <NewPlaybookModal
          onClose={() => setShowNew(false)}
          onCreated={refetch}
        />
      )}
      {viewing && (
        <ViewPlaybookModal
          playbook={viewing}
          onClose={() => setViewing(null)}
        />
      )}

      <PageHeader
        title="Playbooks Library"
        subtitle="Reusable sales and service playbooks with automation triggers"
        actions={
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            <Plus size={15} /> New Playbook
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {types.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === t
                ? "bg-orange-600 text-white"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-orange-400"
            }`}
          >
            {t === "all" ? "All" : t}
          </button>
        ))}
      </div>

      {loading && allPlaybooks.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-36 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
        </div>
      )}

      {!loading && !error && allPlaybooks.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">No playbooks found. Create your first playbook above.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(pb => (
          <Card key={pb.id ?? pb.name}>
            <CardBody>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
                    <BookOpen size={16} className="text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{pb.name}</p>
                    <StatusBadge label={pb.type} variant={TYPE_VARIANT[pb.type] ?? "neutral"} />
                  </div>
                </div>
                <StatusBadge label={pb.status} variant={STATUS_VARIANT[pb.status] ?? "neutral"} dot />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-3">
                <div className="flex items-center gap-1">
                  <Zap size={12} className="text-amber-500" />
                  {pb.trigger ?? "Manual"}
                </div>
                <div>{pb.steps} steps{pb.uses != null ? ` · Used ${pb.uses}×` : ""}</div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setViewing(pb)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 hover:border-indigo-400 transition"
                >
                  <BookOpen size={13} /> View
                </button>
                <button
                  onClick={() => runPlaybook(pb.id)}
                  disabled={running}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-orange-600 text-white text-xs hover:bg-orange-700 disabled:opacity-60 transition"
                >
                  {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Run
                </button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
