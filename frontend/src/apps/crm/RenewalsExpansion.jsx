import { useState, useMemo } from "react";
import { RefreshCw, AlertCircle, DollarSign, TrendingUp, Clock, CheckCircle, Search } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useApi } from "../../hooks/useApi";
import { crm } from "../../services/api";

const HEALTH_VARIANT = { healthy: "success", "at-risk": "warning", churned: "danger", new: "info" };
const STATUS_VARIANT = { renewed: "success", pending: "warning", negotiating: "info", "at-risk": "danger", churned: "neutral" };

export default function RenewalsExpansion() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const { data: summary, loading: sumLoading } = useApi(() => crm.renewals.summary(), [], { pollingInterval: 120000 });
  const { data: renewals, loading, error, refetch } = useApi(() => crm.renewals.list({ limit: 200 }), [], { pollingInterval: 60000 });
  const all = renewals ?? [];

  const FILTERS = ["all", "pending", "at-risk", "renewed", "negotiating"];

  const filtered = useMemo(() => all.filter(r => {
    const matchFilter = filter === "all" || r.status === filter;
    const matchSearch = !search || r.account?.toLowerCase().includes(search.toLowerCase()) || r.name?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  }), [all, search, filter]);

  const totalArr = useMemo(() => all.reduce((s, r) => s + (r.rawArr ?? 0), 0), [all]);
  const atRiskArr = useMemo(() => all.filter(r => r.status === "at-risk" || r.health === "at-risk").reduce((s, r) => s + (r.rawArr ?? 0), 0), [all]);

  return (
    <div className="space-y-6">
      <PageHeader title="Renewals & Expansion" subtitle="Track contract renewals and upsell opportunities"
        actions={<button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh</button>}
      />

      {sumLoading && all.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Renewal ARR" value={totalArr ? `$${(totalArr / 1000).toFixed(0)}k` : (summary?.renewalArr ?? "—")} icon={DollarSign} color="orange" />
          <Stat label="At-Risk ARR" value={atRiskArr ? `$${(atRiskArr / 1000).toFixed(0)}k` : (summary?.atRiskArr ?? "—")} icon={AlertCircle} color="amber" />
          <Stat label="Renewals Due (30d)" value={summary?.dueSoon ?? all.filter(r => r.daysToRenew != null && r.daysToRenew <= 30).length} icon={Clock} color="sky" />
          <Stat label="Renewal Rate" value={summary?.renewalRate != null ? `${summary.renewalRate}%` : "—"} icon={CheckCircle} color="emerald" delta={summary?.renewalRateDelta} />
        </div>
      )}

      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}

      {summary?.expansionOpps != null && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">Expansion Opportunities</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{summary.expansionOpps}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">Upsell Pipeline</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{summary.upsellPipeline ?? "—"}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">NRR</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{summary.nrr != null ? `${summary.nrr}%` : "—"}</div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 flex-1 max-w-64">
          <Search size={14} className="text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts…" className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white" />
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1.5 rounded-full border capitalize transition ${filter === f ? "bg-orange-600 text-white border-orange-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-orange-400"}`}>{f}</button>
          ))}
        </div>
      </div>

      <Card>
        {loading && all.length === 0 ? <div className="p-5"><SkeletonTable rows={8} /></div> : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No renewals found.</p> : filtered.map((r, i) => (
              <div key={r.id ?? i} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-slate-900 dark:text-white">{r.account ?? r.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {r.owner ? `${r.owner} • ` : ""}
                    {r.renewalDate ? `Renewal: ${r.renewalDate}` : ""}
                    {r.daysToRenew != null ? ` (${r.daysToRenew}d)` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {r.health && <StatusBadge label={r.health} variant={HEALTH_VARIANT[r.health] ?? "neutral"} />}
                  {r.status && <StatusBadge label={r.status} variant={STATUS_VARIANT[r.status] ?? "neutral"} />}
                  <div className="text-right min-w-20">
                    <div className="font-bold text-sm text-slate-900 dark:text-white">{r.arr ?? r.value ?? "—"}</div>
                    {r.expansion && <div className="text-xs text-emerald-600 dark:text-emerald-400">+{r.expansion}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
