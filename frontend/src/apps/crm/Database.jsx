import { useState, useMemo } from "react";
import { Database as DbIcon, Search, RefreshCw, AlertCircle, HardDrive, FileText, Activity } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import { Stat, Card, CardHeader, CardBody } from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";
import { useApi } from "../../hooks/useApi";
import { crm } from "../../services/api";

const ENTITY_VARIANT = { lead: "info", deal: "warning", contact: "neutral", account: "indigo", task: "sky", opportunity: "success" };

export default function Database() {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [tab, setTab] = useState("records");
  const { data: records, loading, error, refetch } = useApi(() => crm.database.records({ limit: 200 }), [], { pollingInterval: 60000 });
  const { data: usage } = useApi(() => crm.database.usage(), [], { pollingInterval: 120000 });
  const { data: audit } = useApi(() => crm.database.auditTrail({ limit: 50 }), [], { pollingInterval: 60000 });
  const all = records ?? [];
  const usageData = usage ?? {};
  const auditLog = audit ?? [];

  const ENTITIES = ["all", "lead", "deal", "contact", "account", "task", "opportunity"];

  const filtered = useMemo(() => all.filter(r => {
    const matchEntity = entityFilter === "all" || r.entity === entityFilter || r.type === entityFilter;
    const matchSearch = !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.id?.toString().includes(search);
    return matchEntity && matchSearch;
  }), [all, search, entityFilter]);

  return (
    <div className="space-y-6">
      <PageHeader title="CRM Database" subtitle="Browse, audit, and manage all CRM records"
        actions={<button onClick={refetch} className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"><RefreshCw size={13} /> Refresh</button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Records" value={usageData.totalRecords ?? all.length} icon={DbIcon} color="orange" />
        <Stat label="Storage Used" value={usageData.storageUsed ?? "—"} icon={HardDrive} color="sky" />
        <Stat label="Audit Events" value={usageData.auditEvents ?? auditLog.length} icon={Activity} color="amber" />
        <Stat label="Last Updated" value={usageData.lastUpdated ?? "—"} icon={FileText} color="emerald" />
      </div>

      {error && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><AlertCircle size={15} />{error}</div>}

      <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden w-fit">
        {["records", "usage", "audit"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm font-medium capitalize transition ${tab === t ? "bg-orange-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{t}</button>
        ))}
      </div>

      {tab === "records" && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 flex-1 max-w-80">
              <Search size={14} className="text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records…" className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {ENTITIES.map(e => (
                <button key={e} onClick={() => setEntityFilter(e)} className={`text-xs px-2.5 py-1 rounded-full border capitalize transition ${entityFilter === e ? "bg-orange-600 text-white border-orange-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-orange-400"}`}>{e}</button>
              ))}
            </div>
          </div>
          <Card>
            {loading && all.length === 0 ? <div className="p-5"><SkeletonTable rows={10} /></div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      {["ID", "Name", "Type", "Owner", "Created", "Updated"].map(h => (
                        <th key={h} className="text-left p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filtered.length === 0 ? (
                      <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-500">No records found.</td></tr>
                    ) : filtered.map((r, i) => (
                      <tr key={r.id ?? i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="p-4 font-mono text-xs text-slate-400">{String(r.id ?? "—").slice(0, 8)}</td>
                        <td className="p-4 font-medium text-slate-900 dark:text-white">{r.name ?? r.title ?? "—"}</td>
                        <td className="p-4"><StatusBadge label={r.entity ?? r.type ?? "record"} variant={ENTITY_VARIANT[r.entity ?? r.type] ?? "neutral"} /></td>
                        <td className="p-4 text-slate-600 dark:text-slate-300">{r.owner ?? r.createdBy ?? "—"}</td>
                        <td className="p-4 text-slate-400 text-xs">{r.createdAt ?? r.created ?? "—"}</td>
                        <td className="p-4 text-slate-400 text-xs">{r.updatedAt ?? r.updated ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {tab === "usage" && (
        <Card>
          <CardHeader title="Database Usage" icon={HardDrive} />
          <CardBody>
            {Object.keys(usageData).length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No usage data available.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(usageData).filter(([, v]) => v != null && typeof v !== "object").map(([key, val]) => (
                  <div key={key} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-500 mb-1 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</div>
                    <div className="font-bold text-slate-900 dark:text-white">{String(val)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {tab === "audit" && (
        <Card>
          <CardHeader title="Audit Trail" icon={Activity} />
          <CardBody>
            {auditLog.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No audit events found.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLog.map((e, i) => (
                  <div key={e.id ?? i} className="flex items-center gap-4 py-3 first:pt-0 text-sm">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${e.action === "delete" ? "bg-red-500" : e.action === "create" ? "bg-emerald-500" : "bg-sky-500"}`} />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-slate-900 dark:text-white capitalize">{e.action}</span>
                      <span className="text-slate-500 mx-1">on</span>
                      <span className="text-slate-700 dark:text-slate-300">{e.entity ?? e.record ?? "record"}</span>
                      {e.name && <span className="text-slate-500 mx-1">"{e.name}"</span>}
                    </div>
                    <div className="shrink-0 text-xs text-slate-400">{e.by ?? e.user ?? "system"}</div>
                    <div className="shrink-0 text-xs text-slate-400">{e.at ?? e.createdAt ?? e.date}</div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
