import { useState, useMemo } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader, Stat } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { Target, TrendingUp, DollarSign, Users, Plus, AlertCircle, X } from "lucide-react";
import { useApi, useMutation } from "../../hooks/useApi";
import { useToast } from "../../components/ui/Toast";
import { crm } from "../../services/api";

const RISK_VARIANT   = { low: "success", medium: "warning", high: "danger" };
const STAGE_VARIANT  = { Prospecting: "neutral", Qualified: "info", Proposal: "indigo", Negotiation: "warning", "Closed Won": "success" };
const STAGE_COLORS   = ["bg-slate-300 dark:bg-slate-600", "bg-sky-400", "bg-indigo-500", "bg-violet-500", "bg-emerald-500"];

const OPP_STAGES = ["Prospecting", "Qualified", "Proposal", "Negotiation", "Closed Won"];
const EMPTY_FORM = { name: "", value: "", stage: "Prospecting", close: "", owner: "" };

function NewOpportunityModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);

  const { mutate, loading } = useMutation((data) => crm.opportunities.create(data));

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError("Opportunity name is required.");
      return;
    }
    try {
      await mutate(form);
      toast({ message: "Opportunity created.", type: "success" });
      onCreated();
      onClose();
    } catch (err) {
      setFormError(err?.message ?? "Failed to create opportunity. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">New Opportunity</h2>
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
              placeholder="Opportunity name"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Value ($)</label>
              <input
                type="number"
                min="0"
                value={form.value}
                onChange={(e) => set("value", e.target.value)}
                placeholder="0"
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Stage</label>
              <select
                value={form.stage}
                onChange={(e) => set("stage", e.target.value)}
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {OPP_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Close Date</label>
              <input
                type="date"
                value={form.close}
                onChange={(e) => set("close", e.target.value)}
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Owner</label>
              <input
                type="text"
                value={form.owner}
                onChange={(e) => set("owner", e.target.value)}
                placeholder="Assignee name"
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
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
              className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white transition"
            >
              {loading ? "Saving…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OpportunityWorkspace() {
  const [showModal, setShowModal] = useState(false);

  const { data: summary, loading: summaryLoading } = useApi(
    () => crm.opportunities.summary(), [], { pollingInterval: 60000 }
  );
  const { data: opportunities, loading: oppsLoading, error: oppsError, refetch: refetchOpps } = useApi(
    () => crm.opportunities.list({ limit: 100 }), [], { pollingInterval: 60000 }
  );

  const allOpps = opportunities ?? [];

  const stages = useMemo(() => {
    const map = {};
    allOpps.forEach(o => {
      if (!map[o.stage]) map[o.stage] = { label: o.stage, count: 0, value: 0 };
      map[o.stage].count += 1;
      map[o.stage].value += o.rawValue ?? 0;
    });
    return Object.values(map);
  }, [allOpps]);

  return (
    <div className="space-y-6">
      {showModal && (
        <NewOpportunityModal
          onClose={() => setShowModal(false)}
          onCreated={refetchOpps}
        />
      )}

      <PageHeader
        title="Opportunities"
        subtitle="Stage progression, risk scoring, next-best-action and stakeholder map"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            <Plus size={15} /> New Opportunity
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Open Opps"      value={summaryLoading ? "…" : (summary?.openCount       ?? allOpps.length)} icon={Target}     color="indigo" />
        <Stat label="Pipeline Value" value={summaryLoading ? "…" : (summary?.pipelineValue   ?? "—")}            icon={DollarSign} color="sky" />
        <Stat label="Avg Deal Size"  value={summaryLoading ? "…" : (summary?.avgDealSize     ?? "—")}            icon={TrendingUp} color="emerald" delta={summary?.avgDealSizeDelta} />
        <Stat label="Win Rate (90d)" value={summaryLoading ? "…" : (summary?.winRate         ?? "—")}            icon={Users}      color="amber" />
      </div>

      <Card>
        <CardHeader title="Pipeline Funnel" icon={Target} />
        <CardBody>
          {oppsLoading && stages.length === 0 ? (
            <div className="space-y-3 animate-pulse">
              {[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-slate-100 dark:bg-slate-700 rounded-full" />)}
            </div>
          ) : stages.length > 0 ? (
            <div className="space-y-3">
              {stages.map((s, i) => (
                <div key={s.label} className="flex items-center gap-4">
                  <div className="w-28 text-sm text-slate-700 dark:text-slate-300 shrink-0">{s.label}</div>
                  <div className="flex-1 h-7 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${STAGE_COLORS[i % STAGE_COLORS.length]} flex items-center px-3`}
                      style={{ width: `${Math.max(15, 100 - i * 18)}%` }}
                    >
                      <span className="text-xs font-semibold text-white">{s.count} deals</span>
                    </div>
                  </div>
                  <div className="w-16 text-sm font-semibold text-slate-700 dark:text-slate-300 text-right">{s.value ? `$${(s.value/1000).toFixed(0)}k` : "—"}</div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500 text-center py-4">No pipeline data available.</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Active Opportunities" icon={DollarSign} />
        <CardBody>
          {oppsError && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mb-3">
              <AlertCircle size={15} /> {oppsError}
            </div>
          )}

          {oppsLoading && allOpps.length === 0 && (
            <div className="space-y-3 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
            </div>
          )}

          {!oppsLoading && !oppsError && allOpps.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">No opportunities found.</p>
          )}

          <div className="space-y-3">
            {allOpps.map(opp => (
              <div key={opp.id ?? opp.name} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{opp.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge label={opp.stage} variant={STAGE_VARIANT[opp.stage] ?? "neutral"} />
                    {opp.close && <span className="text-xs text-slate-400">Close: {opp.close}</span>}
                    {opp.owner && <span className="text-xs text-slate-400">Owner: {opp.owner}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {opp.risk && <StatusBadge label={`${opp.risk} risk`} variant={RISK_VARIANT[opp.risk] ?? "neutral"} dot />}
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{opp.value}</span>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
