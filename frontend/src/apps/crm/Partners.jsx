import { useState } from "react";
import { Handshake, DollarSign, Star, Globe, RefreshCw, Search, AlertCircle, ExternalLink } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useApi } from "../../hooks/useApi";
import { crm } from "../../services/api";

const TIER_VARIANT = { platinum: "indigo", gold: "amber", silver: "neutral", bronze: "warning", "strategic": "success" };
const STATUS_VARIANT = { active: "success", inactive: "neutral", probation: "warning", pending: "info" };

function PartnerDetail({ partner }) {
  const { data: detail } = useApi(() => crm.partners.get(partner.id), [partner.id]);
  const p = detail ?? partner;
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{p.name}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{p.type ?? "Partner"}{p.region ? ` • ${p.region}` : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          {p.tier && <StatusBadge label={p.tier} variant={TIER_VARIANT[p.tier] ?? "neutral"} />}
          {p.status && <StatusBadge label={p.status} variant={STATUS_VARIANT[p.status] ?? "neutral"} />}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Revenue", p.revenue ?? p.arr], ["Deals", p.dealsCount ?? p.deals], ["Since", p.since ?? p.joinedAt], ["Score", p.score != null ? `${p.score}/100` : null]].map(([l, v]) => v != null ? (
          <div key={l} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">{l}</div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">{v}</div>
          </div>
        ) : null)}
      </div>
      {p.description && <p className="text-sm text-slate-600 dark:text-slate-400">{p.description}</p>}
      {(p.contacts ?? p.team ?? []).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Key Contacts</h3>
          <div className="space-y-2">
            {(p.contacts ?? p.team).map((c, i) => (
              <div key={c.id ?? i} className="flex items-center gap-3 text-sm bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                <div className="h-7 w-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 font-semibold text-xs">{(c.name ?? "?")[0].toUpperCase()}</div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900 dark:text-white">{c.name}</div>
                  {c.role && <div className="text-xs text-slate-400">{c.role}</div>}
                </div>
                {c.email && <span className="text-xs text-slate-400">{c.email}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      {(p.recentDeals ?? []).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recent Deals</h3>
          <div className="space-y-1.5">
            {p.recentDeals.map((d, i) => (
              <div key={d.id ?? i} className="flex items-center gap-2 text-sm">
                <span className="flex-1 text-slate-900 dark:text-white">{d.name}</span>
                <span className="text-xs text-slate-400">{d.stage}</span>
                <span className="font-semibold text-slate-900 dark:text-white text-xs">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {p.website && (
        <a href={p.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 transition">
          <ExternalLink size={12} /> {p.website}
        </a>
      )}
    </div>
  );
}

export default function Partners() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const { data: partners, loading, error, refetch } = useApi(() => crm.partners.list(), [], { pollingInterval: 120000 });
  const all = partners ?? [];
  const TIERS = ["all", "platinum", "gold", "silver", "bronze", "strategic"];
  const filtered = all.filter(p => {
    const matchTier = tierFilter === "all" || p.tier === tierFilter;
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
    return matchTier && matchSearch;
  });
  const stats = {
    total: all.length,
    active: all.filter(p => p.status === "active").length,
    revenue: all.reduce((s, p) => s + (p.rawRevenue ?? 0), 0),
  };
  return (
    <div className="space-y-6">
      <PageHeader title="Partner Network" subtitle="Manage and grow your partner ecosystem"
        actions={<button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh</button>}
      />
      {loading && all.length === 0 ? (
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Total Partners" value={stats.total} icon={Handshake} color="orange" />
          <Stat label="Active Partners" value={stats.active} icon={Star} color="emerald" />
          <Stat label="Partner Revenue" value={stats.revenue ? `$${(stats.revenue / 1000000).toFixed(1)}M` : "—"} icon={DollarSign} color="sky" />
        </div>
      )}
      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}
      <div className="flex gap-4 items-start">
        <div className="w-80 shrink-0 space-y-3">
          <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900">
            <Search size={14} className="text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search partners…" className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TIERS.map(t => (
              <button key={t} onClick={() => setTierFilter(t)} className={`text-xs px-2.5 py-1 rounded-full border capitalize transition ${tierFilter === t ? "bg-orange-600 text-white border-orange-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-orange-400"}`}>{t === "all" ? "All Tiers" : t}</button>
            ))}
          </div>
          <Card>
            {loading && all.length === 0 ? <div className="p-4"><SkeletonTable rows={6} /></div> : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[calc(100vh-22rem)] overflow-y-auto">
                {filtered.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">No partners found.</p> : filtered.map((p, i) => (
                  <button key={p.id ?? i} onClick={() => setSelected(p)} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${selected?.id === p.id ? "bg-orange-50 dark:bg-orange-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}>
                    <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <Globe size={16} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.name}</div>
                      <div className="text-xs text-slate-400 truncate">{p.tier ? `${p.tier} • ` : ""}{p.type ?? ""}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
        <div className="flex-1 min-w-0">
          {selected ? (
            <Card><CardBody><PartnerDetail partner={selected} /></CardBody></Card>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <Handshake size={36} className="text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-slate-500">Select a partner to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
